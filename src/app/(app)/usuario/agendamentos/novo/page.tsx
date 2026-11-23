import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Titulo } from "@/components/ui";
import BookingForm from "@/components/BookingForm";
import { prefill } from "@/lib/prefill";
import { criarAgendamento } from "../actions";

export default async function NovoAgendamento({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string; vehicleId?: string }>;
}) {
  await requireUser();
  const vehicles = await prisma.vehicle.findMany({ where: { status: "ATIVO" }, orderBy: { prefixo: "asc" } });

  return (
    <div>
      <Titulo>Nova solicitação de veículo</Titulo>
      <BookingForm action={criarAgendamento} vehicles={vehicles} defaults={prefill(await searchParams)} exigirTermo />
    </div>
  );
}
