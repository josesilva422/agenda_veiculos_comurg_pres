"use client";
import { btnCls } from "@/components/ui";

export default function ErroGlobal({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="text-slate-600">Não foi possível concluir a operação. Tente novamente.</p>
      <button onClick={reset} className={btnCls}>
        Tentar novamente
      </button>
    </main>
  );
}
