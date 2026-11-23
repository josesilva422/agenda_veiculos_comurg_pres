import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ModalDecisao from "@/components/ModalDecisao";
import { Tabela, Titulo, btnCls, linkCls } from "@/components/ui";
import { redefinirSenha, salvarUsuario, toggleUserAtivo } from "./actions";
import UserForm from "./UserForm";

const LISTA = "/admin/usuarios";

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ editar?: string; novo?: string }> }) {
  const { editar, novo } = await searchParams;
  const [usuarios, editando] = await Promise.all([
    prisma.user.findMany({ orderBy: { nome: "asc" } }),
    editar ? prisma.user.findUnique({ where: { id: editar } }) : null,
  ]);
  const abrir = (id: string) => `${LISTA}?editar=${id}`;

  return (
    <div>
      <Titulo acao={<Link href={`${LISTA}?novo=1`} className={btnCls} scroll={false}>Novo usuário</Link>}>Usuários</Titulo>

      {/* celular: lista compacta */}
      <ul className="space-y-2 sm:hidden">
        {usuarios.map((u) => (
          <li key={u.id} className={`flex items-center gap-3 rounded-md border bg-white px-3 py-2.5 ${u.ativo ? "" : "bg-slate-50"}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="break-words text-sm font-medium leading-snug">{u.nome}</span>
                <span
                  className={`shrink-0 rounded px-1.5 text-[11px] ${u.ativo ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {u.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="break-all text-xs text-slate-500">{u.email}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
              <Link href={abrir(u.id)} className="rounded bg-marca-suave px-2.5 py-1.5 text-marca" scroll={false}>Editar</Link>
              <form action={toggleUserAtivo.bind(null, u.id)}>
                <button
                  className={`rounded px-2.5 py-1.5 ${u.ativo ? "bg-slate-100 text-slate-700" : "bg-green-50 text-green-700"}`}
                >
                  {u.ativo ? "Desativar" : "Reativar"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      {/* computador: tabela completa */}
      <div className="max-sm:hidden">
        <Tabela cols={["Nome", "E-mail", "Lotação", "Perfil", "Situação", ""]}>
          {usuarios.map((u) => (
            <tr key={u.id} className={u.ativo ? "" : "opacity-60"}>
              <td className="font-medium">{u.nome}</td>
              <td>{u.email}</td>
              <td>{u.setor ?? "—"}</td>
              <td>{u.role === "ADMIN" ? "Administrador" : "Usuário"}</td>
              <td>{u.ativo ? "Ativo" : "Inativo"}</td>
              <td className="flex justify-end gap-3">
                <Link href={abrir(u.id)} className={linkCls} scroll={false}>Editar</Link>
                <form action={toggleUserAtivo.bind(null, u.id)}>
                  <button className="text-slate-600 hover:underline">{u.ativo ? "Desativar" : "Reativar"}</button>
                </form>
              </td>
            </tr>
          ))}
        </Tabela>
      </div>

      {novo === "1" && !editando && (
        <ModalDecisao param="novo" titulo="Novo usuário">
          <UserForm action={salvarUsuario.bind(null, null)} retorno={LISTA} semCartao />
        </ModalDecisao>
      )}

      {editando && (
        <ModalDecisao key={editando.id} param="editar" titulo="Editar usuário">
          <div className="space-y-5">
            <UserForm action={salvarUsuario.bind(null, editando.id)} user={editando} retorno={LISTA} semCartao />
            <section className="border-t pt-5">
              <h2 className="mb-1 text-base font-semibold">Senha</h2>
              <p className="mb-3 text-sm text-slate-600">
                Volta a senha deste usuário para a senha padrão. No próximo acesso ele será obrigado a criar uma nova.
              </p>
              <form action={redefinirSenha.bind(null, editando.id)}>
                <input type="hidden" name="retorno" value={LISTA} />
                <button className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Redefinir para a senha padrão
                </button>
              </form>
            </section>
          </div>
        </ModalDecisao>
      )}
    </div>
  );
}
