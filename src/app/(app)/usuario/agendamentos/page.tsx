import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import NovoAgendamento from "@/components/NovoAgendamento";
import { StatusBadge, Tabela, Titulo, cardCls, linkCls } from "@/components/ui";
import { fmtData, fmtDateTime } from "@/lib/datetime";
import { podeModificar } from "@/lib/booking-rules";
import { cancelarAgendamento, criarAgendamento } from "./actions";

export default async function MeusAgendamentos() {
  const u = await requireUser();
  const [lista, vehicles] = await Promise.all([
    prisma.booking.findMany({ where: { userId: u.id }, include: { vehicle: true }, orderBy: { inicio: "desc" } }),
    prisma.vehicle.findMany({
      where: { status: "ATIVO" },
      select: { id: true, prefixo: true, placa: true, tipo: true, lotacao: true },
      orderBy: { prefixo: "asc" },
    }),
  ]);

  return (
    <div>
      <Titulo acao={<NovoAgendamento action={criarAgendamento} vehicles={vehicles} />}>Meus agendamentos</Titulo>
      {/* celular: um cartão por agendamento */}
      <ul className="space-y-3 sm:hidden">
        {lista.length === 0 && (
          <li className={`p-4 text-center text-sm text-slate-500 ${cardCls}`}>Você ainda não fez nenhuma solicitação.</li>
        )}
        {lista.map((b) => (
          <li key={b.id} className={`p-3 ${cardCls}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold">{b.vehicle.prefixo}</div>
              <StatusBadge status={b.status} />
            </div>
            <div className="mt-1 text-sm tabular-nums text-slate-700">
              {fmtData(b.inicio)} · {fmtDateTime(b.inicio).slice(-5)} → {fmtData(b.fim) === fmtData(b.inicio) ? "" : `${fmtData(b.fim)} · `}
              {fmtDateTime(b.fim).slice(-5)}
            </div>
            <div className="mt-1 break-words text-sm text-slate-600">{b.destino}</div>
            {b.justificativa && <div className="mt-1 text-xs text-slate-500">{b.justificativa}</div>}
            {podeModificar(b.status, b.inicio) && (
              <div className="mt-2 flex justify-end gap-4 border-t pt-2 text-sm">
                <Link href={`/usuario/agendamentos/${b.id}`} className={linkCls}>Editar</Link>
                <form action={cancelarAgendamento.bind(null, b.id)}>
                  <button className="text-red-600 hover:underline">Cancelar</button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* computador: tabela */}
      <div className="max-sm:hidden">
      <Tabela cols={["Veículo", "Início", "Fim", "Destino", "Status", ""]} vazio="Você ainda não fez nenhuma solicitação.">
        {lista.map((b) => (
          <tr key={b.id}>
            <td className="whitespace-nowrap font-medium">{b.vehicle.prefixo}</td>
            <td className="whitespace-nowrap">{fmtDateTime(b.inicio)}</td>
            <td className="whitespace-nowrap">{fmtDateTime(b.fim)}</td>
            <td>{b.destino}</td>
            <td>
              <div>
                <StatusBadge status={b.status} />
                {b.justificativa && <div className="mt-1 text-xs text-slate-500">{b.justificativa}</div>}
              </div>
            </td>
            <td className="flex justify-end gap-3">
              {podeModificar(b.status, b.inicio) && (
                <>
                  <Link href={`/usuario/agendamentos/${b.id}`} className={linkCls}>Editar</Link>
                  <form action={cancelarAgendamento.bind(null, b.id)}>
                    <button className="text-red-600 hover:underline">Cancelar</button>
                  </form>
                </>
              )}
            </td>
          </tr>
        ))}
      </Tabela>
      </div>
    </div>
  );
}
