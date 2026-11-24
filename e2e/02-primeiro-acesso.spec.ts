import { expect, test } from "@playwright/test";
import { PESSOAS } from "./dados";
import { alerta, entrar, entrarEEsperar } from "./helpers";

test.describe.configure({ mode: "serial" });

const NOVO = { nome: "Carla Nova", email: "carla@e2e.test", matricula: "E-2001", setor: "Jurídico" };
let senhaProvisoria = "";

test.describe("Cadastro de usuário e primeiro acesso", () => {
  test("o administrador cadastra um usuário e vê a senha provisória", async ({ page }) => {
    await entrarEEsperar(page, PESSOAS.admin.email, PESSOAS.admin.senha, /\/admin$/);
    await page.goto("/admin/usuarios");
    await page.getByRole("link", { name: "Novo usuário" }).click();
    const pop = page.getByRole("dialog");
    await expect(pop.getByRole("heading", { name: "Novo usuário" })).toBeVisible();
    // não há campo de senha nem de CNH: a senha é gerada pelo sistema
    await expect(pop.locator('input[name="senha"]')).toHaveCount(0);
    await expect(pop.locator('input[name="cnh"]')).toHaveCount(0);

    await pop.getByLabel("Nome completo").fill(NOVO.nome);
    await pop.getByLabel("E-mail", { exact: true }).fill(NOVO.email);
    await pop.getByLabel("Matrícula").fill(NOVO.matricula);
    await pop.getByLabel("Telefone").fill("62988887777");
    await pop.getByLabel("Cargo").fill("Advogada");
    await pop.getByLabel("Lotação").fill(NOVO.setor);
    await pop.getByLabel("Contato").fill("ramal 200");
    await pop.getByRole("button", { name: "Salvar" }).click();

    // abre a edição do novo usuário com a senha provisória à mostra
    const caixa = page.getByRole("dialog").getByRole("status");
    await expect(caixa).toContainText("Senha provisória de");
    senhaProvisoria = (await caixa.locator("b.select-all").innerText()).trim();
    expect(senhaProvisoria).toMatch(/^[A-Za-z]{4}-[2-9]{4}-[A-Za-z]{4}$/);
  });

  test("matrícula repetida é recusada", async ({ page }) => {
    await entrarEEsperar(page, PESSOAS.admin.email, PESSOAS.admin.senha, /\/admin$/);
    await page.goto("/admin/usuarios?novo=1");
    const pop = page.getByRole("dialog");
    await pop.getByLabel("Nome completo").fill("Duplicada");
    await pop.getByLabel("E-mail", { exact: true }).fill("duplicada@e2e.test");
    await pop.getByLabel("Matrícula").fill(NOVO.matricula);
    await pop.getByLabel("Telefone").fill("1");
    await pop.getByLabel("Cargo").fill("x");
    await pop.getByLabel("Lotação").fill("x");
    await pop.getByLabel("Contato").fill("x");
    await pop.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("matrícula");
  });

  test("a senha provisória leva à troca obrigatória, com as regras da senha", async ({ page }) => {
    await entrar(page, NOVO.matricula, senhaProvisoria);
    await expect(page).toHaveURL(/\/trocar-senha/);
    // enquanto não trocar, nada mais abre
    await page.goto("/usuario/agendamentos");
    await expect(page).toHaveURL(/\/trocar-senha/);

    const nova = page.getByLabel("Nova senha", { exact: true });
    const conf = page.getByLabel("Confirmar nova senha");
    const salvar = page.getByRole("button", { name: "Salvar nova senha" });

    await nova.fill("abcdefgh1");
    await conf.fill("abcdefgh1");
    await salvar.click();
    await expect(alerta(page)).toContainText("caractere especial");

    await nova.fill("Abcdefg@x");
    await conf.fill("Abcdefg@x");
    await salvar.click();
    await expect(alerta(page)).toContainText("número");

    await nova.fill("Nova#Senha77");
    await conf.fill("Nova#Senha78");
    await salvar.click();
    await expect(alerta(page)).toContainText("não confere");

    await nova.fill("Nova#Senha77");
    await conf.fill("Nova#Senha77");
    await salvar.click();
    await expect(page).toHaveURL(/\/login\?trocada=1/);
    await expect(page.getByRole("status")).toContainText("Senha alterada");
  });

  test("depois da troca, só a senha nova funciona", async ({ page }) => {
    await entrar(page, NOVO.matricula, senhaProvisoria);
    await expect(alerta(page)).toContainText("inválidos");
    await entrarEEsperar(page, NOVO.email, "Nova#Senha77", /\/usuario$/);
  });

  test("o administrador gera nova senha provisória e as sessões abertas caem", async ({ browser }) => {
    // sessão aberta do usuário
    const ctxUsuario = await browser.newContext();
    const usuario = await ctxUsuario.newPage();
    await entrarEEsperar(usuario, NOVO.email, "Nova#Senha77", /\/usuario$/);

    const ctxAdmin = await browser.newContext();
    const admin = await ctxAdmin.newPage();
    await entrarEEsperar(admin, PESSOAS.admin.email, PESSOAS.admin.senha, /\/admin$/);
    await admin.goto("/admin/usuarios");
    await admin.locator("li, tr").filter({ hasText: NOVO.nome }).getByRole("link", { name: "Editar", exact: true }).first().click();
    await admin.getByRole("dialog").getByRole("button", { name: "Gerar nova senha provisória" }).click();
    await expect(admin.getByRole("dialog").getByRole("status")).toContainText("Senha provisória de");

    // a sessão que o usuário tinha deixa de valer
    await usuario.goto("/usuario/agendamentos");
    await expect(usuario).toHaveURL(/\/login/);
    await ctxUsuario.close();
    await ctxAdmin.close();
  });
});
