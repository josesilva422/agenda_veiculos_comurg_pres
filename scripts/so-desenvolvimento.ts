/**
 * Trava para scripts que criam usuários de teste (seed): recusa rodar em produção ou num banco PostgreSQL
 * (Supabase), onde senhas conhecidas como "admin123" virariam uma porta de entrada.
 */
export function somenteDesenvolvimento(script: string) {
  const url = process.env.DATABASE_URL ?? "";
  if (process.env.NODE_ENV === "production" || /^postgres(ql)?:\/\//.test(url)) {
    throw new Error(`${script} cria usuários de teste e só pode rodar no banco local de desenvolvimento.`);
  }
}
