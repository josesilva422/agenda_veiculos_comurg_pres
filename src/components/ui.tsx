import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { statusInfo, type BookingStatus } from "@/lib/status";

/* Classes base: a aparência de cartões, campos, botões e links muda aqui.
   As cores (marca, borda, fundo) ficam em app/globals.css. */
export const cardCls = "rounded-md border bg-white";
export const inputCls =
  "mt-1 w-full min-w-0 rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-marca focus:outline-2 focus:outline-marca/25";
const btnBase = "inline-block rounded px-4 py-2 text-sm font-medium disabled:opacity-50";
export const btnCls = `${btnBase} bg-marca text-white hover:bg-marca-forte`;
export const btnGhostCls = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
export const btnPerigoCls = `${btnBase} bg-red-700 text-white hover:bg-red-800`;
export const linkCls = "font-medium text-marca hover:underline";

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 text-sm ${className}`}>
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

/** Título da página, com texto de apoio e botão de ação opcionais. */
export function Titulo({ children, sub, acao }: { children: ReactNode; sub?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{children}</h1>
        {acao}
      </div>
      {sub && <p className="mt-1 text-sm text-slate-600">{sub}</p>}
    </div>
  );
}

/** Marcador de situação: bolinha colorida + texto. */
export function Badge({ cor, children }: { cor: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="h-2 w-2 rounded-full" style={{ background: cor }} />
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge cor={statusInfo[status].cor}>{statusInfo[status].label}</Badge>;
}

type El = ReactElement<{ children?: ReactNode }>;

/**
 * Tabela padrão. As linhas (<tr> com <td> diretos) vêm como filhos; sem linhas, mostra `vazio`.
 * Cada célula recebe o nome da coluna (data-label), que o CSS usa no celular.
 */
export function Tabela({
  cols,
  vazio,
  numerica = false,
  children,
}: {
  cols: string[];
  vazio?: string;
  /** alinha à direita todas as colunas depois da primeira */
  numerica?: boolean;
  children: ReactNode;
}) {
  const linhas = Children.map(children, (tr) =>
    isValidElement(tr)
      ? cloneElement(tr as El, {}, Children.map((tr as El).props.children, (td, i) =>
          isValidElement(td) ? cloneElement(td as ReactElement<{ "data-label"?: string }>, { "data-label": cols[i] }) : td,
        ))
      : tr,
  );
  return (
    <div className={`overflow-x-auto ${cardCls}`}>
      <table className={`tabela ${numerica ? "numerica" : ""}`}>
        <thead>
          <tr>
            {cols.map((c, i) => <th key={i}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas}
          {vazio && Children.count(children) === 0 && (
            <tr>
              <td colSpan={cols.length} className="justify-center py-6 text-center text-slate-500">{vazio}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Lista "rótulo: valor" usada nas telas de detalhe. */
export function Dados({ linhas }: { linhas: [string, ReactNode][] }) {
  return (
    // celular: rótulo em cima e valor embaixo (largura toda); a partir de sm: duas colunas
    <dl className={`grid grid-cols-1 gap-y-3 p-4 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6 sm:gap-y-2 sm:p-5 ${cardCls}`}>
      {linhas.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 sm:contents">
          <dt className="text-xs text-slate-500 sm:text-sm">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Faixa de números-resumo (painel e relatórios): <Stats><Stat .../>...</Stats> */
export function Stats({ children }: { children: ReactNode }) {
  return <div className={`grid grid-cols-1 divide-y sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] sm:divide-x sm:divide-y-0 ${cardCls}`}>{children}</div>;
}

export function Stat({ valor, rotulo }: { valor: ReactNode; rotulo: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:block sm:px-5">
      <div className="text-sm text-slate-600 sm:text-xs sm:text-slate-500">{rotulo}</div>
      <div className="text-xl font-semibold tabular-nums">{valor}</div>
    </div>
  );
}
