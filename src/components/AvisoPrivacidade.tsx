"use client";
import { useRef } from "react";

/** Link "Aviso de privacidade (LGPD)" centralizado; o texto completo abre em um pop-up. */
export default function AvisoPrivacidade() {
  const dlg = useRef<HTMLDialogElement>(null);
  return (
    <div className="mt-4 text-center">
      <button
        type="button"
        onClick={() => dlg.current?.showModal()}
        className="text-xs font-medium text-marca underline underline-offset-2 hover:text-marca-forte"
      >
        Aviso de privacidade LGPD
      </button>

      <dialog
        ref={dlg}
        aria-labelledby="titulo-privacidade"
        onClick={(e) => {
          if (e.target === dlg.current) dlg.current?.close();
        }}
        className="m-auto max-h-[88vh] w-[min(94vw,32rem)] overflow-y-auto rounded-md border bg-white p-0 text-left shadow-xl backdrop:bg-slate-900/50"
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b bg-white px-5 py-3">
          <h2 id="titulo-privacidade" className="text-base font-semibold">Aviso de privacidade (LGPD)</h2>
          <button type="button" onClick={() => dlg.current?.close()} className="shrink-0 text-sm text-slate-600 hover:underline">
            Fechar
          </button>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-slate-700">
          <p>
            Os dados pessoais informados neste sistema (nome, matrícula, telefone, cargo, lotação e CNH) são usados apenas para o
            controle de uso dos veículos da Comurg.
          </p>
          <p>Eles ficam acessíveis somente a quem precisa deles para essa finalidade.</p>
          <p>Para dúvidas ou pedidos sobre os seus dados, procure o administrador do sistema.</p>
        </div>
      </dialog>
    </div>
  );
}
