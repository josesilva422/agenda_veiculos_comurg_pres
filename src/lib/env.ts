const PADROES_FRACOS = ["troque-esta-chave", "changeme", "secret"];

/** Em produção, recusa iniciar com configuração insegura. Não roda durante o build. */
export function verificarAmbiente(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "production" || env.NEXT_PHASE === "phase-production-build") return;
  const erros: string[] = [];
  const s = env.NEXTAUTH_SECRET ?? "";
  if (s.length < 32 || PADROES_FRACOS.some((p) => s.toLowerCase().includes(p))) {
    erros.push("NEXTAUTH_SECRET ausente, curto (<32) ou de exemplo");
  }
  if (!env.NEXTAUTH_URL) erros.push("NEXTAUTH_URL não definida");
  if (!env.DATABASE_URL) erros.push("DATABASE_URL não definida");
  // na Vercel o disco não é permanente: o banco precisa ser um serviço externo (PostgreSQL)
  if (env.VERCEL && !/^postgres(ql)?:\/\//.test(env.DATABASE_URL ?? "")) {
    erros.push("DATABASE_URL deve ser uma conexão PostgreSQL (Supabase)");
  }
  if (erros.length) throw new Error(`Configuração inválida para produção: ${erros.join("; ")}.`);
}
