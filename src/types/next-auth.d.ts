import "next-auth";
import "next-auth/jwt";

type Role = "ADMIN" | "USER";

declare module "next-auth" {
  interface User {
    role: Role;
    trocarSenha: boolean;
    /** versão da senha (veja versaoSenha em lib/senha.ts) */
    sv: string;
  }
  interface Session {
    user: { id: string; role: Role; trocarSenha: boolean; sv: string; name?: string | null; email?: string | null };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    trocarSenha: boolean;
    sv: string;
  }
}
