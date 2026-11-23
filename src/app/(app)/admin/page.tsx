import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Stat, Stats, Tabela, Titulo, btnCls, cardCls, linkCls } from "@/components/ui";
import { fmtData, fmtPeriodo } from "@/lib/datetime";
import { alertaLabel, calcularAlertas } from "@/lib/alerts";
import { overlaps } from "@/lib/booking-rules";
import { AGUARDANDO, COR } from "@/lib/status";
import DecidirAgendamento from "@/components/DecidirAgendamento";
import { aprovarLote } from "./agendamentos/actions";

const LIMITE_FILA = 100;

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
  const [pendentes, totalPendentes, emUso, proximos, comCnh] = await Promise.all([
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
    prisma.booking.count({ where: { status: "APROVADO", inicio: { lte: agora }, fim: { gt: agora } } }),
    prisma.booking.findMany({
      where: { status: "APROVADO", inicio: { gt: agora } },
      select: { id: true, inicio: true, fim: true, user: { select: { nome: true } }, vehicle: { select: { prefixo: true } } },
      orderBy: { inicio: "asc" },
      take: 5,
    }),
    prisma.user.findMany({
      where: { ativo: true, cnhValidade: { not: null } },
      select: { id: true, nome: true, ativo: true, cnhValidade: true },
    }),
  ]);
  const alertas = calcularAlertas(comCnh, agora);
  const conflitos = await calcularConflitos(pendentes);

  return (
    <div>
      <Titulo>Painel do administrador</Titulo>
      <div className="space-y-6">
        <Stats>
          <Stat valor={totalPendentes} rotulo="Pendentes de decisão" />
          <Stat valor={emUso} rotulo="Veículos em uso agora" />
          <Stat valor={alertas.length} rotulo="Alertas de CNH" />
        </Stats>

        {alertas.length > 0 && (
          <section aria-labelledby="alertas">
            <h2 id="alertas" className="mb-2 text-base font-semibold">Alertas de CNH ({alertas.length})</h2>
            <ul className={`divide-y text-sm ${cardCls}`}>
              {alertas.map((a) => (
                <li key={a.userId + a.tipo} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span>
                    <b>{a.nome}</b> — {alertaLabel[a.tipo]}
                    {a.data && <span className="text-slate-500"> ({fmtData(a.data)})</span>}
                  </span>
                  <Link href={`/admin/usuarios/${a.userId}`} className={linkCls}>Resolver</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

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

        <section>
          <h2 className="mb-2 text-base font-semibold">Próximos agendamentos aprovados</h2>
          <ul className={`divide-y text-sm ${cardCls}`}>
            {proximos.map((b) => (
              <li key={b.id} className="flex flex-wrap justify-between gap-2 p-3">
                <span><b>{b.vehicle.prefixo}</b> — {b.user.nome}</span>
                <span className="text-slate-500">{fmtPeriodo(b)}</span>
              </li>
            ))}
            {proximos.length === 0 && <li className="p-3 text-slate-500">Nenhum agendamento futuro.</li>}
          </ul>
        </section>
      </div>
      <DecidirAgendamento id={decidir} retorno="/admin" />
    </div>
  );
}
