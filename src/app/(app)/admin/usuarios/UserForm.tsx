import Link from "next/link";
import type { User } from "@prisma/client";
import { Field, btnCls, btnGhostCls, cardCls, inputCls } from "@/components/ui";
import { toInputDate } from "@/lib/datetime";

export default function UserForm({
  action,
  user,
  retorno,
  semCartao = false,
}: {
  action: (fd: FormData) => Promise<void>;
  user?: User;
  /** Página para onde a ação volta (usado no pop-up de edição). */
  retorno?: string;
  /** Sem borda nem espaçamento próprios (já dentro de um pop-up). */
  semCartao?: boolean;
}) {
  return (
    <form action={action} className={`grid gap-4 sm:grid-cols-2 ${semCartao ? "" : `max-w-2xl p-6 ${cardCls}`}`}>
      {retorno && <input type="hidden" name="retorno" value={retorno} />}
      <Field label="Nome completo">
        <input name="nome" required defaultValue={user?.nome} className={inputCls} />
      </Field>
      <Field label="E-mail">
        <input name="email" type="email" required defaultValue={user?.email} className={inputCls} />
      </Field>
      <Field label="Perfil">
        <select name="role" defaultValue={user?.role ?? "USER"} className={inputCls}>
          <option value="USER">Usuário</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </Field>
      <Field label="Matrícula">
        <input name="matricula" required defaultValue={user?.matricula ?? ""} className={inputCls} />
      </Field>
      <Field label="Telefone">
        <input name="telefone" type="tel" required defaultValue={user?.telefone ?? ""} className={inputCls} />
      </Field>
      <Field label="Cargo">
        <input name="cargo" required defaultValue={user?.cargo ?? ""} className={inputCls} />
      </Field>
      <Field label="Lotação">
        <input name="setor" required defaultValue={user?.setor ?? ""} className={inputCls} />
      </Field>
      <Field label="Contato (ramal, celular ou e-mail alternativo)" className="sm:col-span-2">
        <input name="contato" required defaultValue={user?.contato ?? ""} className={inputCls} />
      </Field>
      <Field label="CNH (número, opcional)">
        <input name="cnh" defaultValue={user?.cnh ?? ""} className={inputCls} />
      </Field>
      <Field label="Validade da CNH (opcional)">
        <input name="cnhValidade" type="date" defaultValue={toInputDate(user?.cnhValidade)} className={inputCls} />
      </Field>
      {!user && (
        <p className="rounded bg-slate-50 p-2 text-xs text-slate-600 sm:col-span-2">
          A senha inicial é a senha padrão do sistema. No primeiro acesso, o usuário será obrigado a trocá-la.
          O login pode ser feito com o e-mail ou com a matrícula.
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <button className={btnCls}>Salvar</button>
        <Link href="/admin/usuarios" className={btnGhostCls}>
          Voltar
        </Link>
      </div>
    </form>
  );
}
