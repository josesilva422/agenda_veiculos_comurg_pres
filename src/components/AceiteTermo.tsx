"use client";
import { useRef } from "react";
import { TERMO_PARAGRAFOS, TERMO_TITULO } from "@/lib/termo-texto";

/** "Concordo com o Termo..." com o texto do termo clicável, que abre o termo num pop-up. */
export default function AceiteTermo() {
  const dlg = useRef<HTMLDialogElement>(null);
  return (
    <div className="sm:col-span-2">
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input name="aceiteTermo" type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-marca" />
        <span className="min-w-0 flex-1">
          Concordo com o{" "}
          {/* span (e não button) para o texto quebrar de linha junto com o resto da frase */}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              dlg.current?.showModal();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                dlg.current?.showModal();
              }
            }}
            className="cursor-pointer font-medium text-marca underline underline-offset-2 hover:text-marca-forte"
          >
            Termo de Responsabilidade pelo uso e guarda de veículo
          </span>
        </span>
      </label>

      <dialog
        ref={dlg}
        aria-labelledby="titulo-termo"
        onClick={(e) => {
          if (e.target === dlg.current) dlg.current?.close();
        }}
        className="m-auto max-h-[88vh] w-[min(94vw,40rem)] overflow-y-auto rounded-md border bg-white p-0 shadow-xl backdrop:bg-slate-900/50"
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b bg-white px-5 py-3">
          <h2 id="titulo-termo" className="text-base font-semibold">{TERMO_TITULO}</h2>
          <button type="button" onClick={() => dlg.current?.close()} className="shrink-0 text-sm text-slate-600 hover:underline">
            Fechar
          </button>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-slate-700">
          {TERMO_PARAGRAFOS.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>
      </dialog>
    </div>
  );
}
