import { describe, expect, it } from "vitest";
import { gerarSenhaProvisoria, validarSenhaForte, versaoSenha } from "./senha";

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
});

describe("gerarSenhaProvisoria", () => {
  it("cumpre a regra da senha e muda a cada chamada", () => {
    const senhas = Array.from({ length: 50 }, gerarSenhaProvisoria);
    for (const s of senhas) {
      expect(s).toMatch(/^[A-Za-z]{4}-[2-9]{4}-[A-Za-z]{4}$/);
      expect(validarSenhaForte(s)).toBeNull();
    }
    expect(new Set(senhas).size).toBe(senhas.length);
  });
});

describe("versaoSenha", () => {
  it("é estável para a mesma senha e muda quando a senha muda", () => {
    expect(versaoSenha("hash-a")).toBe(versaoSenha("hash-a"));
    expect(versaoSenha("hash-a")).not.toBe(versaoSenha("hash-b"));
  });
});
