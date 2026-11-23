import { describe, expect, it } from "vitest";
import { verificarAmbiente } from "./env";

const prod = (e: Record<string, string>) => ({ NODE_ENV: "production", ...e }) as unknown as NodeJS.ProcessEnv;
const forte = "x".repeat(40);

describe("verificarAmbiente", () => {
  it("ignora fora de produção e durante o build", () => {
    expect(() => verificarAmbiente({ NODE_ENV: "development" } as unknown as NodeJS.ProcessEnv)).not.toThrow();
    expect(() => verificarAmbiente(prod({ NEXT_PHASE: "phase-production-build" }))).not.toThrow();
  });
  it("recusa segredo fraco, de exemplo ou ausente", () => {
    const base = { NEXTAUTH_URL: "https://a.com", DATABASE_URL: "file:/d.db" };
    expect(() => verificarAmbiente(prod({ ...base }))).toThrow(/NEXTAUTH_SECRET/);
    expect(() => verificarAmbiente(prod({ ...base, NEXTAUTH_SECRET: "curta" }))).toThrow(/NEXTAUTH_SECRET/);
    expect(() => verificarAmbiente(prod({ ...base, NEXTAUTH_SECRET: "troque-esta-chave-em-producao-dev-only-xxxxx" }))).toThrow(/NEXTAUTH_SECRET/);
  });
  it("aceita configuração completa", () => {
    expect(() =>
      verificarAmbiente(prod({ NEXTAUTH_SECRET: forte, NEXTAUTH_URL: "https://a.com", DATABASE_URL: "file:/d.db" })),
    ).not.toThrow();
  });
  it("na Vercel exige banco PostgreSQL", () => {
    const base = { NEXTAUTH_SECRET: forte, NEXTAUTH_URL: "https://a.com", VERCEL: "1" };
    expect(() => verificarAmbiente(prod({ ...base, DATABASE_URL: "file:/d.db" }))).toThrow(/PostgreSQL/);
    expect(() => verificarAmbiente(prod({ ...base, DATABASE_URL: "postgresql://u:p@h:6543/db" }))).not.toThrow();
  });
});
