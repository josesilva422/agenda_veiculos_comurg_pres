import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { fmtData } from "@/lib/datetime";
import { Dados, Field, Titulo, btnCls, cardCls, inputCls } from "@/components/ui";
import { alterarSenha } from "./actions";

export default async function PerfilPage() {
  const sessao = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessao.id } });

  return (
    <div className="max-w-xl">
      <Titulo>Meu perfil</Titulo>
      <div className="space-y-6">
        <Dados
          linhas={[
            ["Nome", user.nome],
            ["E-mail", user.email],
            ["Matrícula", user.matricula ?? "—"],
            ["Telefone", user.telefone ?? "—"],
            ["Cargo", user.cargo ?? "—"],
            ["Lotação", user.setor ?? "—"],
            ["Contato", user.contato ?? "—"],
            ["CNH", user.cnh ?? "—"],
            ["Validade da CNH", fmtData(user.cnhValidade)],
          ]}
        />
        <section className={`p-6 ${cardCls}`}>
          <h2 className="mb-3 text-base font-semibold">Alterar senha</h2>
          <form action={alterarSenha} className="grid gap-3">
            <Field label="Senha atual">
              <input name="atual" type="password" required autoComplete="current-password" className={inputCls} />
            </Field>
            <Field label="Nova senha (8+ caracteres, com letra, número e caractere especial)">
              <input name="nova" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
            </Field>
            <Field label="Confirmar nova senha">
              <input name="confirmar" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
            </Field>
            <div>
              <button className={btnCls}>Alterar senha</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
