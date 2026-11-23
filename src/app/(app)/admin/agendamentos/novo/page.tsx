import { prisma } from "@/lib/prisma";
import { Field, Titulo, inputCls } from "@/components/ui";
import BookingForm from "@/components/BookingForm";
import { prefill } from "@/lib/prefill";
import { criarPeloAdmin } from "../actions";

export default async function NovoAgendamentoAdmin({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string; vehicleId?: string }>;
}) {
  const [vehicles, users] = await Promise.all([
    prisma.vehicle.findMany({ where: { status: "ATIVO" }, orderBy: { prefixo: "asc" } }),
    prisma.user.findMany({ where: { ativo: true }, select: { id: true, nome: true, setor: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div>
      <Titulo sub="O agendamento criado pelo administrador já nasce aprovado.">Novo agendamento</Titulo>
      <BookingForm
        action={criarPeloAdmin}
        vehicles={vehicles}
        backHref="/admin/agendamentos"
        defaults={prefill(await searchParams)}
        extraFields={
          <Field label="Solicitante" className="sm:col-span-2">
            <select name="userId" required defaultValue="" className={inputCls}>
              <option value="" disabled>Selecione…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}{u.setor ? ` (${u.setor})` : ""}</option>
              ))}
            </select>
          </Field>
        }
      />
    </div>
  );
}
