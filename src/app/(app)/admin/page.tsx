import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Stat, Stats, Tabela, Titulo, btnCls, cardCls, linkCls } from "@/components/ui";
import { fmtData, fmtPeriodo, parseLocalBr, toInputDateTime } from "@/lib/datetime";
import { overlaps } from "@/lib/booking-rules";
import { pendenciaKm, textoPendencia } from "@/lib/km";
import { AGUARDANDO, COR } from "@/lib/status";
import DecidirAgendamento from "@/components/DecidirAgendamento";
import { aprovarLote } from "./agendamentos/actions";

const LIMITE_FILA = 100;
const LIMITE_LISTA = 10;

/** Quantas reservas aprovadas colidem com cada pendente — uma consulta só, cruzada em memória. */
async function calcularConflitos(pendentes: { id: string; vehicleId: string; inicio: Date; fim: Date }[]) {
  if (pendentes.length === 0) return [] as number[];
  const aprovadas = await prisma.booking.findMany({
    where: {
      status: "APROVADO",
      vehicleId: { in: [...new Set(pendentes.map((p) => p.vehicleId))] },
      inicio: { lt: new Date(Math.max(...pendentes.map((p) => p.fim.getTime()))) },
      fim: { gt: new Date(Math.min(...pendentes.map((p) => p.inicio.getTime()))) },
    },
    select: { id: true, vehicleId: true, inicio: true, fim: true },
  });
  return pendentes.map(
    (p) => aprovadas.filter((a) => a.vehicleId === p.vehicleId && a.id !== p.id && overlaps(a, p)).length,
  );
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ decidir?: string }> }) {
  const { decidir } = await searchParams;
  const agora = new Date();
  const fila = { status: { in: AGUARDANDO } };
  // mês corrente em horário de Brasília: do dia 1, 00:00, até agora
  const inicioMes = parseLocalBr(`${toInputDateTime(agora).slice(0, 7)}-01T00:00`) ?? agora;
  const concluidosMes = { status: "APROVADO" as const, fim: { gte: inicioMes, lte: agora } };
  const aConcluir = { status: "APROVADO" as const, fim: { gt: agora } };
  const resumo = { id: true, inicio: true, fim: true, user: { select: { nome: true } }, vehicle: { select: { prefixo: true } } };
  const [pendentes, totalPendentes, totalConcluidos, concluidos, totalAConcluir, aprovadosAConcluir, kmCandidatas] = await Promise.all([
    prisma.booking.findMany({
      where: fila,
      select: {
        id: true, vehicleId: true, inicio: true, fim: true, destino: true, status: true,
        user: { select: { nome: true, setor: true, email: true } },
        vehicle: { select: { prefixo: true } },
      },
      orderBy: { atualizadoEm: "asc" },
      take: LIMITE_FILA,
    }),
    prisma.booking.count({ where: fila }),
    prisma.booking.count({ where: concluidosMes }),
    prisma.booking.findMany({ where: concluidosMes, select: resumo, orderBy: { fim: "desc" }, take: LIMITE_LISTA }),
    prisma.booking.count({ where: aConcluir }),
    prisma.booking.findMany({ where: aConcluir, select: resumo, orderBy: { inicio: "asc" }, take: LIMITE_LISTA }),
    // reservas aprovadas em que o uso já começou e falta algum km (confirmado em memória por pendenciaKm)
    prisma.booking.findMany({
      where: { status: "APROVADO", inicio: { lte: agora }, OR: [{ kmInicial: null }, { kmFinal: null, fim: { lte: agora } }] },
      select: {
        id: true, status: true, inicio: true, fim: true, kmInicial: true, kmFinal: true,
        user: { select: { nome: true, setor: true } },
        vehicle: { select: { prefixo: true } },
      },
      orderBy: { inicio: "desc" },
      take: 200,
    }),
  ]);
  const kmPendentes = kmCandidatas.flatMap((b) => {
    const p = pendenciaKm(b, agora);
    return p ? [{ b, texto: textoPendencia(p) }] : [];
  });
  const hojeBr = toInputDateTime(agora).slice(0, 10);
  const linkConcluidos = `/admin/agendamentos?${new URLSearchParams({ status: "APROVADO", de: `${hojeBr.slice(0, 7)}-01`, ate: hojeBr })}`;
  const linkAConcluir = `/admin/agendamentos?${new URLSearchParams({ status: "APROVADO", de: hojeBr })}`;
  const conflitos = await calcularConflitos(pendentes);

  return (
    <div>
      <Titulo>Painel do administrador</Titulo>
      <div className="space-y-6">
        <Stats>
          <Stat valor={totalPendentes} rotulo="Pendentes de decisão" />
          <Stat valor={totalConcluidos} rotulo="Concluídos no mês" />
          <Stat valor={totalAConcluir} rotulo="Aprovados a concluir" />
          <Stat valor={kmPendentes.length} rotulo="Reservas sem km" />
        </Stats>

        <section>
          <h2 className="mb-2 text-base font-semibold">Solicitações pendentes</h2>
          <form action={aprovarLote}>
            <Tabela cols={["", "Solicitante", "Veículo", "Período", "Motivo", "Tipo", ""]} vazio="Nenhuma solicitação pendente.">
              {pendentes.map((b, i) => (
                <tr key={b.id}>
                  <td>
                    <input type="checkbox" name="ids" value={b.id} disabled={conflitos[i] > 0} aria-label="Selecionar" />
                  </td>
                  <td>
                    <div>
                      <div className="font-medium">{b.user.nome}</div>
                      <div className="text-xs text-slate-500">{b.user.setor ?? b.user.email}</div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap">{b.vehicle.prefixo}</td>
                  <td className="whitespace-nowrap">{fmtPeriodo(b)}</td>
                  <td>{b.destino}</td>
                  <td className="space-x-3">
                    {b.status === "ALTERACAO_PENDENTE" ? (
                      <Badge cor={COR.info}>Alteração</Badge>
                    ) : (
                      <Badge cor={COR.alerta}>Nova</Badge>
                    )}
                    {conflitos[i] > 0 && <Badge cor={COR.erro}>Conflito</Badge>}
                  </td>
                  <td className="text-right">
                    <Link href={`/admin?decidir=${b.id}`} className={linkCls} scroll={false}>Analisar</Link>
                  </td>
                </tr>
              ))}
            </Tabela>
            {pendentes.length > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <button className={btnCls}>Aprovar selecionadas</button>
                {totalPendentes > pendentes.length && (
                  <span className="text-sm text-slate-500">
                    Mostrando as {pendentes.length} mais antigas de {totalPendentes}.
                  </span>
                )}
              </div>
            )}
          </form>
        </section>

        {kmPendentes.length > 0 && (
          <section aria-labelledby="km-pendente">
            <h2 id="km-pendente" className="mb-2 text-base font-semibold">Quilometragem pendente ({kmPendentes.length})</h2>
            <ul className={`divide-y text-sm ${cardCls}`}>
              {kmPendentes.slice(0, 20).map(({ b, texto }) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span>
                    <b>{b.vehicle.prefixo}</b> — {b.user.nome}
                    <span className="text-slate-500"> · {fmtData(b.inicio)} · falta o {texto}</span>
                  </span>
                  <Link href={`/admin?decidir=${b.id}`} className={linkCls} scroll={false}>Abrir</Link>
                </li>
              ))}
            </ul>
            {kmPendentes.length > 20 && <p className="mt-1 text-xs text-slate-500">Mostrando 20 de {kmPendentes.length}.</p>}
            <p className="mt-1 text-xs text-slate-500">Os solicitantes são lembrados por notificação a cada 24 horas.</p>
          </section>
        )}

        <section aria-labelledby="a-concluir">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="a-concluir" className="text-base font-semibold">Aprovados a concluir ({totalAConcluir})</h2>
            {totalAConcluir > aprovadosAConcluir.length && (
              <Link href={linkAConcluir} className={`text-sm ${linkCls}`}>Ver todos</Link>
            )}
          </div>
          <ul className={`divide-y text-sm ${cardCls}`}>
            {aprovadosAConcluir.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-3">
                <span>
                  <b>{b.vehicle.prefixo}</b> — {b.user.nome}
                  {b.inicio <= agora && <span className="ml-2 rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">em andamento</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-slate-500">{fmtPeriodo(b)}</span>
                  <Link href={`/admin?decidir=${b.id}`} className={linkCls} scroll={false}>Abrir</Link>
                </span>
              </li>
            ))}
            {aprovadosAConcluir.length === 0 && <li className="p-3 text-slate-500">Nenhum agendamento aprovado a concluir.</li>}
          </ul>
        </section>

        <section aria-labelledby="concluidos">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="concluidos" className="text-base font-semibold">Concluídos no mês ({totalConcluidos})</h2>
            {totalConcluidos > concluidos.length && (
              <Link href={linkConcluidos} className={`text-sm ${linkCls}`}>Ver todos</Link>
            )}
          </div>
          <ul className={`divide-y text-sm ${cardCls}`}>
            {concluidos.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-3">
                <span><b>{b.vehicle.prefixo}</b> — {b.user.nome}</span>
                <span className="flex items-center gap-3">
                  <span className="text-slate-500">{fmtPeriodo(b)}</span>
                  <Link href={`/admin?decidir=${b.id}`} className={linkCls} scroll={false}>Abrir</Link>
                </span>
              </li>
            ))}
            {concluidos.length === 0 && <li className="p-3 text-slate-500">Nenhum agendamento concluído neste mês.</li>}
          </ul>
        </section>
      </div>
      <DecidirAgendamento id={decidir} retorno="/admin" />
    </div>
  );
}
