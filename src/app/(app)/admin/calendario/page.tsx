import { prisma } from "@/lib/prisma";
import CalendarView from "@/components/CalendarView";
import NovoAgendamento from "@/components/NovoAgendamento";
import DecidirAgendamento from "@/components/DecidirAgendamento";
import { Titulo } from "@/components/ui";
import { criarPeloAdmin } from "../agendamentos/actions";

export default async function CalendarioAdmin({ searchParams }: { searchParams: Promise<{ decidir?: string }> }) {
  const { decidir } = await searchParams;
  const [vehicles, users] = await Promise.all([
    prisma.vehicle.findMany({
      select: { id: true, prefixo: true, placa: true, tipo: true, lotacao: true, status: true },
      orderBy: { prefixo: "asc" },
    }),
    prisma.user.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true, setor: true } }),
  ]);
  return (
    <div>
      <Titulo
        acao={
          <NovoAgendamento
            action={criarPeloAdmin}
            vehicles={vehicles.filter((v) => v.status === "ATIVO")}
            users={users.map((u) => ({ id: u.id, label: `${u.nome}${u.setor ? ` (${u.setor})` : ""}` }))}
          />
        }
      >
        Calendário
      </Titulo>
      <CalendarView
        role="ADMIN"
        vehicles={vehicles.map((v) => ({ id: v.id, label: `${v.placa} — ${v.tipo}` }))}
        users={users.map((u) => ({ id: u.id, label: u.nome }))}
      />
      <DecidirAgendamento id={decidir} retorno="/admin/calendario" />
    </div>
  );
}
