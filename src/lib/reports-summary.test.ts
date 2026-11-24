import { describe, expect, it } from "vitest";
import { summarize, type ReportRow } from "./reports-summary";

const row = (over: Partial<ReportRow>): ReportRow => ({
  userId: "u1",
  vehicleId: "v1",
  inicio: new Date("2026-11-20T10:00:00Z"),
  fim: new Date("2026-11-20T12:30:00Z"),
  status: "APROVADO",
  user: { nome: "Ana", setor: "RH" },
  vehicle: { prefixo: "VTR-01", placa: "ABC1D23" },
  ...over,
});

describe("summarize", () => {
  it("conta por status e soma horas apenas das aprovadas", () => {
    const s = summarize([
      row({}),
      row({ status: "CANCELADO" }),
      row({ status: "REJEITADO" }),
      row({ status: "PENDENTE" }),
    ]);
    expect(s.total).toBe(4);
    expect(s.porStatus).toMatchObject({ APROVADO: 1, CANCELADO: 1, REJEITADO: 1, PENDENTE: 1 });
    expect(s.horasAprovadas).toBe(2.5);
  });

  it("agrupa por veículo e usuário, ordenando por total", () => {
    const s = summarize([
      row({}),
      row({ userId: "u2", user: { nome: "Bia", setor: null } }),
      row({ userId: "u2", user: { nome: "Bia", setor: null }, vehicleId: "v2", vehicle: { prefixo: "VTR-02", placa: "XYZ9K88" }, status: "CANCELADO" }),
    ]);
    expect(s.porVeiculo.map((v) => [v.nome, v.total])).toEqual([["VTR-01", 2], ["VTR-02", 1]]);
    expect(s.porUsuario[0]).toMatchObject({ nome: "Bia", total: 2, canceladas: 1, aprovadas: 1, detalhe: "—" });
  });

  it("reserva aprovada com pedido de alteração continua contando como aprovada", () => {
    const s = summarize([row({}), row({ status: "ALTERACAO_PENDENTE" })]);
    expect(s.horasAprovadas).toBe(5);
    expect(s.porVeiculo[0]).toMatchObject({ aprovadas: 2 });
  });

  it("lista vazia", () => {
    const s = summarize([]);
    expect(s.total).toBe(0);
    expect(s.porVeiculo).toEqual([]);
  });
});
