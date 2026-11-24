import { describe, expect, it } from "vitest";
import { JANELA_MS, LIMITE, bloqueado, chaves, expirou, origemDaRequisicao } from "./rate-limit";

const reg = (falhas: number, desde: number) => ({ falhas, desde: new Date(desde) });

describe("rate-limit de login (regras)", () => {
  it("bloqueia ao atingir o máximo de falhas dentro da janela", () => {
    const t0 = 1_000_000;
    expect(bloqueado(null, t0, LIMITE.conta)).toBe(false);
    expect(bloqueado(reg(LIMITE.conta - 1, t0), t0 + 1000, LIMITE.conta)).toBe(false);
    expect(bloqueado(reg(LIMITE.conta, t0), t0 + 1000, LIMITE.conta)).toBe(true);
  });

  it("libera depois que a janela expira", () => {
    const t0 = 1_000_000;
    expect(expirou(reg(LIMITE.conta, t0), t0 + JANELA_MS)).toBe(false);
    expect(expirou(reg(LIMITE.conta, t0), t0 + JANELA_MS + 1)).toBe(true);
    expect(bloqueado(reg(LIMITE.conta, t0), t0 + JANELA_MS + 1, LIMITE.conta)).toBe(false);
  });

  it("a conta é contada por origem: outra origem não trava a mesma conta", () => {
    expect(chaves("Admin@X.com ", "1.1.1.1").conta).toBe("conta:admin@x.com|1.1.1.1");
    expect(chaves("admin@x.com", "1.1.1.1").conta).not.toBe(chaves("admin@x.com", "2.2.2.2").conta);
    expect(chaves("a@x.com", "1.1.1.1").origem).toBe(chaves("b@x.com", "1.1.1.1").origem);
  });
});

describe("origemDaRequisicao", () => {
  const h = { "x-forwarded-for": "200.1.2.3, 10.0.0.1" };
  it("sem proxy confiável, ignora o cabeçalho (poderia ser forjado)", () => {
    expect(origemDaRequisicao(h, {} as unknown as NodeJS.ProcessEnv)).toBe("local");
  });
  it("na Vercel ou com TRUST_PROXY=1, usa o primeiro IP do x-forwarded-for", () => {
    expect(origemDaRequisicao(h, { VERCEL: "1" } as unknown as NodeJS.ProcessEnv)).toBe("200.1.2.3");
    expect(origemDaRequisicao({ "x-real-ip": "9.9.9.9" }, { TRUST_PROXY: "1" } as unknown as NodeJS.ProcessEnv)).toBe("9.9.9.9");
  });
});
