import { expect, test, type Page } from "@playwright/test";
import { PESSOAS } from "./dados";
import { alerta, aviso, dia, preencherAgendamento, sessao } from "./helpers";

test.describe.configure({ mode: "serial" });

// datas da semana que vem, para não esbarrar na antecedência mínima
const DATA = dia(7);

/** Abre o pop-up de decisão da solicitação com esse destino, pelo painel do administrador. */
async function abrirDecisao(admin: Page, destino: string) {
  await admin.goto("/admin");
  await admin.locator("tr", { hasText: destino }).getByRole("link", { name: "Analisar" }).click();
  await expect(admin.getByRole("dialog")).toContainText(destino);
}

test.describe("Solicitar e decidir", () => {
  test("o termo é obrigatório: sem o aceite não envia", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await ana.getByRole("button", { name: "Novo agendamento" }).click();
    await preencherAgendamento(ana, { veiculo: "EEE1E11", data: DATA, inicio: "09:00", fim: "12:00", destino: "Sem termo", aceitarTermo: false });
    await expect(ana.getByRole("dialog").locator('input[name="aceiteTermo"]')).not.toBeChecked();
    // o navegador barra o envio (campo obrigatório): continua no pop-up, sem mensagem de sucesso
    await expect(ana.getByRole("dialog")).toBeVisible();
    await expect(aviso(ana)).toHaveCount(0);
    await ana.context().close();
  });

  test("o termo de responsabilidade abre em pop-up com o texto", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await ana.getByRole("button", { name: "Novo agendamento" }).click();
    await ana.getByRole("button", { name: /Termo de Responsabilidade pelo uso e guarda de veículo/ }).click();
    await expect(ana.getByRole("dialog", { name: /Termo de Responsabilidade/ })).toContainText("Assumo inteira responsabilidade");
    await ana.context().close();
  });

  test("a lotação do veículo é respeitada e o erro mantém os dados", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await ana.getByRole("button", { name: "Novo agendamento" }).click();
    await preencherAgendamento(ana, { veiculo: "EEE1E11", data: DATA, inicio: "09:00", fim: "12:00", destino: "Lotação excedida", passageiros: 9 });
    await expect(ana.getByRole("dialog").getByRole("alert")).toContainText("lotação");
    await expect(ana.getByRole("dialog").locator('input[name="destino"]')).toHaveValue("Lotação excedida");
    await ana.context().close();
  });

  test("antecedência mínima: não aceita horário que já passou", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await ana.getByRole("button", { name: "Novo agendamento" }).click();
    await preencherAgendamento(ana, { veiculo: "EEE1E11", data: dia(-2), inicio: "09:00", fim: "12:00", destino: "No passado" });
    await expect(ana.getByRole("dialog").getByRole("alert")).toContainText("antecedência");
    await ana.context().close();
  });

  test("Ana solicita, fica pendente e o administrador aprova", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await ana.getByRole("button", { name: "Novo agendamento" }).click();
    await preencherAgendamento(ana, { veiculo: "EEE1E11", data: DATA, inicio: "09:00", fim: "12:00", destino: "Reunião da Ana", passageiros: 2 });
    await expect(aviso(ana)).toContainText("Solicitação enviada");
    await expect(ana.locator("tr", { hasText: "Reunião da Ana" })).toContainText("Pendente");

    const admin = await sessao(browser, PESSOAS.admin);
    await abrirDecisao(admin, "Reunião da Ana");
    await expect(admin.getByRole("dialog")).toContainText("Aceito em"); // aceite do termo registrado
    await admin.getByRole("dialog").getByRole("button", { name: "Aprovar solicitação" }).click();
    await expect(aviso(admin)).toContainText("aprovada");
    await admin.context().close();

    await ana.reload();
    await expect(ana.locator("tr", { hasText: "Reunião da Ana" })).toContainText("Aprovado");
    // a Ana recebeu a notificação, no painel flutuante do sino
    await ana.getByRole("button", { name: /Notificações/ }).click();
    await expect(ana.getByRole("dialog", { name: "Notificações" })).toContainText("Solicitação aprovada");
    await ana.context().close();
  });

  test("o link 'Detalhes' mostra tudo sobre o agendamento", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await ana.locator("tr", { hasText: "Reunião da Ana" }).getByRole("link", { name: "Detalhes" }).click();
    const pop = ana.getByRole("dialog", { name: "Detalhes do agendamento" });
    await expect(pop).toContainText("EEE1E11");
    await expect(pop).toContainText("Sedan de teste");
    await expect(pop).toContainText("Reunião da Ana");
    await expect(pop).toContainText("Termo de responsabilidade");
    await expect(pop).toContainText("Aceito em");
    await ana.context().close();
  });

  test("reserva aprovada bloqueia o horário para outra pessoa", async ({ browser }) => {
    const bruno = await sessao(browser, PESSOAS.bruno);
    await bruno.goto("/usuario/agendamentos");
    await bruno.getByRole("button", { name: "Novo agendamento" }).click();
    await preencherAgendamento(bruno, { veiculo: "EEE1E11", data: DATA, inicio: "10:00", fim: "13:00", destino: "Bruno no horário da Ana" });
    await expect(bruno.getByRole("dialog").getByRole("alert")).toContainText("já reservado");
    await bruno.context().close();
  });
});

test.describe("Conflito entre pendentes e substituição", () => {
  const DATA_CONFLITO = dia(10);

  test("aprovar uma bloqueia a outra; o administrador cancela a aprovada e aprova a nova", async ({ browser }) => {
    // duas pessoas pedem o mesmo veículo em horários que se sobrepõem (ainda nenhuma aprovada: as duas são aceitas)
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await ana.getByRole("button", { name: "Novo agendamento" }).click();
    await preencherAgendamento(ana, { veiculo: "EEF2F22", data: DATA_CONFLITO, inicio: "09:00", fim: "12:00", destino: "Pedido da Ana em conflito" });
    await expect(aviso(ana)).toContainText("Solicitação enviada");

    const bruno = await sessao(browser, PESSOAS.bruno);
    await bruno.goto("/usuario/agendamentos");
    await bruno.getByRole("button", { name: "Novo agendamento" }).click();
    await preencherAgendamento(bruno, { veiculo: "EEF2F22", data: DATA_CONFLITO, inicio: "10:00", fim: "13:00", destino: "Pedido do Bruno em conflito" });
    await expect(aviso(bruno)).toContainText("Solicitação enviada");

    const admin = await sessao(browser, PESSOAS.admin);
    // aprova o da Ana
    await abrirDecisao(admin, "Pedido da Ana em conflito");
    await admin.getByRole("dialog").getByRole("button", { name: "Aprovar solicitação" }).click();
    await expect(aviso(admin)).toContainText("aprovada");

    // o do Bruno agora está em conflito: não dá para aprovar direto
    await abrirDecisao(admin, "Pedido do Bruno em conflito");
    const pop = admin.getByRole("dialog");
    await expect(pop).toContainText("Conflito");
    await expect(pop.getByRole("button", { name: "Aprovar solicitação" })).toBeDisabled();
    // não existe "Cancelar agendamento" numa solicitação pendente (rejeitar cumpre esse papel)
    await expect(pop.getByRole("button", { name: "Cancelar agendamento" })).toHaveCount(0);
    // a seção de substituição lista quem será notificado
    await expect(pop).toContainText("Cancelar solicitação aprovada");
    await expect(pop).toContainText("Ana Teste");

    // exige a confirmação
    await pop.getByLabel("Motivo da substituição").fill("Prioridade da diretoria");
    await pop.getByLabel(/Confirmo o cancelamento/).check();
    await pop.getByRole("button", { name: /Cancelar a reserva em conflito e aprovar esta/ }).click();
    await expect(aviso(admin)).toContainText("reserva em conflito foi cancelada");

    // Bruno: aprovado
    await bruno.goto("/usuario/agendamentos");
    await expect(bruno.locator("tr", { hasText: "Pedido do Bruno em conflito" })).toContainText("Aprovado");
    // Ana: cancelada, com o motivo, e notificada
    await ana.goto("/usuario/agendamentos");
    const linhaAna = ana.locator("tr", { hasText: "Pedido da Ana em conflito" });
    await expect(linhaAna).toContainText("Cancelado");
    await expect(linhaAna).toContainText("Prioridade da diretoria");
    await ana.getByRole("button", { name: /Notificações/ }).click();
    await expect(ana.getByRole("dialog", { name: "Notificações" })).toContainText("foi cancelada pelo administrador");

    for (const p of [ana, bruno, admin]) await p.context().close();
  });

  test("a trava de versão: decisão sobre solicitação que mudou é recusada", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await ana.getByRole("button", { name: "Novo agendamento" }).click();
    await preencherAgendamento(ana, { veiculo: "EEE1E11", data: dia(12), inicio: "09:00", fim: "10:00", destino: "Pedido que vai mudar" });
    await expect(aviso(ana)).toContainText("Solicitação enviada");

    // o administrador abre o pop-up e fica com ele aberto...
    const admin = await sessao(browser, PESSOAS.admin);
    await abrirDecisao(admin, "Pedido que vai mudar");

    // ...enquanto a Ana altera o pedido
    await ana.locator("tr", { hasText: "Pedido que vai mudar" }).getByRole("link", { name: "Editar", exact: true }).click();
    await ana.locator('select[name="fim_hora"]').selectOption("11:00");
    await ana.getByRole("button", { name: "Salvar alteração" }).click();
    await expect(aviso(ana)).toContainText("Alteração enviada");

    // a decisão do administrador, tomada sobre a versão antiga, não é gravada
    await admin.getByRole("dialog").getByRole("button", { name: "Aprovar solicitação" }).click();
    await expect(admin.getByRole("dialog").getByRole("alert")).toContainText("mudou");

    for (const p of [ana, admin]) await p.context().close();
  });
});

test.describe("Cancelamento pelo solicitante", () => {
  test("a Ana cancela a própria solicitação antes de começar", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana);
    await ana.goto("/usuario/agendamentos");
    await ana.getByRole("button", { name: "Novo agendamento" }).click();
    await preencherAgendamento(ana, { veiculo: "EEF2F22", data: dia(14), inicio: "14:00", fim: "16:00", destino: "Para cancelar" });
    await expect(aviso(ana)).toContainText("Solicitação enviada");
    await ana.locator("tr", { hasText: "Para cancelar" }).getByRole("button", { name: "Cancelar" }).click();
    await expect(aviso(ana)).toContainText("cancelado");
    await expect(ana.locator("tr", { hasText: "Para cancelar" })).toContainText("Cancelado");
    await expect(alerta(ana)).toHaveCount(0);
    await ana.context().close();
  });
});
