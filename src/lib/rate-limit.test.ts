import { describe, expect, it } from "vitest";
import { JANELA_MS, MAX_FALHAS, bloqueado, expirou } from "./rate-limit";

const reg = (falhas: number, desde: number) => ({ falhas, desde: new Date(desde) });

describe("rate-limit de login (regras)", () => {
  it("bloqueia ao atingir o máximo de falhas dentro da janela", () => {
    const t0 = 1_000_000;
    expect(bloqueado(null, t0)).toBe(false);
    expect(bloqueado(reg(MAX_FALHAS - 1, t0), t0 + 1000)).toBe(false);
    expect(bloqueado(reg(MAX_FALHAS, t0), t0 + 1000)).toBe(true);
  });

  it("libera depois que a janela expira", () => {
    const t0 = 1_000_000;
    expect(expirou(reg(MAX_FALHAS, t0), t0 + JANELA_MS)).toBe(false);
    expect(expirou(reg(MAX_FALHAS, t0), t0 + JANELA_MS + 1)).toBe(true);
    expect(bloqueado(reg(MAX_FALHAS, t0), t0 + JANELA_MS + 1)).toBe(false);
  });
});
