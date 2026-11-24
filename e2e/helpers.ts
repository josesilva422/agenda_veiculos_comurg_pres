import { expect, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import { URL_BASE } from "../playwright.config";
import { PESSOAS } from "./dados";

/** Entra pelo formulário de login (e-mail ou matrícula). */
export async function entrar(page: Page, login: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail ou matrícula").fill(login);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Entra e espera chegar a uma das áreas do sistema. */
export async function entrarEEsperar(page: Page, login: string, senha: string, destino: RegExp) {
  await entrar(page, login, senha);
  await expect(page).toHaveURL(destino);
}

type Pessoa = (typeof PESSOAS)[keyof typeof PESSOAS];

/** Opções de todo contexto criado à mão (os "use" do config não valem para browser.newContext). */
export const CONTEXTO = { baseURL: URL_BASE, locale: "pt-BR", timezoneId: "America/Sao_Paulo" };
export const CELULAR = { ...CONTEXTO, viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true };

/** Uma sessão nova e isolada (outro navegador "anônimo") já logada como essa pessoa. */
export async function sessao(browser: Browser, p: Pessoa, opcoes: BrowserContextOptions = CONTEXTO): Promise<Page> {
  const page = await (await browser.newContext(opcoes)).newPage();
  await entrarEEsperar(page, p.email, p.senha, p.role === "ADMIN" ? /\/admin$/ : /\/usuario$/);
  return page;
}

/** Data (AAAA-MM-DD, horário de Brasília) daqui a `dias` dias. Negativo = passado. */
export function dia(dias: number): string {
  return new Date(Date.now() + dias * 86_400_000).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

/** Preenche o formulário de agendamento (pop-up ou página) e envia. */
export async function preencherAgendamento(
  page: Page,
  d: {
    veiculo: string;
    data: string;
    inicio: string;
    fim: string;
    fimData?: string;
    destino: string;
    passageiros?: number;
    aceitarTermo?: boolean;
    solicitante?: string;
    enviar?: boolean;
  },
) {
  const form = page.locator("dialog[open] form, main form").first();
  if (d.solicitante) await form.locator('select[name="userId"]').selectOption({ label: d.solicitante });
  const valorVeiculo = await form.locator('select[name="vehicleId"] option', { hasText: d.veiculo }).first().getAttribute("value");
  await form.locator('select[name="vehicleId"]').selectOption(valorVeiculo!);
  await form.locator('input[name="inicio_data"]').fill(d.data);
  await form.locator('select[name="inicio_hora"]').selectOption(d.inicio);
  await form.locator('input[name="fim_data"]').fill(d.fimData ?? d.data);
  await form.locator('select[name="fim_hora"]').selectOption(d.fim);
  await form.locator('input[name="destino"]').fill(d.destino);
  if (d.passageiros) await form.locator('input[name="passageiros"]').fill(String(d.passageiros));
  if (d.aceitarTermo !== false && (await form.locator('input[name="aceiteTermo"]').count())) {
    await form.locator('input[name="aceiteTermo"]').check();
  }
  if (d.enviar !== false) await form.getByRole("button", { name: /Enviar solicitação|Salvar alteração/ }).click();
}

/** Mensagem de erro na tela (ignora o anunciador de rotas do Next, que também tem role="alert"). */
export const alerta = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)').first();
/** Faixa de sucesso no topo da página. */
export const aviso = (page: Page) => page.locator('main [role="status"]').first();
