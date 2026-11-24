import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Titulo } from "@/components/ui";
import BookingForm from "@/components/BookingForm";
import { ATIVOS } from "@/lib/status";
import { editarPeloAdmin } from "../../actions";

export default async function EditarAgendamentoAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.booking.findUnique({ where: { id }, include: { user: { select: { nome: true } } } });
  if (!b) notFound();
  if (!ATIVOS.includes(b.status)) redirect(`/admin/agendamentos/${id}`);
  // mantém o veículo atual na lista mesmo se deixou de estar ativo
  const vehicles = await prisma.vehicle.findMany({
    where: { OR: [{ status: "ATIVO" }, { id: b.vehicleId }] },
    orderBy: { prefixo: "asc" },
  });

  return (
    <div>
      <Titulo sub={`Solicitante: ${b.user.nome}. O status é mantido e o solicitante será avisado da alteração.`}>
        Editar agendamento
      </Titulo>
      <BookingForm action={editarPeloAdmin.bind(null, id)} vehicles={vehicles} booking={b} backHref={`/admin/agendamentos/${id}`} />
    </div>
  );
}
