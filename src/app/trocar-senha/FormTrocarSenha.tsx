"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Field, btnCls, inputCls } from "@/components/ui";
import { definirNovaSenha } from "./actions";

export default function FormTrocarSenha() {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(fd: FormData) {
    setEnviando(true);
    setErro("");
    const r = await definirNovaSenha(fd);
    if (r.erro) {
      setErro(r.erro);
      setEnviando(false);
      return;
    }
    // a sessão antiga ainda marca "trocar senha": sai e pede o login com a senha nova
    await signOut({ callbackUrl: "/login?trocada=1" });
  }

  return (
    <form action={enviar} className="space-y-4">
      <Field label="Nova senha">
        <input name="nova" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
      </Field>
      <Field label="Confirmar nova senha">
        <input name="confirmar" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
      </Field>
      {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
      <button disabled={enviando} className={`w-full ${btnCls}`}>
        {enviando ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
