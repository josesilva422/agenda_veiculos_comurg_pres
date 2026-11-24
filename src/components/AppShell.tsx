"use client";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { APP } from "@/lib/config";
import FaixaComurg from "./FaixaComurg";
import NotificacoesPopover from "./NotificacoesPopover";

export type IconName =
  | "painel" | "lista" | "calendario" | "usuarios" | "carro" | "relatorios" | "perfil";

type Item = { href: string; label: string; icon: IconName };
export type Grupo = { titulo?: string; itens: Item[] };

/** Ícones de traço (24x24), sem dependências externas. */
const ICONES: Record<IconName | "sino", React.ReactNode> = {
  painel: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  lista: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  usuarios: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  carro: (
    <>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  relatorios: <path d="M3 3v18h18M7 16v-5M12 16V7M17 16v-8" />,
  perfil: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  sino: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
};

function Icone({ nome }: { nome: keyof typeof ICONES }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      {ICONES[nome]}
    </svg>
  );
}

/* Manter os dados do formulário quando o servidor recusa o envio.
   Ao enviar, os campos ficam no sessionStorage da aba (nunca na URL, para não expor e-mail, telefone etc.).
   Se a página volta com ?erro=, os campos são devolvidos; sem erro, o rascunho é descartado. */
const RASCUNHO = "rascunho-formulario";
const NAO_GUARDAR = new Set(["senha", "atual", "nova", "confirmar", "password"]);
const VALIDADE_MS = 5 * 60_000;

function guardarRascunho(e: Event) {
  const f = e.target;
  if (!(f instanceof HTMLFormElement) || !f.closest("#conteudo")) return;
  const valores: Record<string, string> = {};
  new FormData(f).forEach((v, k) => {
    // "versao": a versão da solicitação na tela; restaurá-la traria de volta uma versão desatualizada
    if (typeof v === "string" && !k.startsWith("$") && !k.startsWith("versao") && !NAO_GUARDAR.has(k)) valores[k] = v;
  });
  try {
    sessionStorage.setItem(RASCUNHO, JSON.stringify({ t: Date.now(), path: location.pathname, valores }));
  } catch {
    /* sessionStorage indisponível: segue sem rascunho */
  }
}

function restaurarRascunho(path: string, tentativa = 0) {
  let r: { t: number; path: string; valores: Record<string, string> } | null = null;
  try {
    r = JSON.parse(sessionStorage.getItem(RASCUNHO) ?? "null");
  } catch {
    r = null;
  }
  if (!r || r.path !== path || Date.now() - r.t > VALIDADE_MS) return;

  const { valores } = r;
  let achou = false;
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("#conteudo form [name]").forEach((el) => {
    if (el instanceof HTMLInputElement && (el.type === "file" || el.type === "password")) return;
    const v = valores[el.name];
    if (v === undefined) return;
    el.value = v;
    achou = true;
  });
  // a página nova pode ainda estar montando: tenta de novo por até ~1 s
  if (!achou && tentativa < 20) setTimeout(() => restaurarRascunho(path, tentativa + 1), 50);
  else if (achou) sessionStorage.removeItem(RASCUNHO);
}

/** Parâmetros da URL que abrem um pop-up (ModalDecisao e NovoAgendamento), que mostra o erro por conta própria. */
const PARAMS_POPUP = ["decidir", "novo", "editar", "detalhes", "km"];

const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-marca";

export default function AppShell({
  grupos,
  nome,
  perfil,
  notifHref,
  naoLidas,
  children,
}: {
  grupos: Grupo[];
  nome: string;
  perfil: string;
  notifHref: string;
  naoLidas: number;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const aviso = useSearchParams();
  const temErro = !!aviso.get("erro");

  useEffect(() => {
    document.addEventListener("submit", guardarRascunho, true);
    return () => document.removeEventListener("submit", guardarRascunho, true);
  }, []);

  useEffect(() => {
    if (temErro) restaurarRascunho(path);
    else {
      try {
        sessionStorage.removeItem(RASCUNHO);
      } catch {
        /* ignorado */
      }
    }
  }, [path, temErro, aviso]);

  const raizes = new Set(["/admin", "/usuario"]);
  const ativo = (href: string) => path === href || (!raizes.has(href) && path.startsWith(`${href}/`));
  const sair = () => signOut({ callbackUrl: "/login" });

  // celular: símbolo pequeno + nome; computador: logo completo da Comurg + nome do sistema
  const marcaCelular = (
    <div className="flex items-center gap-2.5">
      <Image src="/logo-comurg-simbolo.png" alt="Comurg" width={345} height={370} className="h-9 w-auto" priority />
      <div className="leading-tight">
        <div className="text-sm font-semibold text-marca">{APP.nome}</div>
        {APP.orgao && <div className="text-xs text-slate-500">{APP.orgao}</div>}
      </div>
    </div>
  );
  const marcaMenu = (
    <div className="text-center">
      <Image src="/logo-comurg.png" alt="Comurg — Companhia de Urbanização de Goiânia" width={668} height={587} className="mx-auto h-auto w-24" priority />
      <div className="mt-2 text-sm font-semibold text-marca">{APP.nome}</div>
    </div>
  );
  const itemCls = (on: boolean) =>
    `flex items-center gap-2.5 rounded border-l-[3px] px-3 py-2 text-sm ${FOCO} ${
      on ? "border-comurg-laranja bg-marca-suave font-semibold text-marca" : "border-transparent text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <>
    <FaixaComurg />
    <div className="flex min-h-[calc(100vh-6px)] flex-col md:flex-row">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">
        Ir para o conteúdo
      </a>

      {/* Celular: barra superior + abas */}
      <header className="sticky top-0 z-40 border-b bg-white md:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          {marcaCelular}
          <div className="flex items-center gap-4 text-sm">
            <NotificacoesPopover notifHref={notifHref} naoLidas={naoLidas} variante="topo" />
            <button onClick={sair} className={`text-slate-700 underline-offset-2 hover:underline ${FOCO}`}>Sair</button>
          </div>
        </div>
        <nav aria-label="Principal" className="flex gap-1 overflow-x-auto px-2">
          {grupos.flatMap((g) => g.itens).map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={ativo(i.href) ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm ${FOCO} ${
                ativo(i.href) ? "border-marca font-semibold text-marca" : "border-transparent text-slate-600"
              }`}
            >
              {i.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Computador: menu lateral fixo */}
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-white md:sticky md:top-0 md:z-40 md:flex md:h-[calc(100vh-6px)]">
        <div className="border-b px-4 py-4">{marcaMenu}</div>

        <nav aria-label="Principal" className="flex-1 overflow-y-auto px-2 py-3">
          {grupos.map((g, idx) => (
            <div key={g.titulo ?? idx} className={idx > 0 ? "mt-4" : ""}>
              {g.titulo && <div className="px-3 pb-1 text-xs text-slate-500">{g.titulo}</div>}
              <ul>
                {g.itens.map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} aria-current={ativo(i.href) ? "page" : undefined} className={itemCls(ativo(i.href))}>
                      <Icone nome={i.icon} />
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t px-2 py-3">
          <NotificacoesPopover notifHref={notifHref} naoLidas={naoLidas} variante="lateral" />
          <div className="mt-2 flex items-end justify-between gap-2 px-3 text-sm">
            <div className="min-w-0 leading-tight">
              <div className="truncate font-medium">{nome}</div>
              <div className="text-xs text-slate-500">{perfil}</div>
            </div>
            <button onClick={sair} className={`text-slate-600 underline-offset-2 hover:underline ${FOCO}`}>Sair</button>
          </div>
        </div>
      </aside>

      <main id="conteudo" className="min-w-0 flex-1 p-4 md:px-8 md:py-6">
        {/* mensagens que as actions mandam com voltar(caminho, { ok | erro }) */}
        {aviso.get("ok") && (
          <p role="status" className="mb-4 rounded border-l-4 border-green-600 bg-green-50 px-3 py-2 text-sm text-green-800">
            {aviso.get("ok")}
          </p>
        )}
        {/* com um pop-up aberto, o erro aparece dentro dele (e não repetido aqui atrás) */}
        {aviso.get("erro") && !PARAMS_POPUP.some((p) => aviso.has(p)) && (
          <p role="alert" className="mb-4 rounded border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
            {aviso.get("erro")}
          </p>
        )}
        {children}
      </main>
    </div>
    </>
  );
}
