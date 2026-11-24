import { cookies } from "next/headers";

/** Cookie que leva a senha provisória recém-gerada da ação para a tela do administrador (dura 2 minutos). */
export const COOKIE_SENHA_PROVISORIA = "senha-provisoria";

/** Senha provisória gerada há pouco para este usuário, se houver (só no navegador de quem a gerou). */
export async function lerSenhaProvisoria(userId: string): Promise<string | null> {
  const bruto = (await cookies()).get(COOKIE_SENHA_PROVISORIA)?.value;
  if (!bruto) return null;
  try {
    const v = JSON.parse(bruto) as { userId?: unknown; senha?: unknown };
    return v.userId === userId && typeof v.senha === "string" ? v.senha : null;
  } catch {
    return null;
  }
}
