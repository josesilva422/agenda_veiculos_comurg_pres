import { describe, expect, it } from "vitest";
import { calcularAlertas } from "./alerts";

const agora = new Date("2026-11-13T12:00:00Z");
const d = (s: string) => new Date(s);
const base = { ativo: true, cnhValidade: null };

describe("calcularAlertas", () => {
  it("sem CNH informada não gera alerta (CNH é opcional)", () => {
    expect(calcularAlertas([{ ...base, id: "1", nome: "A" }], agora)).toEqual([]);
  });

  it("CNH vencida, a vencer em 30 dias e válida", () => {
    const r = calcularAlertas(
      [
        { ...base, id: "1", nome: "Vencida", cnhValidade: d("2026-11-01T12:00:00Z") },
        { ...base, id: "2", nome: "Vence", cnhValidade: d("2026-12-10T12:00:00Z") },
        { ...base, id: "3", nome: "Ok", cnhValidade: d("2027-06-01T12:00:00Z") },
      ],
      agora,
    );
    expect(r.map((a) => [a.nome, a.tipo])).toEqual([["Vencida", "CNH_VENCIDA"], ["Vence", "CNH_VENCE"]]);
  });

  it("ignora usuários inativos", () => {
    expect(calcularAlertas([{ ...base, id: "1", nome: "X", ativo: false, cnhValidade: d("2026-11-01") }], agora)).toEqual([]);
  });
});
