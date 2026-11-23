"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Pop-up com os dados de uma solicitação. O servidor só renderiza este componente quando a URL tem
 * ?decidir=<id>; fechar remove o parâmetro e mantém o resto da URL (ex.: filtro de status).
 */
export default function ModalDecisao({
  children,
  param = "decidir",
  titulo = "Agendamento",
}: {
  children: ReactNode;
  /** Parâmetro da URL que mantém o pop-up aberto. */
  param?: string;
  titulo?: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const ref = useRef<HTMLDialogElement>(null);
  const erro = sp.get("erro");

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const fechar = () => {
    const q = new URLSearchParams(window.location.search);
    if (!q.has(param)) return;
    q.delete(param);
    q.delete("erro");
    router.replace(q.size ? `${path}?${q}` : path);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="titulo-decisao"
      onClose={fechar}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto max-h-[92vh] w-[min(94vw,44rem)] overflow-y-auto rounded-md border bg-white p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 id="titulo-decisao" className="text-base font-semibold">{titulo}</h2>
        <button type="button" onClick={() => ref.current?.close()} className="text-sm text-slate-600 underline-offset-2 hover:underline">
          Fechar
        </button>
      </div>
      <div className="p-5">
        {erro && (
          <p role="alert" className="mb-4 rounded border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
            {erro}
          </p>
        )}
        {children}
      </div>
    </dialog>
  );
}
