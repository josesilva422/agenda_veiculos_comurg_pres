import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./prisma";
import { verificarAmbiente } from "./env";
import { estaBloqueado, limparFalhas, registrarFalha } from "./rate-limit";

verificarAmbiente();

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: { login: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.login || !credentials.password) return null;
        // entra com e-mail ou matrícula
        const login = credentials.login.trim();
        const chave = login.toLowerCase();
        if (await estaBloqueado(chave)) throw new Error("BLOQUEADO");
        const user = await prisma.user.findUnique({ where: login.includes("@") ? { email: chave } : { matricula: login } });
        const ok = user && user.ativo && (await bcrypt.compare(credentials.password, user.senhaHash));
        if (!user || !ok) {
          await registrarFalha(chave);
          return null;
        }
        await limparFalhas(chave);
        return { id: user.id, name: user.nome, email: user.email, role: user.role, trocarSenha: user.trocarSenha };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.trocarSenha = user.trocarSenha;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.trocarSenha = token.trocarSenha;
      }
      return session;
    },
  },
};

/**
 * Sessão do usuário logado, conferida no banco a cada requisição (uma consulta por requisição).
 * O token (JWT) dura 8 h, mas quem foi desativado deixa de ter acesso na hora, e mudanças de perfil
 * ou de "trocar senha" valem imediatamente. Retorna null se não há sessão válida.
 */
export const getSession = cache(async () => {
  const s = await getServerSession(authOptions);
  if (!s?.user) return null;
  const u = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { ativo: true, role: true, nome: true, email: true, trocarSenha: true },
  });
  if (!u || !u.ativo) return null;
  return { ...s, user: { ...s.user, role: u.role, name: u.nome, email: u.email, trocarSenha: u.trocarSenha } };
});

export async function requireUser(opcoes: { permitirTrocaSenha?: boolean } = {}) {
  const s = await getSession();
  if (!s?.user) redirect("/login");
  // senha padrão: nada funciona até criar a senha própria
  if (s.user.trocarSenha && !opcoes.permitirTrocaSenha) redirect("/trocar-senha");
  return s.user;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") redirect("/usuario");
  return u;
}
