import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { voltar } from "@/lib/action";
import { Titulo } from "@/components/ui";
import BookingForm from "@/components/BookingForm";
import { podeModificar } from "@/lib/booking-rules";
import { editarAgendamento } from "../actions";

export default async function EditarAgendamento({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.userId !== u.id) notFound();
  if (!podeModificar(booking.status, booking.inicio)) {
    voltar("/usuario/agendamentos", { erro: "Este agendamento não pode mais ser editado." });
  }
  // mantém o veículo atual na lista mesmo se deixou de estar ativo
  const vehicles = await prisma.vehicle.findMany({
    where: { OR: [{ status: "ATIVO" }, { id: booking.vehicleId }] },
    orderBy: { prefixo: "asc" },
  });

  return (
    <div>
      <Titulo>Editar solicitação</Titulo>
      {booking.status !== "PENDENTE" && (
        <p className="mb-4 max-w-xl rounded bg-blue-50 p-3 text-sm text-blue-800">
          Esta reserva já foi aprovada. Ao salvar, o administrador será avisado e precisará aprovar a alteração.
        </p>
      )}
      <BookingForm action={editarAgendamento.bind(null, id)} vehicles={vehicles} booking={booking} />
    </div>
  );
}
