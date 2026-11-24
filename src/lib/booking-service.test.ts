import { describe, expect, it } from "vitest";
import { lerAlteracao, periodoEmDecisao, snap } from "./booking-service";

const aprovada = {
  vehicleId: "v1",
  inicio: new Date("2026-12-01T13:00:00Z"),
  fim: new Date("2026-12-01T15:00:00Z"),
  destino: "Centro",
  passageiros: 2,
  motorista: null,
};
const pedido = { ...aprovada, vehicleId: "v2", inicio: new Date("2026-12-02T13:00:00Z"), fim: new Date("2026-12-02T18:00:00Z") };

describe("pedido de alteração", () => {
  it("a reserva mantém os dados aprovados; o pedido é lido do JSON", () => {
    const b = { ...aprovada, status: "ALTERACAO_PENDENTE", versaoAnterior: JSON.stringify(snap(pedido)) };
    expect(lerAlteracao(b)).toEqual(pedido);
    // o administrador decide sobre o veículo e o período pedidos
    expect(periodoEmDecisao(b)).toEqual({ vehicleId: "v2", inicio: pedido.inicio, fim: pedido.fim });
  });

  it("sem pedido (ou outro status), vale a própria reserva", () => {
    const b = { ...aprovada, status: "PENDENTE", versaoAnterior: null };
    expect(lerAlteracao(b)).toBeNull();
    expect(periodoEmDecisao(b)).toEqual({ vehicleId: "v1", inicio: aprovada.inicio, fim: aprovada.fim });
    expect(lerAlteracao({ status: "ALTERACAO_PENDENTE", versaoAnterior: "json quebrado" })).toBeNull();
  });
});
