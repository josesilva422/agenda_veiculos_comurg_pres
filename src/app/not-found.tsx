import { btnCls } from "@/components/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="text-slate-600">O endereço não existe ou você não tem acesso a ele.</p>
      <Link href="/" className={btnCls}>
        Voltar ao início
      </Link>
    </main>
  );
}
