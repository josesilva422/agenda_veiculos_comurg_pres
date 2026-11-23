import { describe, expect, it } from "vitest";
import { KM_MAX, percurso, validarKm } from "./km";

const ant = { km: 10_000, quando: new Date("2026-11-01T12:00:00Z") };
const prox = { km: 10_500, quando: new Date("2026-11-20T12:00:00Z") };
const base = { kmInicial: null, kmFinal: null, anterior: null, proximo: null, conferirVizinhos: true };

describe("validarKm", () => {
  it("aceita números coerentes", () => {
    expect(validarKm({ ...base, kmInicial: 10_000, kmFinal: 10_120, anterior: ant, proximo: prox })).toBeNull();
    expect(validarKm({ ...base, kmInicial: 12_345 })).toBeNull();
  });

  it("recusa km final menor que o inicial", () => {
    expect(validarKm({ ...base, kmInicial: 500, kmFinal: 400 })).toMatch(/não pode ser menor/);
  });

  it("recusa valores inválidos", () => {
    expect(validarKm({ ...base, kmInicial: -1 })).toMatch(/inválida/);
    expect(validarKm({ ...base, kmFinal: 1.5 })).toMatch(/inválida/);
    expect(validarKm({ ...base, kmFinal: KM_MAX + 1 })).toMatch(/inválida/);
  });

  it("o hodômetro não anda para trás em relação à reserva anterior", () => {
    expect(validarKm({ ...base, kmInicial: 9_999, anterior: ant })).toMatch(/último km registrado/);
    expect(validarKm({ ...base, kmInicial: 10_000, anterior: ant })).toBeNull();
    // ficou um intervalo sem registro: é permitido (o veículo pode ter rodado fora do sistema)
    expect(validarKm({ ...base, kmInicial: 10_300, anterior: ant })).toBeNull();
  });

  it("não ultrapassa o km já registrado na reserva seguinte", () => {
    expect(validarKm({ ...base, kmInicial: 10_000, kmFinal: 10_501, proximo: prox })).toMatch(/reserva seguinte/);
    expect(validarKm({ ...base, kmInicial: 10_000, kmFinal: 10_500, proximo: prox })).toBeNull();
  });

  it("o administrador (sem conferir vizinhos) pode corrigir, mas ainda vale final >= inicial", () => {
    expect(validarKm({ ...base, kmInicial: 9_000, anterior: ant, conferirVizinhos: false })).toBeNull();
    expect(validarKm({ ...base, kmInicial: 9_000, kmFinal: 8_000, conferirVizinhos: false })).toMatch(/não pode ser menor/);
  });
});

describe("percurso", () => {
  it("só calcula com os dois números", () => {
    expect(percurso(100, 160)).toBe(60);
    expect(percurso(100, null)).toBeNull();
    expect(percurso(null, 160)).toBeNull();
  });
});
