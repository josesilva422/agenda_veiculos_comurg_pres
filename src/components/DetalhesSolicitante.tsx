import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Dados, StatusBadge, btnGhostCls } from "@/components/ui";
import { fmtDateTime, fmtPeriodo } from "@/lib/datetime";
import { percurso, pendenciaKm, textoPendencia } from "@/lib/km";
import { podeModificar } from "@/lib/booking-rules";
import { lerAlteracao } from "@/lib/booking-service";
import { OCUPAM } from "@/lib/status";

/** Conteúdo do pop-up "Detalhes" de um agendamento do próprio solicitante. */
export default async function DetalhesSolicitante({ id, base }: { id: string; base: string }) {
  const u = await requireUser();
  const b = await prisma.booking.findUnique({ where: { id }, include: { vehicle: true, decididoPor: { select: { nome: true } } } });
  if (!b || b.userId !== u.id) return <p className="text-sm text-slate-600">Agendamento não encontrado.</p>;

  const km = percurso(b.kmInicial, b.kmFinal);
  const pedido = lerAlteracao(b);
  const veiculoPedido = pedido && pedido.vehicleId !== b.vehicleId
    ? await prisma.vehicle.findUnique({ where: { id: pedido.vehicleId }, select: { prefixo: true, placa: true } })
    : null;
  const pend = pendenciaKm(b);
  const linhas: [string, React.ReactNode][] = [
    ["Status", <StatusBadge key="s" status={b.status} />],
    ["Veículo", `${b.vehicle.prefixo} — ${b.vehicle.placa}`],
    ["Tipo do veículo", `${b.vehicle.tipo} (${b.vehicle.lotacao} lugares)`],
  ];
  if (b.vehicle.contrato) linhas.push(["Contrato", b.vehicle.contrato]);
  linhas.push(
    ["Período", fmtPeriodo(b)],
    ["Destino / motivo", b.destino],
    ["Motorista", b.motorista ?? "—"],
    ["Passageiros", String(b.passageiros)],
    [
      "Quilometragem",
      b.kmInicial === null && b.kmFinal === null
        ? "Não informada"
        : `${b.kmInicial?.toLocaleString("pt-BR") ?? "—"} → ${b.kmFinal?.toLocaleString("pt-BR") ?? "—"}${km !== null ? ` (${km.toLocaleString("pt-BR")} km)` : ""}`,
    ],
    ["Termo de responsabilidade", b.termoAceitoEm ? `Aceito em ${fmtDateTime(b.termoAceitoEm)}` : "Não registrado"],
    ["Solicitado em", fmtDateTime(b.criadoEm)],
  );
  if (b.decididoPor && b.decididoEm) linhas.push(["Decidido por", `${b.decididoPor.nome} em ${fmtDateTime(b.decididoEm)}`]);
  if (b.justificativa) linhas.push(["Justificativa", b.justificativa]);

  return (
    <div className="space-y-4">
      {pedido && (
        <div className="rounded border-l-4 border-blue-500 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <p>Você pediu uma alteração, que aguarda o administrador. Até lá, vale a reserva aprovada abaixo.</p>
          <p className="mt-1">
            <b>Pedido:</b> {veiculoPedido ? `${veiculoPedido.prefixo} — ${veiculoPedido.placa} · ` : ""}
            {fmtPeriodo(pedido)} · {pedido.destino}
          </p>
        </div>
      )}
      {b.status === "PENDENTE" && (
        <p className="rounded border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Esta solicitação aguarda a decisão do administrador.
        </p>
      )}
      {pend && (
        <p className="rounded border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Falta informar o {textoPendencia(pend)} desta reserva.
        </p>
      )}
      <Dados linhas={linhas} />
      <div className="flex flex-wrap gap-2">
        {OCUPAM.includes(b.status) && (
          <Link href={`${base}?km=${b.id}`} scroll={false} className={btnGhostCls}>
            {pend ? "Informar km" : "Editar km"}
          </Link>
        )}
        {podeModificar(b.status, b.inicio) && (
          <Link href={`${base}/${b.id}`} className={btnGhostCls}>Editar agendamento</Link>
        )}
      </div>
    </div>
  );
}
