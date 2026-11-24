import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./prisma";
import { verificarAmbiente } from "./env";
import { estaBloqueado, limparFalhas, origemDaRequisicao, registrarFalha } from "./rate-limit";
import { SENHA_PADRAO_ANTIGA, versaoSenha } from "./senha";

verificarAmbiente();

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: { login: {}, password: {} },
      async authorize(credentials, req) {
        if (!credentials?.login || !credentials.password) return null;
        // entra com e-mail ou matrícula
        const login = credentials.login.trim();
        const chave = login.toLowerCase();
        const origem = origemDaRequisicao(req?.headers);
        if (await estaBloqueado(chave, origem)) throw new Error("BLOQUEADO");
        const user = await prisma.user.findUnique({ where: login.includes("@") ? { email: chave } : { matricula: login } });
        const ok = user && user.ativo && (await bcrypt.compare(credentials.password, user.senhaHash));
        if (!user || !ok) {
          await registrarFalha(chave, origem);
          return null;
        }
        // a antiga senha padrão era igual para todos e conhecida: não serve mais para o primeiro acesso
        if (user.trocarSenha && credentials.password === SENHA_PADRAO_ANTIGA) throw new Error("SENHA_EXPIRADA");
        await limparFalhas(chave, origem);
        return {
          id: user.id, name: user.nome, email: user.email, role: user.role,
          trocarSenha: user.trocarSenha, sv: versaoSenha(user.senhaHash),
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.trocarSenha = user.trocarSenha;
        token.sv = user.sv;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.trocarSenha = token.trocarSenha;
        session.user.sv = token.sv;
      }
      return session;
    },
  },
};

/**
 * Sessão do usuário logado, conferida no banco a cada requisição (uma consulta por requisição).
 * O token (JWT) dura 8 h, mas quem foi desativado deixa de ter acesso na hora, mudanças de perfil
 * ou de "trocar senha" valem imediatamente, e trocar ou redefinir a senha encerra as sessões abertas
 * com a senha anterior (a "versão da senha" do token deixa de bater). Retorna null se não há sessão válida.
 */
export const getSession = cache(async () => {
  const s = await getServerSession(authOptions);
  if (!s?.user) return null;
  const u = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { ativo: true, role: true, nome: true, email: true, trocarSenha: true, senhaHash: true },
  });
  if (!u || !u.ativo || s.user.sv !== versaoSenha(u.senhaHash)) return null;
  return { ...s, user: { ...s.user, role: u.role, name: u.nome, email: u.email, trocarSenha: u.trocarSenha } };
});

/** Sessão para as rotas de API: além de válida, exige que a senha provisória já tenha sido trocada. */
export async function sessaoApi() {
  const s = await getSession();
  return s && !s.user.trocarSenha ? s : null;
}

export async function requireUser(opcoes: { permitirTrocaSenha?: boolean } = {}) {
  const s = await getSession();
  if (!s?.user) redirect("/login");
  // senha provisória: nada funciona até criar a senha própria
  if (s.user.trocarSenha && !opcoes.permitirTrocaSenha) redirect("/trocar-senha");
  return s.user;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") redirect("/usuario");
  return u;
}
