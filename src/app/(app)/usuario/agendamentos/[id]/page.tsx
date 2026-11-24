import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { voltar } from "@/lib/action";
import { Titulo } from "@/components/ui";
import BookingForm from "@/components/BookingForm";
import { podeModificar } from "@/lib/booking-rules";
import { lerAlteracao } from "@/lib/booking-service";
import { editarAgendamento } from "../actions";

export default async function EditarAgendamento({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.userId !== u.id) notFound();
  if (!podeModificar(booking.status, booking.inicio)) {
    voltar("/usuario/agendamentos", { erro: "Este agendamento não pode mais ser editado." });
  }
  const pedido = lerAlteracao(booking);
  // mantém o veículo atual (e o do pedido) na lista mesmo se deixou de estar ativo
  const vehicles = await prisma.vehicle.findMany({
    where: { OR: [{ status: "ATIVO" }, { id: { in: [booking.vehicleId, ...(pedido ? [pedido.vehicleId] : [])] } }] },
    orderBy: { prefixo: "asc" },
  });

  return (
    <div>
      <Titulo>Editar solicitação</Titulo>
      {booking.status !== "PENDENTE" && (
        <p className="mb-4 max-w-xl rounded bg-blue-50 p-3 text-sm text-blue-800">
          {pedido
            ? "Você já pediu uma alteração (mostrada abaixo), que aguarda o administrador. Pode ajustá-la; voltar aos dados aprovados retira o pedido."
            : "Esta reserva já foi aprovada. Ao salvar, o administrador precisará aprovar a alteração; até lá, a reserva aprovada continua valendo."}
        </p>
      )}
      <BookingForm action={editarAgendamento.bind(null, id)} vehicles={vehicles} booking={pedido ? { ...booking, ...pedido } : booking} />
    </div>
  );
}
