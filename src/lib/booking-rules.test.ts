import { describe, expect, it } from "vitest";
import { overlaps, podeModificar, validateWindow } from "./booking-rules";
import { parseLocalBr, toInputDateTime } from "./datetime";

const d = (s: string) => new Date(s);
const agora = d("2026-11-20T12:00:00Z");

describe("overlaps", () => {
  const a = { inicio: d("2026-11-21T10:00:00Z"), fim: d("2026-11-21T12:00:00Z") };
  it("detecta sobreposição parcial e total", () => {
    expect(overlaps(a, { inicio: d("2026-11-21T11:00:00Z"), fim: d("2026-11-21T13:00:00Z") })).toBe(true);
    expect(overlaps(a, { inicio: d("2026-11-21T10:30:00Z"), fim: d("2026-11-21T11:00:00Z") })).toBe(true);
  });
  it("encostar não é conflito", () => {
    expect(overlaps(a, { inicio: d("2026-11-21T12:00:00Z"), fim: d("2026-11-21T14:00:00Z") })).toBe(false);
    expect(overlaps(a, { inicio: d("2026-11-21T08:00:00Z"), fim: d("2026-11-21T10:00:00Z") })).toBe(false);
  });
});

describe("validateWindow", () => {
  it("rejeita fim <= início", () => {
    expect(validateWindow(d("2026-11-21T10:00:00Z"), d("2026-11-21T10:00:00Z"), agora, 30)).toMatch(/posterior/);
  });
  it("rejeita passado e falta de antecedência", () => {
    expect(validateWindow(d("2026-11-20T11:00:00Z"), d("2026-11-20T15:00:00Z"), agora, 30)).toMatch(/antecedência/);
    expect(validateWindow(d("2026-11-20T12:10:00Z"), d("2026-11-20T15:00:00Z"), agora, 30)).toMatch(/antecedência/);
  });
  it("aceita janela válida", () => {
    expect(validateWindow(d("2026-11-21T10:00:00Z"), d("2026-11-21T12:00:00Z"), agora, 30)).toBeNull();
  });
  it("rejeita duração acima do máximo", () => {
    expect(validateWindow(d("2026-11-21T10:00:00Z"), d("2026-12-30T10:00:00Z"), agora, 30)).toMatch(/máxima/);
  });
  it("sem antecedência (lançamento do administrador): aceita uso em andamento ou passado", () => {
    expect(validateWindow(d("2026-11-20T11:00:00Z"), d("2026-11-20T15:00:00Z"), agora, null)).toBeNull();
    expect(validateWindow(d("2026-11-10T08:00:00Z"), d("2026-11-10T12:00:00Z"), agora, null)).toBeNull();
    expect(validateWindow(d("2026-11-10T12:00:00Z"), d("2026-11-10T08:00:00Z"), agora, null)).toMatch(/posterior/);
  });
});

describe("datetime (Brasília)", () => {
  it("converte entrada local para UTC e volta", () => {
    const x = parseLocalBr("2026-11-20T08:30")!;
    expect(x.toISOString()).toBe("2026-11-20T11:30:00.000Z");
    expect(toInputDateTime(x)).toBe("2026-11-20T08:30");
  });
  it("rejeita formato inválido", () => {
    expect(parseLocalBr("20/11/2026 08:30")).toBeNull();
    expect(parseLocalBr("2026-13-40T99:99")).toBeNull();
  });
  it("rejeita datas e horas impossíveis em vez de corrigi-las", () => {
    expect(parseLocalBr("2026-02-30T08:00")).toBeNull();
    expect(parseLocalBr("2026-04-31T08:00")).toBeNull();
    expect(parseLocalBr("2026-11-20T24:00")).toBeNull();
    expect(parseLocalBr("2028-02-29T08:00")).not.toBeNull();
  });
});

describe("podeModificar", () => {
  it("só reservas ativas e futuras", () => {
    const futuro = d("2026-11-25T10:00:00Z");
    expect(podeModificar("PENDENTE", futuro, agora)).toBe(true);
    expect(podeModificar("APROVADO", futuro, agora)).toBe(true);
    expect(podeModificar("CANCELADO", futuro, agora)).toBe(false);
    expect(podeModificar("REJEITADO", futuro, agora)).toBe(false);
    expect(podeModificar("APROVADO", d("2026-11-19T10:00:00Z"), agora)).toBe(false);
  });
});
