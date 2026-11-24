import { expect, test } from "@playwright/test";
import { PESSOAS } from "./dados";
import { alerta, entrar, entrarEEsperar } from "./helpers";

test.describe("Acesso e permissões", () => {
  test("quem não está logado é levado ao login", async ({ page }) => {
    await page.goto("/usuario");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/admin/usuarios");
    await expect(page).toHaveURL(/\/login/);
  });

  test("senha errada mostra erro e não entra", async ({ page }) => {
    await entrar(page, PESSOAS.ana.email, "senha-errada");
    await expect(alerta(page)).toContainText("inválidos");
    await expect(page).toHaveURL(/\/login/);
  });

  test("administrador entra com o e-mail e vê o painel", async ({ page }) => {
    await entrarEEsperar(page, PESSOAS.admin.email, PESSOAS.admin.senha, /\/admin$/);
    await expect(page.getByRole("heading", { name: "Painel do administrador" })).toBeVisible();
    // indicadores do painel
    await expect(page.getByText("Pendentes de decisão", { exact: true })).toBeVisible();
    await expect(page.getByText("Concluídos no mês", { exact: true })).toBeVisible();
    await expect(page.getByText("Aprovados a concluir", { exact: true })).toBeVisible();
    // os que foram retirados não aparecem mais
    await expect(page.getByText("Veículos em uso agora")).toHaveCount(0);
    await expect(page.getByText("Alertas de CNH")).toHaveCount(0);
  });

  test("usuário comum entra com a matrícula e cai na área dele", async ({ page }) => {
    await entrarEEsperar(page, PESSOAS.ana.matricula, PESSOAS.ana.senha, /\/usuario$/);
    await expect(page.getByRole("heading", { name: "Calendário de veículos" })).toBeVisible();
  });

  test("usuário comum não acessa a área do administrador", async ({ page }) => {
    await entrarEEsperar(page, PESSOAS.ana.email, PESSOAS.ana.senha, /\/usuario$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/usuario/);
    await page.goto("/admin/usuarios");
    await expect(page).toHaveURL(/\/usuario/);
    // e a API de relatórios também recusa
    const r = await page.request.get("/api/relatorios/xlsx?de=2026-01-01&ate=2026-12-31");
    expect(r.status()).toBe(403);
  });

  test("a API do calendário exige login", async ({ request }) => {
    const r = await request.get("/api/calendario?start=2026-01-01T00:00:00&end=2026-02-01T00:00:00");
    expect(r.status()).toBe(401);
  });

  test("o aviso de privacidade (LGPD) abre em pop-up", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("controle de uso dos veículos")).toBeHidden();
    await page.getByRole("button", { name: "Aviso de privacidade LGPD" }).click();
    await expect(page.getByRole("dialog")).toContainText("controle de uso dos veículos da Comurg");
    await page.getByRole("button", { name: "Fechar" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("após 5 senhas erradas a conta é bloqueada por um tempo", async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await entrar(page, "bloqueio@e2e.test", `errada-${i}`);
      await expect(alerta(page)).toBeVisible();
    }
    await entrar(page, "bloqueio@e2e.test", "outra");
    await expect(alerta(page)).toContainText("Muitas tentativas");
  });
});
