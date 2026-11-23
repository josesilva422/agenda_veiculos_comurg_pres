import "next-auth";
import "next-auth/jwt";

type Role = "ADMIN" | "USER";

declare module "next-auth" {
  interface User {
    role: Role;
    trocarSenha: boolean;
  }
  interface Session {
    user: { id: string; role: Role; trocarSenha: boolean; name?: string | null; email?: string | null };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    trocarSenha: boolean;
  }
}
