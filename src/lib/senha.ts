/** Senha inicial dos usuários criados pelo administrador (a troca é exigida no primeiro acesso). */
export const SENHA_PADRAO = process.env.SENHA_PADRAO || "Comurg@2026";

/**
 * Regra de senha (LGPD / boas práticas): mínimo de 8 caracteres, com letra, número e caractere especial.
 * Retorna a mensagem de erro ou null se a senha é aceitável.
 */
export function validarSenhaForte(senha: string): string | null {
  if (senha.length < 8) return "A senha deve ter ao menos 8 caracteres.";
  if (!/[A-Za-zÀ-ÿ]/.test(senha)) return "A senha deve ter ao menos uma letra.";
  if (!/\d/.test(senha)) return "A senha deve ter ao menos um número.";
  if (!/[^A-Za-zÀ-ÿ0-9]/.test(senha)) return "A senha deve ter ao menos um caractere especial (ex.: @ # $ % !).";
  return null;
}

export const REGRAS_SENHA = "Mínimo de 8 caracteres, com letra, número e caractere especial.";
