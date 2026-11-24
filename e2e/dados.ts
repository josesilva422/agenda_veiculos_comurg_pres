/** Pessoas do banco de testes (veja seed.ts). */
export const PESSOAS = {
  admin: { nome: "Admin E2E", email: "admin@e2e.test", matricula: "E-0001", senha: "Admin@E2E-2026", role: "ADMIN" as const, setor: "Gerência" },
  ana: { nome: "Ana Teste", email: "ana@e2e.test", matricula: "E-1001", senha: "Usuario@E2E-1", role: "USER" as const, setor: "Operações" },
  bruno: { nome: "Bruno Teste", email: "bruno@e2e.test", matricula: "E-1002", senha: "Usuario@E2E-2", role: "USER" as const, setor: "Compras" },
};

export const VEICULO = { prefixo: "VTR-E2E", placa: "EEE1E11" };
