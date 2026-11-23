"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import BookingForm, { type VeiculoOpcao } from "./BookingForm";
import { Field, btnCls, inputCls } from "./ui";
import { prefill } from "@/lib/prefill";

/**
 * Botão "Novo agendamento" + pop-up com o formulário.
 * O pop-up abre quando a URL tem ?novo=1 (assim o calendário também consegue abri-lo, já com
 * início e fim preenchidos) e é fechado removendo esse parâmetro.
 * A ação volta para a mesma página: erro => pop-up continua aberto com a mensagem; sucesso => fecha.
 */
export default function NovoAgendamento({
  action,
  vehicles,
  users,
}: {
  action: (fd: FormData) => Promise<void>;
  vehicles: VeiculoOpcao[];
  /** Só o administrador escolhe o solicitante. */
  users?: { id: string; label: string }[];
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const ref = useRef<HTMLDialogElement>(null);
  const aberto = sp.get("novo") === "1";
  const erro = sp.get("erro");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  // Esc ou clique fora fecham o pop-up: tira ?novo=1 da URL
  const fechar = () => {
    if (new URLSearchParams(window.location.search).get("novo")) router.replace(path);
  };

  const defaults = prefill({
    inicio: sp.get("inicio") ?? undefined,
    fim: sp.get("fim") ?? undefined,
    vehicleId: sp.get("vehicleId") ?? undefined,
  });

  return (
    <>
      <button type="button" onClick={() => router.push(`${path}?novo=1`)} className={btnCls}>
        Novo agendamento
      </button>

      <dialog
        ref={ref}
        aria-labelledby="titulo-novo-agendamento"
        onClose={fechar}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="m-auto max-h-[92vh] w-[min(94vw,38rem)] overflow-y-auto rounded-md border bg-white p-0 shadow-xl backdrop:bg-slate-900/40"
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 id="titulo-novo-agendamento" className="text-base font-semibold">
            Novo agendamento
          </h2>
          <Link href={path} replace className="text-sm text-slate-600 underline-offset-2 hover:underline">
            Fechar
          </Link>
        </div>
        <div className="p-5">
          {users && <p className="mb-3 text-sm text-slate-600">O agendamento criado pelo administrador já nasce aprovado.</p>}
          {aberto && erro && (
            <p role="alert" className="mb-4 rounded border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
              {erro}
            </p>
          )}
          {/* só existe enquanto aberto: cada abertura começa com um formulário novo */}
          {aberto && (
            <BookingForm
              action={action}
              vehicles={vehicles}
              defaults={defaults}
              retorno={path}
              backHref={path}
              semCartao
              exigirTermo={!users}
              extraFields={
                users && (
                  <Field label="Solicitante" className="sm:col-span-2">
                    <select name="userId" required defaultValue="" className={inputCls}>
                      <option value="" disabled>Selecione…</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.label}</option>
                      ))}
                    </select>
                  </Field>
                )
              }
            />
          )}
        </div>
      </dialog>
    </>
  );
}
