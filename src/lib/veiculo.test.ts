import { describe, expect, it } from "vitest";
import { tipoResumido } from "./veiculo";

describe("tipoResumido", () => {
  it("mantém tipos curtos", () => {
    expect(tipoResumido("Sedan")).toBe("Sedan");
    expect(tipoResumido("Van")).toBe("Van");
  });

  it("corta no primeiro detalhe depois de vírgula ou parêntese", () => {
    expect(tipoResumido("Strada Freedom, com Engate")).toBe("Strada Freedom…");
    expect(tipoResumido("Van (9 lugares)")).toBe("Van…");
  });

  it("limita o tamanho sem cortar palavra no meio", () => {
    const r = tipoResumido("Strada Freedom Cabine Dupla 1.3 Flex, com Engate");
    expect(r).toBe("Strada Freedom Cabine…");
    expect(r.length).toBeLessThanOrEqual(23);
    expect(tipoResumido("Caminhonete Utilitaria Superlongapalavrasemespaco", 20).endsWith("…")).toBe(true);
  });
});
