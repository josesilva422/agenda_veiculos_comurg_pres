import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Field, btnCls, inputCls } from "@/components/ui";
import { fmtPeriodo } from "@/lib/datetime";
import { pendenciaKm, percurso, referenciasKm, textoPendencia } from "@/lib/km";
import { registrarKm } from "@/app/actions/km";

/** Conteúdo do pop-up em que o solicitante informa o km inicial e final de uma reserva dele. */
export default async function KmSolicitante({ id, retorno }: { id: string; retorno: string }) {
  const u = await requireUser();
  const b = await prisma.booking.findUnique({ where: { id }, include: { vehicle: true } });
  if (!b || b.userId !== u.id) return <p className="text-sm text-slate-600">Agendamento não encontrado.</p>;
  if (b.status !== "APROVADO") {
    return <p className="text-sm text-slate-600">A quilometragem só é registrada em reservas aprovadas.</p>;
  }

  const { anterior } = await referenciasKm(prisma, b);
  const pend = pendenciaKm(b);
  const iniciou = b.inicio <= new Date();
  const km = percurso(b.kmInicial, b.kmFinal);
  // sugestão: o km inicial é o km final da última reserva deste veículo (continua editável)
  const sugerido = b.kmInicial === null && anterior?.deFinal ? anterior.km : null;

  return (
    <div className="space-y-4">
      <div className="rounded border bg-slate-50 p-3 text-sm">
        <div className="font-medium">{b.vehicle.prefixo} — {b.vehicle.placa}</div>
        <div className="text-slate-600">{fmtPeriodo(b)}</div>
        {anterior && (
          <div className="mt-1 text-xs text-slate-500">
            Último km registrado deste veículo: <b>{anterior.km.toLocaleString("pt-BR")}</b>
          </div>
        )}
      </div>

      {pend && (
        <p role="status" className="rounded border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Falta registrar o {textoPendencia(pend)} desta reserva.
        </p>
      )}

      <form action={registrarKm.bind(null, id)} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="retorno" value={retorno} />
        <Field label="Km inicial (hodômetro na retirada)">
          <input name="kmInicial" inputMode="numeric" pattern="[0-9]*" defaultValue={b.kmInicial ?? sugerido ?? ""} placeholder="Ex.: 45230" className={inputCls} />
        </Field>
        <Field label="Km final (hodômetro na devolução)">
          <input
            name="kmFinal"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={b.kmFinal ?? ""}
            placeholder={iniciou ? "Ex.: 45310" : "Disponível após o início do uso"}
            disabled={!iniciou}
            className={`${inputCls} disabled:bg-slate-100`}
          />
        </Field>
        {sugerido !== null && (
          <p className="rounded bg-blue-50 px-3 py-2 text-xs text-blue-900 sm:col-span-2">
            O km inicial veio preenchido com o km final da última reserva deste veículo ({sugerido.toLocaleString("pt-BR")}).
            Confira o hodômetro e corrija se for diferente.
          </p>
        )}
        {km !== null && (
          <p className="text-sm text-slate-600 sm:col-span-2">
            Percurso registrado: <b>{km.toLocaleString("pt-BR")} km</b>
          </p>
        )}
        <p className="text-xs text-slate-500 sm:col-span-2">
          Digite só números, como aparece no hodômetro. O sistema confere com os registros anteriores do veículo; em caso de erro,
          o administrador pode corrigir.
        </p>
        <div className="sm:col-span-2">
          <button className={btnCls}>Salvar quilometragem</button>
        </div>
      </form>
    </div>
  );
}
