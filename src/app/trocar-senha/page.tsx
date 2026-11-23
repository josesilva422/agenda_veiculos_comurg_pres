import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { cardCls } from "@/components/ui";
import { APP } from "@/lib/config";
import { REGRAS_SENHA } from "@/lib/senha";
import FormTrocarSenha from "./FormTrocarSenha";

export default async function TrocarSenhaPage() {
  const u = await requireUser({ permitirTrocaSenha: true });
  const user = await prisma.user.findUnique({ where: { id: u.id }, select: { trocarSenha: true } });
  if (!user?.trocarSenha) redirect(u.role === "ADMIN" ? "/admin" : "/usuario");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center p-4">
      <div className="mb-5 border-l-4 border-marca pl-3">
        <h1 className="text-lg font-semibold text-marca">{APP.nome}</h1>
        <p className="text-sm text-slate-600">Crie sua senha de acesso</p>
      </div>
      <div className={`space-y-4 p-5 ${cardCls}`}>
        <p className="text-sm text-slate-700">
          No primeiro acesso é preciso trocar a senha padrão por uma senha só sua.
        </p>
        <p className="rounded bg-slate-50 p-2 text-xs text-slate-600">{REGRAS_SENHA}</p>
        <FormTrocarSenha />
      </div>
    </main>
  );
}
