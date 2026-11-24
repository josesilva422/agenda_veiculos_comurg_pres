import { expect, test } from "@playwright/test";
import { PESSOAS } from "./dados";
import { alerta, aviso, dia, entrar, sessao } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("Cadastros e relatórios do administrador", () => {
  test("cadastra um veículo pelo pop-up, com contrato, e ele aparece na lista", async ({ browser }) => {
    const admin = await sessao(browser, PESSOAS.admin);
    await admin.goto("/admin/veiculos");
    await admin.getByRole("link", { name: "Novo veículo" }).click();
    const pop = admin.getByRole("dialog");
    await expect(pop.getByRole("heading", { name: "Novo veículo" })).toBeVisible();
    await pop.getByLabel("Prefixo").fill("VTR-E2G");
    await pop.getByLabel("Placa").fill("EEG3G33");
    await pop.getByLabel("Tipo").fill("Caminhonete de teste");
    await pop.getByLabel(/Lotação/).fill("3");
    await pop.getByLabel("Contrato").fill("Contrato 123/2026");
    await pop.getByRole("button", { name: "Salvar" }).click();
    await expect(aviso(admin)).toContainText("Veículo cadastrado");
    const linha = admin.locator("tr", { hasText: "VTR-E2G" });
    await expect(linha).toContainText("EEG3G33");
    await expect(linha).toContainText("Contrato 123/2026");
    await admin.context().close();
  });

  test("prefixo ou placa repetidos são recusados", async ({ browser }) => {
    const admin = await sessao(browser, PESSOAS.admin);
    await admin.goto("/admin/veiculos?novo=1");
    const pop = admin.getByRole("dialog");
    await pop.getByLabel("Prefixo").fill("VTR-E2G");
    await pop.getByLabel("Placa").fill("EEH4H44");
    await pop.getByLabel("Tipo").fill("x");
    await pop.getByRole("button", { name: "Salvar" }).click();
    await expect(pop.getByRole("alert")).toContainText("Já existe");
    await admin.context().close();
  });

  test("a lista de agendamentos filtra por status e período e agrupa por dia", async ({ browser }) => {
    const admin = await sessao(browser, PESSOAS.admin);
    await admin.goto("/admin/agendamentos");
    await expect(admin.getByRole("heading", { name: "Agendamentos", level: 1 })).toBeVisible();
    // filtro de status aplica ao escolher (sem botão)
    await admin.getByLabel("Status").selectOption("CANCELADO");
    await expect(admin).toHaveURL(/status=CANCELADO/);
    await expect(admin.locator("tr", { hasText: "Para cancelar" })).toBeVisible();
    // atalho Mensal e as datas De/Até
    await admin.getByRole("link", { name: "Mensal" }).click();
    await expect(admin).toHaveURL(/de=\d{4}-\d{2}-01/);
    await admin.getByRole("link", { name: "Limpar filtros" }).click();
    await expect(admin).toHaveURL(/\/admin\/agendamentos$/);
    // os grupos por dia têm título
    await expect(admin.locator("section h2").first()).toBeVisible();
    await admin.context().close();
  });

  test("o painel lista os aprovados a concluir e os pendentes de decisão sem alertas antigos", async ({ browser }) => {
    const admin = await sessao(browser, PESSOAS.admin);
    await admin.goto("/admin");
    const aConcluir = admin.locator("section", { has: admin.getByRole("heading", { name: /Aprovados a concluir/ }) });
    // a reserva da Ana (com a alteração aprovada, fim às 14:00) e a do Bruno estão a concluir
    await expect(aConcluir).toContainText("VTR-E2E — Ana Teste");
    await expect(aConcluir).toContainText("14:00");
    await expect(aConcluir).toContainText("Bruno Teste");
    await admin.context().close();
  });

  test("relatórios: a tela mostra o resumo e as exportações em Excel e PDF funcionam", async ({ browser }) => {
    const admin = await sessao(browser, PESSOAS.admin);
    await admin.goto(`/admin/relatorios?de=${dia(-30)}&ate=${dia(60)}`);
    await expect(admin.getByText("Horas aprovadas", { exact: true })).toBeVisible();
    // não há mais as tabelas de utilização na tela
    await expect(admin.getByText("Utilização por veículo")).toHaveCount(0);

    const q = `de=${dia(-30)}&ate=${dia(60)}`;
    const xlsx = await admin.request.get(`/api/relatorios/xlsx?${q}`);
    expect(xlsx.status()).toBe(200);
    expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");
    expect((await xlsx.body()).length).toBeGreaterThan(2000);
    // um .xlsx é um zip: começa com "PK"
    expect((await xlsx.body()).subarray(0, 2).toString()).toBe("PK");

    const pdf = await admin.request.get(`/api/relatorios/pdf?${q}`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("pdf");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
    await admin.context().close();
  });

  test("a API do calendário entrega os eventos do período", async ({ browser }) => {
    const admin = await sessao(browser, PESSOAS.admin);
    const r = await admin.request.get(`/api/calendario?start=${dia(0)}T00:00:00&end=${dia(30)}T00:00:00`);
    expect(r.status()).toBe(200);
    const eventos = (await r.json()) as { title: string }[];
    expect(eventos.some((e) => e.title.includes("VTR-E2E") && e.title.includes("Ana Teste"))).toBe(true);
    await admin.context().close();
  });
});

test.describe("Desativar usuário", () => {
  test("a sessão do usuário cai na hora, as reservas futuras são canceladas e o login é recusado", async ({ browser }) => {
    // Bruno tem uma reserva futura aprovada (arquivo 03) e está com a sessão aberta
    const bruno = await sessao(browser, PESSOAS.bruno);
    await bruno.goto("/usuario/agendamentos");
    await expect(bruno.locator("tr", { hasText: "Pedido do Bruno em conflito" })).toContainText("Aprovado");

    const admin = await sessao(browser, PESSOAS.admin);
    admin.on("dialog", (d) => d.accept()); // a confirmação "Desativar ...?"
    await admin.goto("/admin/usuarios");
    await admin.locator("tr", { hasText: PESSOAS.bruno.nome }).getByRole("button", { name: "Desativar" }).click();
    await expect(aviso(admin)).toContainText("Usuário desativado");
    await expect(aviso(admin)).toContainText("reserva");

    // sessão aberta: perde o acesso imediatamente
    await bruno.goto("/usuario/agendamentos");
    await expect(bruno).toHaveURL(/\/login/);
    // e não consegue entrar de novo
    await entrar(bruno, PESSOAS.bruno.email, PESSOAS.bruno.senha);
    await expect(alerta(bruno)).toContainText("inválidos");

    // reativar devolve o acesso (as reservas canceladas não voltam)
    await admin.goto("/admin/usuarios");
    await admin.locator("tr", { hasText: PESSOAS.bruno.nome }).getByRole("button", { name: "Reativar" }).click();
    await expect(aviso(admin)).toContainText("reativado");
    await entrar(bruno, PESSOAS.bruno.email, PESSOAS.bruno.senha);
    await expect(bruno).toHaveURL(/\/usuario$/);
    await bruno.goto("/usuario/agendamentos");
    await expect(bruno.locator("tr", { hasText: "Pedido do Bruno em conflito" })).toContainText("Cancelado");
    for (const p of [bruno, admin]) await p.context().close();
  });
});
