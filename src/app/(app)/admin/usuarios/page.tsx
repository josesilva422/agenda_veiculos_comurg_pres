import Link from "next/link";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { SENHA_PADRAO_ANTIGA } from "@/lib/senha";
import ModalDecisao from "@/components/ModalDecisao";
import BotaoConfirmar from "@/components/BotaoConfirmar";
import { Tabela, Titulo, btnCls, linkCls } from "@/components/ui";
import { redefinirSenha, salvarUsuario, toggleUserAtivo } from "./actions";
import UserForm from "./UserForm";
import { lerSenhaProvisoria } from "./senha-provisoria";

const LISTA = "/admin/usuarios";
const MSG_DESATIVAR = (nome: string) =>
  `Desativar ${nome}? O acesso é bloqueado na hora e as reservas dele que ainda não começaram serão canceladas (reativar não as devolve).`;

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ editar?: string; novo?: string }> }) {
  const { editar, novo } = await searchParams;
  const admin = await requireAdmin();
  const [usuarios, editando] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, nome: true, email: true, setor: true, role: true, ativo: true },
      orderBy: { nome: "asc" },
    }),
    editar ? prisma.user.findUnique({ where: { id: editar } }) : null,
  ]);
  // senha provisória gerada há pouco (cookie de 2 minutos) e, se o primeiro acesso está pendente,
  // se o usuário ainda está com a antiga senha padrão, que não é mais aceita no login
  const senhaProvisoria = editando ? await lerSenhaProvisoria(editando.id) : null;
  const senhaAntiga = !!editando?.trocarSenha && !senhaProvisoria && (await bcrypt.compare(SENHA_PADRAO_ANTIGA, editando.senhaHash));
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
                {u.ativo ? (
                  <BotaoConfirmar mensagem={MSG_DESATIVAR(u.nome)} className="rounded bg-slate-100 px-2.5 py-1.5 text-slate-700">
                    Desativar
                  </BotaoConfirmar>
                ) : (
                  <button className="rounded bg-green-50 px-2.5 py-1.5 text-green-700">Reativar</button>
                )}
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
                  {u.ativo ? (
                    <BotaoConfirmar mensagem={MSG_DESATIVAR(u.nome)} className="text-slate-600 hover:underline">Desativar</BotaoConfirmar>
                  ) : (
                    <button className="text-slate-600 hover:underline">Reativar</button>
                  )}
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
            {senhaProvisoria && (
              <div role="status" className="rounded border-l-4 border-green-600 bg-green-50 px-3 py-3 text-sm text-green-900">
                <div>
                  Senha provisória de <b>{editando.nome}</b>:{" "}
                  <b className="select-all rounded bg-white px-1.5 py-0.5 font-mono text-base tracking-wide">{senhaProvisoria}</b>
                </div>
                <p className="mt-1 text-xs text-green-800">
                  Anote e entregue ao usuário agora: ela fica visível só por 2 minutos e não pode ser consultada depois.
                  No primeiro acesso ele cria a própria senha.
                </p>
              </div>
            )}
            <UserForm action={salvarUsuario.bind(null, editando.id)} user={editando} retorno={LISTA} semCartao />
            {editando.id !== admin.id && (
              <section className="border-t pt-5">
                <h2 className="mb-1 text-base font-semibold">Senha</h2>
                {senhaAntiga ? (
                  <p className="mb-3 rounded border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Este usuário ainda está com a antiga senha padrão, que não é mais aceita no login. Gere uma senha provisória
                    e entregue a ele.
                  </p>
                ) : (
                  editando.trocarSenha &&
                  !senhaProvisoria && (
                    <p className="mb-3 text-sm text-amber-800">Primeiro acesso pendente: o usuário ainda não trocou a senha provisória.</p>
                  )
                )}
                <p className="mb-3 text-sm text-slate-600">
                  Para quem esqueceu a senha: gera uma senha provisória nova, mostrada aqui. No próximo acesso o usuário é obrigado a
                  criar uma senha própria, e as sessões abertas dele são encerradas.
                </p>
                <form action={redefinirSenha.bind(null, editando.id)}>
                  <button className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Gerar nova senha provisória
                  </button>
                </form>
              </section>
            )}
          </div>
        </ModalDecisao>
      )}
    </div>
  );
}
