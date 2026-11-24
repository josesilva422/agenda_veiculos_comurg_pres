import { expect, test, type Page } from "@playwright/test";
import { PESSOAS } from "./dados";
import { alerta, aviso, dia, preencherAgendamento, sessao } from "./helpers";

test.describe.configure({ mode: "serial" });

const DATA = dia(7); // a "Reunião da Ana" (EEE1E11, 09:00-12:00) aprovada no arquivo 03

async function abrirDecisao(admin: Page, destino: string) {
  await admin.goto("/admin");
  await admin.locator("tr", { hasText: destino }).getByRole("link", { name: "Analisar" }).click();
  await expect(admin.getByRole("dialog")).toContainText(destino);
}

test.describe("Pedido de alteração de reserva aprovada", () => {
  test("a reserva aprovada continua valendo e segurando o horário até o administrador decidir", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await ana.locator("tr", { hasText: "Reunião da Ana" }).getByRole("link", { name: "Editar", exact: true }).click();
    await expect(ana.getByText(/continua valendo/)).toBeVisible();
    await ana.locator('input[name="destino"]').fill("Reunião ajustada 1");
    await ana.locator('select[name="fim_hora"]').selectOption("14:00");
    await ana.getByRole("button", { name: "Salvar alteração" }).click();
    await expect(aviso(ana)).toContainText("Alteração enviada");

    // a lista mostra a reserva aprovada como era (destino e horário originais); o pedido fica à parte
    const linha = ana.locator("tr", { hasText: "Reunião da Ana" });
    await expect(linha).toContainText("Alteração pendente");
    await linha.getByRole("link", { name: "Detalhes" }).click();
    const pop = ana.getByRole("dialog", { name: "Detalhes do agendamento" });
    await expect(pop).toContainText("Você pediu uma alteração");
    await expect(pop).toContainText("Reunião ajustada 1");
    await ana.context().close();

    // o horário original continua ocupado para os outros
    const bruno = await sessao(browser, PESSOAS.bruno);
    await bruno.goto("/usuario/agendamentos");
    await bruno.getByRole("button", { name: "Novo agendamento" }).click();
    await preencherAgendamento(bruno, { veiculo: "EEE1E11", data: DATA, inicio: "10:00", fim: "11:00", destino: "Tentativa durante o pedido" });
    await expect(bruno.getByRole("dialog").getByRole("alert")).toContainText("já reservado");
    await bruno.context().close();
  });

  test("o administrador vê o aprovado e o pedido lado a lado e aprova: os dados novos passam a valer", async ({ browser }) => {
    const admin = await sessao(browser, PESSOAS.admin);
    await abrirDecisao(admin, "Reunião ajustada 1");
    const pop = admin.getByRole("dialog");
    await expect(pop).toContainText("Aprovado (continua valendo até a decisão)");
    await expect(pop).toContainText("Pedido:");
    await pop.getByRole("button", { name: "Aprovar alteração" }).click();
    await expect(aviso(admin)).toContainText("aprovada");
    await admin.context().close();

    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    const linha = ana.locator("tr", { hasText: "Reunião ajustada 1" });
    await expect(linha).toContainText("Aprovado");
    await expect(linha).toContainText("14:00");
    await ana.context().close();
  });

  test("alteração rejeitada: a reserva aprovada fica como estava", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await ana.locator("tr", { hasText: "Reunião ajustada 1" }).getByRole("link", { name: "Editar", exact: true }).click();
    await ana.locator('input[name="destino"]').fill("Reunião ajustada 2");
    await ana.locator('select[name="fim_hora"]').selectOption("16:00");
    await ana.getByRole("button", { name: "Salvar alteração" }).click();
    await expect(aviso(ana)).toContainText("Alteração enviada");

    const admin = await sessao(browser, PESSOAS.admin);
    await abrirDecisao(admin, "Reunião ajustada 2");
    await admin.getByRole("dialog").getByLabel(/Justificativa/).fill("Veículo é necessário à tarde");
    await admin.getByRole("dialog").getByRole("button", { name: "Rejeitar" }).click();
    await expect(aviso(admin)).toContainText("rejeitada");
    await admin.context().close();

    await ana.reload();
    const linha = ana.locator("tr", { hasText: "Reunião ajustada 1" });
    await expect(linha).toContainText("Aprovado");
    await expect(ana.locator("tr", { hasText: "Reunião ajustada 2" })).toHaveCount(0);
    await ana.getByRole("button", { name: /Notificações/ }).click();
    await expect(ana.getByRole("dialog", { name: "Notificações" })).toContainText("Alteração rejeitada");
    await ana.context().close();
  });

  test("a Ana retira o pedido voltando aos dados aprovados", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await ana.locator("tr", { hasText: "Reunião ajustada 1" }).getByRole("link", { name: "Editar", exact: true }).click();
    await ana.locator('input[name="destino"]').fill("Outro destino");
    await ana.getByRole("button", { name: "Salvar alteração" }).click();
    await expect(aviso(ana)).toContainText("Alteração enviada");

    await ana.locator("tr", { hasText: "Reunião ajustada 1" }).getByRole("link", { name: "Editar", exact: true }).click();
    await ana.locator('input[name="destino"]').fill("Reunião ajustada 1");
    await ana.getByRole("button", { name: "Salvar alteração" }).click();
    await expect(aviso(ana)).toContainText("Pedido de alteração retirado");
    await expect(ana.locator("tr", { hasText: "Reunião ajustada 1" })).toContainText("Aprovado");
    await ana.context().close();
  });
});

test.describe("Quilometragem", () => {
  const LABEL_ANA = "Ana Teste (Operações)";

  test("o administrador lança usos passados em nome da Ana", async ({ browser }) => {
    const admin = await sessao(browser, PESSOAS.admin);
    for (const [d, destino] of [[dia(-3), "Uso passado 1"], [dia(-2), "Uso passado 2"]] as const) {
      await admin.goto("/admin/agendamentos");
      await admin.getByRole("button", { name: "Novo agendamento" }).click();
      await preencherAgendamento(admin, { solicitante: LABEL_ANA, veiculo: "EEF2F22", data: d, inicio: "08:00", fim: "10:00", destino });
      await expect(aviso(admin)).toContainText("criado e aprovado");
    }
    await admin.context().close();
  });

  test("a Ana é avisada do km pendente (aviso na tela e notificação)", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await expect(ana.getByRole("alert").filter({ hasText: "sem quilometragem" })).toContainText("2 reservas");
    await ana.getByRole("button", { name: /Notificações/ }).click();
    await expect(ana.getByRole("dialog", { name: "Notificações" })).toContainText("Informe o km inicial e final");
    await ana.context().close();
  });

  test("a Ana informa o km, com as validações e a sugestão do km inicial", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");

    // primeiro uso
    await ana.locator("tr", { hasText: "Uso passado 1" }).getByRole("link", { name: "Informar km" }).click();
    let pop = ana.getByRole("dialog", { name: "Quilometragem" });
    await pop.getByLabel(/Km inicial/).fill("1000");
    await pop.getByLabel(/Km final/).fill("1100");
    await pop.getByRole("button", { name: "Salvar quilometragem" }).click();
    await expect(aviso(ana)).toContainText("Quilometragem registrada");
    await expect(ana.locator("tr", { hasText: "Uso passado 1" })).toContainText("1.000 → 1.100");

    // segundo uso: o km inicial já vem preenchido com o km final do anterior, e continua editável
    await ana.locator("tr", { hasText: "Uso passado 2" }).getByRole("link", { name: "Informar km" }).click();
    pop = ana.getByRole("dialog", { name: "Quilometragem" });
    await expect(pop.getByLabel(/Km inicial/)).toHaveValue("1100");
    await expect(pop).toContainText("veio preenchido com o km final da última reserva");

    // km final menor que o inicial
    await pop.getByLabel(/Km final/).fill("1050");
    await pop.getByRole("button", { name: "Salvar quilometragem" }).click();
    await expect(ana.getByRole("dialog").getByRole("alert")).toContainText("não pode ser menor");

    // o hodômetro não anda para trás
    pop = ana.getByRole("dialog", { name: "Quilometragem" });
    await pop.getByLabel(/Km inicial/).fill("900");
    await pop.getByLabel(/Km final/).fill("950");
    await pop.getByRole("button", { name: "Salvar quilometragem" }).click();
    await expect(ana.getByRole("dialog").getByRole("alert")).toContainText("último km registrado");

    // valores certos
    pop = ana.getByRole("dialog", { name: "Quilometragem" });
    await pop.getByLabel(/Km inicial/).fill("1100");
    await pop.getByLabel(/Km final/).fill("1180");
    await pop.getByRole("button", { name: "Salvar quilometragem" }).click();
    await expect(aviso(ana)).toContainText("Quilometragem registrada");
    await expect(alerta(ana)).toHaveCount(0); // não restou pendência
    await ana.context().close();
  });

  test("o administrador corrige o km e a Ana é avisada", async ({ browser }) => {
    const admin = await sessao(browser, PESSOAS.admin);
    await admin.goto("/admin/agendamentos");
    await admin.locator("tr", { hasText: "Uso passado 2" }).getByRole("link", { name: "Abrir" }).click();
    const sec = admin.getByRole("dialog").locator("section", { hasText: "Quilometragem" }).last();
    await sec.getByLabel("Km final").fill("1200");
    await sec.getByRole("button", { name: "Salvar km" }).click();
    await expect(aviso(admin)).toContainText("Quilometragem registrada");
    await admin.context().close();

    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await expect(ana.locator("tr", { hasText: "Uso passado 2" })).toContainText("1.100 → 1.200");
    await ana.getByRole("button", { name: /Notificações/ }).click();
    await expect(ana.getByRole("dialog", { name: "Notificações" })).toContainText("ajustou a quilometragem");
    await ana.context().close();
  });
});
