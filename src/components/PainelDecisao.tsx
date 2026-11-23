import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Dados, Field, StatusBadge, btnCls, btnGhostCls, btnPerigoCls, cardCls, inputCls } from "./ui";
import { fmtDateTime, fmtPeriodo } from "@/lib/datetime";
import { lerSnap, snap } from "@/lib/booking-service";
import { AGUARDANDO, ATIVOS } from "@/lib/status";
import { aprovar, cancelarPeloAdmin, rejeitar } from "@/app/(app)/admin/agendamentos/actions";

/**
 * Dados da solicitação + decisão (aprovar/rejeitar) e gerenciamento.
 * Usado no pop-up (com `retorno`, para voltar à página de origem) e na página própria.
 */
export default async function PainelDecisao({ id, retorno }: { id: string; retorno?: string }) {
  const volta = retorno ? <input type="hidden" name="retorno" value={retorno} /> : null;
  const b = await prisma.booking.findUnique({
    where: { id },
    include: { user: true, vehicle: true, decididoPor: true },
  });
  if (!b) {
    if (!retorno) notFound();
    return <p className="text-sm text-slate-600">Agendamento não encontrado.</p>;
  }

  const decidivel = AGUARDANDO.includes(b.status);
  const alteracao = b.status === "ALTERACAO_PENDENTE";
  const [vehicles, conflitos] = await Promise.all([
    alteracao ? prisma.vehicle.findMany({ select: { id: true, prefixo: true } }) : [],
    decidivel
      ? prisma.booking.findMany({
          where: { vehicleId: b.vehicleId, status: "APROVADO", id: { not: b.id }, inicio: { lt: b.fim }, fim: { gt: b.inicio } },
          include: { user: true },
        })
      : [],
  ]);
  const descreve = (s: ReturnType<typeof snap> | null) =>
    s &&
    `${vehicles.find((v) => v.id === s.vehicleId)?.prefixo ?? "?"} · ${fmtPeriodo({ inicio: new Date(s.inicio), fim: new Date(s.fim) })} · ${s.destino} · ${s.passageiros} pass.${s.motorista ? ` · Motorista: ${s.motorista}` : ""}`;
  const antes = alteracao ? descreve(lerSnap(b.versaoAnterior)) : null;

  const linhas: [string, React.ReactNode][] = [
    ["Solicitante", `${b.user.nome} (${b.user.setor ?? b.user.email})`],
    ["Telefone", b.user.telefone ?? "—"],
    ["Veículo", `${b.vehicle.prefixo} — ${b.vehicle.placa} (${b.vehicle.tipo}, ${b.vehicle.lotacao} lugares)`],
    ["Período", fmtPeriodo(b)],
    ["Destino/motivo", b.destino],
    ["Motorista", b.motorista ?? "—"],
    ["Passageiros", String(b.passageiros)],
    ["Termo de responsabilidade", b.termoAceitoEm ? `Aceito em ${fmtDateTime(b.termoAceitoEm)}` : "Não registrado"],
    ["Status", <StatusBadge key="s" status={b.status} />],
  ];
  if (b.justificativa) linhas.push(["Justificativa", b.justificativa]);
  if (b.decididoPor) linhas.push(["Decidido por", b.decididoPor.nome]);

  return (
    <div className="space-y-6">
        <Dados linhas={linhas} />

        {antes && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="mb-1 font-semibold">Alteração solicitada pelo usuário</div>
            <div>Antes (aprovado): {antes}</div>
            <div>Agora (solicitado): {descreve(snap(b))}</div>
          </div>
        )}

        {conflitos.length > 0 && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Conflito com reserva(s) já aprovada(s) neste veículo:
            <ul className="ml-4 list-disc">
              {conflitos.map((c) => (
                <li key={c.id}>{c.user.nome}: {fmtPeriodo(c)}</li>
              ))}
            </ul>
            Não é possível aprovar enquanto o conflito existir.
          </div>
        )}

        {decidivel && (
          <section className={`grid gap-4 p-6 sm:grid-cols-2 ${cardCls}`}>
            <div>
              <h2 className="mb-2 font-semibold">Aprovar</h2>
              <form action={aprovar.bind(null, id)}>
                {volta}
                <button className={btnCls} disabled={conflitos.length > 0}>
                  {alteracao ? "Aprovar alteração" : "Aprovar solicitação"}
                </button>
              </form>
            </div>
            <form action={rejeitar.bind(null, id)}>
              {volta}
              <Field label={alteracao ? "Rejeitar alteração (mantém a reserva original)" : "Rejeitar — justificativa"}>
                <textarea name="justificativa" required minLength={3} maxLength={300} rows={2} className={inputCls} />
              </Field>
              <button className={`mt-2 ${btnPerigoCls}`}>Rejeitar</button>
            </form>
          </section>
        )}

        {ATIVOS.includes(b.status) && (
          <section className={`p-6 ${cardCls}`}>
            <h2 className="mb-2 font-semibold">Gerenciar</h2>
            <div className="flex flex-wrap items-end gap-4">
              <Link href={`/admin/agendamentos/${id}/editar`} className={btnGhostCls}>Editar dados</Link>
              <form action={cancelarPeloAdmin.bind(null, id)} className="flex flex-wrap items-end gap-2">
                {volta}
                <Field label="Motivo do cancelamento (opcional)">
                  <input name="justificativa" maxLength={300} className={inputCls} />
                </Field>
                <button className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50">
                  Cancelar agendamento
                </button>
              </form>
            </div>
          </section>
        )}
    </div>
  );
}
