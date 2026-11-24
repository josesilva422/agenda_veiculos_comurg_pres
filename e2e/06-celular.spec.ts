import { expect, test, type Page } from "@playwright/test";
import { PESSOAS } from "./dados";
import { CELULAR, sessao } from "./helpers";

// tela de celular
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

/** Nada pode passar da largura da tela (rolagem lateral). */
async function semRolagemLateral(page: Page) {
  const { rolagem, largura } = await page.evaluate(() => ({
    rolagem: document.documentElement.scrollWidth,
    largura: document.documentElement.clientWidth,
  }));
  expect(rolagem, `a página tem ${rolagem}px em uma tela de ${largura}px`).toBeLessThanOrEqual(largura + 1);
}

test.describe("Visual no celular (375 px)", () => {
  test("login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("img", { name: /Comurg/ })).toBeVisible();
    await semRolagemLateral(page);
  });

  test("telas do administrador não passam da largura da tela", async ({ browser }) => {
    const admin = await sessao(browser, PESSOAS.admin, CELULAR);
    for (const rota of ["/admin", "/admin/agendamentos", "/admin/calendario", "/admin/usuarios", "/admin/veiculos", "/admin/relatorios", "/admin/notificacoes"]) {
      await admin.goto(rota);
      await expect(admin.locator("main")).toBeVisible();
      await semRolagemLateral(admin);
    }
    await admin.context().close();
  });

  test("telas do usuário não passam da largura da tela", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana, CELULAR);
    for (const rota of ["/usuario", "/usuario/agendamentos", "/usuario/notificacoes", "/usuario/perfil"]) {
      await ana.goto(rota);
      await expect(ana.locator("main")).toBeVisible();
      await semRolagemLateral(ana);
    }
    await ana.context().close();
  });

  test("Meus agendamentos vira cartões, com tipo do veículo resumido e link Detalhes", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana, CELULAR);
    await ana.goto("/usuario/agendamentos");
    const cartao = ana.locator("ul > li").filter({ hasText: "Reunião ajustada 1" }).first();
    await expect(cartao).toBeVisible();
    await expect(cartao).toContainText("VTR-E2E");
    await expect(cartao.getByRole("link", { name: "Detalhes" })).toBeVisible();
    await ana.context().close();
  });

  test("pop-up de detalhes e novo agendamento cabem na tela", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana, CELULAR);
    await ana.goto("/usuario/agendamentos");
    await ana.locator("ul > li").filter({ hasText: "Reunião ajustada 1" }).first().getByRole("link", { name: "Detalhes" }).click();
    const pop = ana.getByRole("dialog", { name: "Detalhes do agendamento" });
    await expect(pop).toBeVisible();
    const caixa = await pop.boundingBox();
    expect(caixa!.x).toBeGreaterThanOrEqual(0);
    expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(376);
    await pop.getByRole("button", { name: "Fechar" }).click();

    await ana.getByRole("button", { name: "Novo agendamento" }).click();
    const novo = ana.getByRole("dialog");
    const c2 = await novo.boundingBox();
    expect(c2!.x + c2!.width).toBeLessThanOrEqual(376);
    // data e hora em campos separados (fáceis de usar no celular)
    await expect(novo.locator('input[name="inicio_data"]')).toBeVisible();
    await expect(novo.locator('select[name="inicio_hora"]')).toBeVisible();
    await ana.context().close();
  });

  test("o painel flutuante de notificações cabe na tela", async ({ browser }) => {
    const ana = await sessao(browser, PESSOAS.ana, CELULAR);
    await ana.goto("/usuario");
    await ana.getByRole("button", { name: /Notificações/ }).click();
    const painel = ana.getByRole("dialog", { name: "Notificações" });
    await expect(painel).toBeVisible();
    const caixa = await painel.boundingBox();
    expect(caixa!.x).toBeGreaterThanOrEqual(0);
    expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(376);
    await ana.context().close();
  });
});
