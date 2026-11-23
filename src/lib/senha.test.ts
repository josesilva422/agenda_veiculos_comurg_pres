import { describe, expect, it } from "vitest";
import { SENHA_PADRAO, validarSenhaForte } from "./senha";

describe("validarSenhaForte", () => {
  it("aceita senha com letra, número, especial e 8+ caracteres", () => {
    expect(validarSenhaForte("Abc@1234")).toBeNull();
    expect(validarSenhaForte("minha-senha#9")).toBeNull();
  });

  it("recusa senha curta", () => {
    expect(validarSenhaForte("Ab@1234")).toMatch(/8 caracteres/);
  });

  it("recusa senha sem letra, sem número ou sem especial", () => {
    expect(validarSenhaForte("12345678@")).toMatch(/letra/);
    expect(validarSenhaForte("Abcdefg@")).toMatch(/número/);
    expect(validarSenhaForte("Abcdefg12")).toMatch(/especial/);
  });

  it("a senha padrão cumpre a própria regra", () => {
    expect(validarSenhaForte(SENHA_PADRAO)).toBeNull();
  });
});
