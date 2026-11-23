import { prisma } from "@/lib/prisma";
import CalendarView from "@/components/CalendarView";
import NovoAgendamento from "@/components/NovoAgendamento";
import { Titulo } from "@/components/ui";
import { criarAgendamento } from "./agendamentos/actions";

export default async function UserHome() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: "ATIVO" },
    select: { id: true, prefixo: true, placa: true, tipo: true, lotacao: true },
    orderBy: { prefixo: "asc" },
  });
  return (
    <div>
      <Titulo acao={<NovoAgendamento action={criarAgendamento} vehicles={vehicles} />}>Calendário de veículos</Titulo>
      <CalendarView role="USER" vehicles={vehicles.map((v) => ({ id: v.id, label: `${v.placa} — ${v.tipo}` }))} />
    </div>
  );
}
