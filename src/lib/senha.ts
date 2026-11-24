import { createHash, randomInt } from "node:crypto";

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

// sem letras e números que se confundem ao ditar ou copiar (l, I, O, 0, 1)
const LETRAS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITOS = "23456789";
const sortear = (fonte: string, n: number) => Array.from({ length: n }, () => fonte[randomInt(fonte.length)]).join("");

/**
 * Senha provisória aleatória, diferente para cada usuário (ex.: "Hqtz-4829-Mwbe").
 * Gerada pelo sistema ao cadastrar ou redefinir; o usuário troca no primeiro acesso.
 */
export function gerarSenhaProvisoria(): string {
  return `${sortear(LETRAS, 4)}-${sortear(DIGITOS, 4)}-${sortear(LETRAS, 4)}`;
}

/**
 * Senha padrão usada antes das senhas provisórias aleatórias. Era igual para todos e conhecida,
 * por isso não é mais aceita no primeiro acesso: quem ainda está com ela precisa de uma senha nova do administrador.
 */
export const SENHA_PADRAO_ANTIGA = process.env.SENHA_PADRAO || "Comurg@2026";

/**
 * "Versão" da senha guardada no login (token). Muda quando a senha muda, e com isso
 * as sessões abertas com a senha anterior deixam de valer. Não permite descobrir a senha.
 */
export const versaoSenha = (senhaHash: string) => createHash("sha256").update(senhaHash).digest("base64url").slice(0, 16);
