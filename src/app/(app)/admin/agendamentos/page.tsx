import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import NovoAgendamento from "@/components/NovoAgendamento";
import StatusSelect from "@/components/StatusSelect";
import DecidirAgendamento from "@/components/DecidirAgendamento";
import { StatusBadge, Tabela, Titulo, btnCls, btnGhostCls, cardCls, inputCls, linkCls } from "@/components/ui";
import { parseLocalBr, toInputDateTime } from "@/lib/datetime";
import { STATUS, ehStatus, statusInfo } from "@/lib/status";
import { criarPeloAdmin } from "./actions";

const BASE = "/admin/agendamentos";
const LIMITE = 200;
const DIA_MS = 86400_000;

type Params = { status?: string; decidir?: string; de?: string; ate?: string };
type Filtros = { status?: string; de?: string; ate?: string };

const dataValida = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const hoje = () => toInputDateTime(new Date()).slice(0, 10);
const somaDias = (iso: string, n: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * DIA_MS).toISOString().slice(0, 10);
const ultimoDiaDoMes = (iso: string) =>
  new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0)).toISOString().slice(0, 10);
const hora = (d: Date) => toInputDateTime(d).slice(11);
const diaBr = (d: Date) => toInputDateTime(d).slice(0, 10);
const diaMes = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");
const tituloDia = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });

/** Endereço da lista com os filtros informados (e, opcionalmente, o pop-up de uma solicitação aberto). */
const href = (f: Filtros, decidir?: string) => {
  const q = new URLSearchParams(Object.entries({ ...f, decidir }).filter(([, v]) => v) as [string, string][]);
  return q.size ? `${BASE}?${q}` : BASE;
};

const chip = (ativo: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
    ativo ? "border-marca bg-marca text-white" : "bg-white text-slate-700 hover:bg-slate-50"
  }`;

export default async function AgendamentosAdmin({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const filtro = ehStatus(sp.status) ? sp.status : undefined;
  const de = dataValida(sp.de);
  const ate = dataValida(sp.ate);

  // período: agendamentos que tocam o intervalo escolhido (dias inteiros, horário de Brasília)
  const periodo: Prisma.BookingWhereInput = {};
  const ini = de ? parseLocalBr(`${de}T00:00`) : null;
  const fimP = ate ? parseLocalBr(`${somaDias(ate, 1)}T00:00`) : null;
  if (ini) periodo.fim = { gt: ini };
  if (fimP) periodo.inicio = { lt: fimP };

  const [lista, porStatus, vehicles, users] = await Promise.all([
    prisma.booking.findMany({
      where: { ...periodo, status: filtro },
      include: { user: { select: { nome: true } }, vehicle: { select: { prefixo: true } } },
      orderBy: { inicio: de ? "asc" : "desc" },
      take: LIMITE,
    }),
    prisma.booking.groupBy({ by: ["status"], where: periodo, _count: { _all: true } }),
    prisma.vehicle.findMany({
      where: { status: "ATIVO" },
      select: { id: true, prefixo: true, placa: true, tipo: true, lotacao: true },
      orderBy: { prefixo: "asc" },
    }),
    prisma.user.findMany({ where: { ativo: true }, select: { id: true, nome: true, setor: true }, orderBy: { nome: "asc" } }),
  ]);

  const total = porStatus.reduce((n, g) => n + g._count._all, 0);
  const conta = (s: string) => porStatus.find((g) => g.status === s)?._count._all ?? 0;

  const h = hoje();
  // semana de segunda a domingo que contém hoje
  const segunda = somaDias(h, -((new Date(`${h}T12:00:00Z`).getUTCDay() + 6) % 7));
  const atalhos = [
    { nome: "Hoje", de: h, ate: h },
    { nome: "Semanal", de: segunda, ate: somaDias(segunda, 6) },
    { nome: "Mensal", de: `${h.slice(0, 8)}01`, ate: ultimoDiaDoMes(h) },
  ];
  const temData = !!(de || ate);

  // agrupa por dia de início (horário de Brasília), mantendo a ordem da consulta
  const grupos: { dia: string; itens: typeof lista }[] = [];
  for (const b of lista) {
    const dia = diaBr(b.inicio);
    const g = grupos[grupos.length - 1];
    if (g?.dia === dia) g.itens.push(b);
    else grupos.push({ dia, itens: [b] });
  }

  return (
    <div>
      <Titulo
        acao={
          <NovoAgendamento
            action={criarPeloAdmin}
            vehicles={vehicles}
            users={users.map((u) => ({ id: u.id, label: `${u.nome}${u.setor ? ` (${u.setor})` : ""}` }))}
          />
        }
      >
        Agendamentos
      </Titulo>

      <section aria-label="Filtros" className={`mb-5 p-4 ${cardCls}`}>
        <form action={BASE} className="grid gap-3 text-sm sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Status
            <StatusSelect
              name="status"
              defaultValue={filtro ?? ""}
              opcoes={[
                { valor: "", rotulo: `Todos (${total})` },
                ...STATUS.map((s) => ({ valor: s, rotulo: `${statusInfo[s].label} (${conta(s)})` })),
              ]}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            De
            <input type="date" name="de" defaultValue={de} className={`${inputCls} text-sm font-normal text-slate-900 lg:w-auto`} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Até
            <input type="date" name="ate" defaultValue={ate} className={`${inputCls} text-sm font-normal text-slate-900 lg:w-auto`} />
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <button className={btnCls}>Filtrar</button>
            {(filtro || temData) && (
              <Link href={BASE} className={btnGhostCls}>
                Limpar filtros
              </Link>
            )}
          </div>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Atalhos</span>
          {atalhos.map((a) => (
            <Link key={a.nome} href={href({ status: filtro, de: a.de, ate: a.ate })} className={chip(de === a.de && ate === a.ate)}>
              {a.nome}
            </Link>
          ))}
        </div>
      </section>

      {grupos.length === 0 ? (
        <p className={`p-6 text-center text-sm text-slate-500 ${cardCls}`}>Nenhum agendamento encontrado.</p>
      ) : (
        <div className="space-y-5">
          {grupos.map((g) => (
            <section key={g.dia} aria-label={tituloDia(g.dia)}>
              <h2 className="mb-2 flex flex-wrap items-baseline gap-2 text-sm font-semibold capitalize text-slate-800">
                {tituloDia(g.dia)}
                {g.dia === h && (
                  <span className="rounded bg-marca-suave px-1.5 py-0.5 text-xs font-medium normal-case text-marca-forte">Hoje</span>
                )}
                <span className="text-xs font-normal normal-case text-slate-500">
                  {g.itens.length} {g.itens.length === 1 ? "agendamento" : "agendamentos"}
                </span>
              </h2>
              <Tabela cols={["Horário", "Solicitante", "Veículo", "Destino", "Status", ""]}>
                {g.itens.map((b) => (
                  <tr key={b.id}>
                    <td className="whitespace-nowrap tabular-nums">
                      {hora(b.inicio)} → {diaBr(b.fim) === g.dia ? hora(b.fim) : `${diaMes(diaBr(b.fim))} ${hora(b.fim)}`}
                    </td>
                    <td className="font-medium">{b.user.nome}</td>
                    <td className="whitespace-nowrap">{b.vehicle.prefixo}</td>
                    <td>{b.destino}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className="text-right">
                      <Link href={href({ status: filtro, de, ate }, b.id)} className={linkCls} scroll={false}>
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </Tabela>
            </section>
          ))}
          {lista.length === LIMITE && (
            <p className="text-center text-xs text-slate-500">
              Mostrando os {LIMITE} primeiros. Use o filtro de período para ver os demais.
            </p>
          )}
        </div>
      )}
      <DecidirAgendamento id={sp.decidir} retorno={BASE} />
    </div>
  );
}
