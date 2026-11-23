import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import NovoAgendamento from "@/components/NovoAgendamento";
import ModalDecisao from "@/components/ModalDecisao";
import KmSolicitante from "@/components/KmSolicitante";
import { StatusBadge, Tabela, Titulo, cardCls, linkCls } from "@/components/ui";
import { fmtData, fmtDateTime } from "@/lib/datetime";
import { podeModificar } from "@/lib/booking-rules";
import { pendenciaKm, textoPendencia } from "@/lib/km";
import { cancelarAgendamento, criarAgendamento } from "./actions";

const BASE = "/usuario/agendamentos";

export default async function MeusAgendamentos({ searchParams }: { searchParams: Promise<{ km?: string }> }) {
  const { km } = await searchParams;
  const u = await requireUser();
  const [lista, vehicles] = await Promise.all([
    prisma.booking.findMany({ where: { userId: u.id }, include: { vehicle: true }, orderBy: { inicio: "desc" } }),
    prisma.vehicle.findMany({
      where: { status: "ATIVO" },
      select: { id: true, prefixo: true, placa: true, tipo: true, lotacao: true },
      orderBy: { prefixo: "asc" },
    }),
  ]);

  const agora = new Date();
  const pendentes = lista.flatMap((b) => {
    const p = pendenciaKm(b, agora);
    return p ? [{ b, texto: textoPendencia(p) }] : [];
  });
  const kmTexto = (b: { kmInicial: number | null; kmFinal: number | null }) =>
    `${b.kmInicial?.toLocaleString("pt-BR") ?? "—"} → ${b.kmFinal?.toLocaleString("pt-BR") ?? "—"}`;
  const abrirKm = (id: string) => `${BASE}?km=${id}`;

  return (
    <div>
      <Titulo acao={<NovoAgendamento action={criarAgendamento} vehicles={vehicles} />}>Meus agendamentos</Titulo>

      {pendentes.length > 0 && (
        <section role="alert" className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="mb-1 font-semibold">
            {pendentes.length === 1 ? "1 reserva está sem quilometragem" : `${pendentes.length} reservas estão sem quilometragem`}
          </div>
          <ul className="space-y-1">
            {pendentes.map(({ b, texto }) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {b.vehicle.prefixo} · {fmtData(b.inicio)} — falta o {texto}
                </span>
                <Link href={abrirKm(b.id)} scroll={false} className="rounded bg-amber-200 px-2.5 py-1 text-xs font-medium text-amber-950">
                  Informar agora
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
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
            {b.status === "APROVADO" && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1.5 text-sm">
                <span className="tabular-nums text-slate-700">Km: {kmTexto(b)}</span>
                <Link href={abrirKm(b.id)} scroll={false} className={linkCls}>
                  {pendenciaKm(b, agora) ? "Informar km" : "Editar km"}
                </Link>
              </div>
            )}
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
      <Tabela cols={["Veículo", "Início", "Fim", "Destino", "Km", "Status", ""]} vazio="Você ainda não fez nenhuma solicitação.">
        {lista.map((b) => (
          <tr key={b.id}>
            <td className="whitespace-nowrap font-medium">{b.vehicle.prefixo}</td>
            <td className="whitespace-nowrap">{fmtDateTime(b.inicio)}</td>
            <td className="whitespace-nowrap">{fmtDateTime(b.fim)}</td>
            <td>{b.destino}</td>
            <td className="whitespace-nowrap tabular-nums">{b.status === "APROVADO" ? kmTexto(b) : "—"}</td>
            <td>
              <div>
                <StatusBadge status={b.status} />
                {b.justificativa && <div className="mt-1 text-xs text-slate-500">{b.justificativa}</div>}
              </div>
            </td>
            <td className="flex justify-end gap-3">
              {b.status === "APROVADO" && (
                <Link href={abrirKm(b.id)} scroll={false} className={linkCls}>
                  {pendenciaKm(b, agora) ? "Informar km" : "Editar km"}
                </Link>
              )}
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

      {km && (
        <ModalDecisao key={km} param="km" titulo="Quilometragem">
          <KmSolicitante id={km} retorno={BASE} />
        </ModalDecisao>
      )}
    </div>
  );
}
