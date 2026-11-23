import Link from "next/link";
import type { Vehicle } from "@prisma/client";
import { Field, btnCls, btnGhostCls, cardCls, inputCls } from "@/components/ui";
import { VEICULO_STATUS, veiculoStatus } from "@/lib/status";

export default function VehicleForm({
  action,
  vehicle,
  retorno,
  semCartao = false,
}: {
  action: (fd: FormData) => Promise<void>;
  vehicle?: Vehicle;
  /** Página para onde a ação volta (pop-up de cadastro/edição). */
  retorno?: string;
  /** Sem borda nem espaçamento próprios (já dentro de um pop-up). */
  semCartao?: boolean;
}) {
  return (
    <form action={action} className={`grid gap-4 sm:grid-cols-2 ${semCartao ? "" : `max-w-xl p-6 ${cardCls}`}`}>
      {retorno && <input type="hidden" name="retorno" value={retorno} />}
      <Field label="Prefixo">
        <input name="prefixo" required defaultValue={vehicle?.prefixo} className={inputCls} />
      </Field>
      <Field label="Placa">
        <input name="placa" required defaultValue={vehicle?.placa} placeholder="ABC1D23" className={inputCls} />
      </Field>
      <Field label="Tipo">
        <input name="tipo" required defaultValue={vehicle?.tipo} placeholder="Sedan, Van, Pickup…" className={inputCls} />
      </Field>
      <Field label="Lotação (passageiros)">
        <input name="lotacao" type="number" min={1} required defaultValue={vehicle?.lotacao ?? 5} className={inputCls} />
      </Field>
      <Field label="Contrato">
        <input name="contrato" maxLength={100} defaultValue={vehicle?.contrato ?? ""} className={inputCls} />
      </Field>
      <Field label="Status">
        <select name="status" defaultValue={vehicle?.status ?? "ATIVO"} className={inputCls}>
          {VEICULO_STATUS.map((s) => (
            <option key={s} value={s}>{veiculoStatus[s].label}</option>
          ))}
        </select>
      </Field>
      <Field label="Observações" className="sm:col-span-2">
        <textarea name="observacao" rows={2} defaultValue={vehicle?.observacao ?? ""} className={inputCls} />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <button className={btnCls}>Salvar</button>
        <Link href="/admin/veiculos" className={btnGhostCls}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
