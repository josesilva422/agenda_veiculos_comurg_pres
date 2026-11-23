import Link from "next/link";
import type { Booking, Vehicle } from "@prisma/client";
import { Field, btnCls, btnGhostCls, cardCls, inputCls } from "@/components/ui";
import { toInputDateTime } from "@/lib/datetime";
import AceiteTermo from "./AceiteTermo";
import CamposPeriodo from "./CamposPeriodo";

/** Só o que o formulário usa do veículo (permite mandar listas enxutas para o pop-up). */
export type VeiculoOpcao = Pick<Vehicle, "id" | "prefixo" | "placa" | "tipo" | "lotacao">;

export default function BookingForm({
  action,
  vehicles,
  booking,
  backHref = "/usuario/agendamentos",
  extraFields,
  defaults,
  retorno,
  semCartao = false,
  exigirTermo = false,
}: {
  defaults?: { vehicleId?: string; inicio?: string; fim?: string };
  action: (fd: FormData) => Promise<void>;
  vehicles: VeiculoOpcao[];
  booking?: Booking;
  backHref?: string;
  extraFields?: React.ReactNode;
  /** Página para onde a ação volta (sucesso ou erro). Usado pelo pop-up de novo agendamento. */
  retorno?: string;
  /** Sem borda e sem espaçamento próprios (quando já está dentro de um pop-up). */
  semCartao?: boolean;
  /** Mostra "Concordo com o Termo de Responsabilidade" (marcar é obrigatório). Só para o solicitante. */
  exigirTermo?: boolean;
}) {
  return (
    <form action={action} className={`grid gap-4 sm:grid-cols-2 ${semCartao ? "" : `max-w-xl p-6 ${cardCls}`}`}>
      {retorno && <input type="hidden" name="retorno" value={retorno} />}
      {extraFields}
      <Field label="Veículo" className="sm:col-span-2">
        <select name="vehicleId" required defaultValue={booking?.vehicleId ?? defaults?.vehicleId ?? ""} className={inputCls}>
          <option value="" disabled>
            Selecione…
          </option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.placa} — {v.tipo}
            </option>
          ))}
        </select>
      </Field>
      <CamposPeriodo
        inicio={booking ? toInputDateTime(booking.inicio) : defaults?.inicio}
        fim={booking ? toInputDateTime(booking.fim) : defaults?.fim}
      />
      <Field label="Destino / motivo" className="sm:col-span-2">
        <input name="destino" required maxLength={200} defaultValue={booking?.destino} className={inputCls} />
      </Field>
      <Field label="Motorista" className="sm:col-span-2">
        <input name="motorista" maxLength={100} defaultValue={booking?.motorista ?? ""} placeholder="Nome de quem vai dirigir" className={inputCls} />
      </Field>
      <Field label="Nº de passageiros (incluindo motorista)">
        <input name="passageiros" type="number" min={1} required defaultValue={booking?.passageiros ?? 1} className={inputCls} />
      </Field>
      {exigirTermo && <AceiteTermo />}
      <div className="flex gap-2 sm:col-span-2">
        <button className={btnCls}>
          {booking ? "Salvar alteração" : "Enviar solicitação"}
        </button>
        <Link href={backHref} className={btnGhostCls}>
          {semCartao ? "Cancelar" : "Voltar"}
        </Link>
      </div>
    </form>
  );
}
