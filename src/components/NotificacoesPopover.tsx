"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { marcarLida, marcarTodasLidas } from "@/app/actions/notificacoes";

type Item = { id: string; mensagem: string; lida: boolean; criadoEm: string; bookingId: string | null };

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

const SINO = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
    <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
  </svg>
);

/**
 * Sino de notificações com painel flutuante preso ao ícone.
 * "topo" = barra do celular (painel logo abaixo da barra); "lateral" = menu do computador (painel ao lado).
 */
export default function NotificacoesPopover({
  notifHref,
  naoLidas,
  variante,
}: {
  notifHref: string;
  naoLidas: number;
  variante: "topo" | "lateral";
}) {
  const router = useRouter();
  const admin = notifHref.startsWith("/admin");
  const raiz = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState(false);

  async function carregar() {
    try {
      const r = await fetch("/api/notificacoes", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setItens((await r.json()).itens);
      setErro(false);
    } catch {
      setErro(true);
    }
  }

  useEffect(() => {
    if (!aberto) return;
    carregar();
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  async function abrirItem(n: Item) {
    setAberto(false);
    if (!n.lida) await marcarLida(n.id);
    if (n.bookingId) router.push(admin ? `/admin/agendamentos?decidir=${n.bookingId}` : "/usuario/agendamentos");
  }

  async function todas() {
    await marcarTodasLidas();
    setItens((l) => l && l.map((n) => ({ ...n, lida: true })));
  }

  const contador =
    naoLidas > 0 ? (
      <span className="rounded-full bg-red-600 px-1.5 text-xs font-semibold leading-5 text-white">{naoLidas > 99 ? "99+" : naoLidas}</span>
    ) : null;

  const botao =
    variante === "topo" ? (
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} não lidas` : "Notificações"}
        className="flex items-center gap-1 text-slate-700 focus-visible:outline-2 focus-visible:outline-marca"
      >
        {SINO}
        {contador}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className={`flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-marca ${
          aberto ? "bg-marca-suave font-semibold text-marca" : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        {SINO}
        <span className="flex-1 text-left">Notificações</span>
        {contador}
      </button>
    );

  const painel = (
    <div
      role="dialog"
      aria-label="Notificações"
      className={`z-50 flex max-h-[70vh] flex-col rounded-md border bg-white shadow-xl ${
        variante === "topo"
          ? "fixed inset-x-3 top-[3.6rem]"
          : "absolute bottom-0 left-full ml-4 w-96"
      }`}
    >
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">Notificações</h2>
        {naoLidas > 0 && (
          <button type="button" onClick={todas} className="text-xs font-medium text-marca hover:underline">
            Marcar todas como lidas
          </button>
        )}
      </div>
      <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
        {itens === null && !erro && <li className="p-4 text-center text-sm text-slate-500">Carregando…</li>}
        {erro && <li className="p-4 text-center text-sm text-red-600">Não foi possível carregar.</li>}
        {itens?.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Nenhuma notificação.</li>}
        {itens?.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => abrirItem(n)}
              className={`block w-full px-4 py-3 text-left text-sm hover:bg-slate-50 ${n.lida ? "text-slate-500" : "bg-marca-suave/60"}`}
            >
              <span className={`block ${n.lida ? "" : "font-medium text-slate-900"}`}>{n.mensagem}</span>
              <span className="mt-1 block text-xs text-slate-500">{quando(n.criadoEm)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t px-4 py-2 text-center">
        <Link href={notifHref} onClick={() => setAberto(false)} className="text-sm font-medium text-marca hover:underline">
          Ver todas
        </Link>
      </div>
    </div>
  );

  return (
    <div ref={raiz} className={variante === "lateral" ? "relative" : ""}>
      {botao}
      {aberto && painel}
    </div>
  );
}
