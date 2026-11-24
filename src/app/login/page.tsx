"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, btnCls, cardCls, inputCls } from "@/components/ui";
import Image from "next/image";
import { APP } from "@/lib/config";
import FaixaComurg from "@/components/FaixaComurg";
import AvisoPrivacidade from "@/components/AvisoPrivacidade";

function LoginForm() {
  const router = useRouter();
  const trocada = useSearchParams().get("trocada") === "1";
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    const res = await signIn("credentials", { login, password, redirect: false });
    setLoading(false);
    if (res?.error === "BLOQUEADO") setErro("Muitas tentativas. Aguarde 15 minutos e tente novamente.");
    else if (res?.error) setErro("E-mail/matrícula ou senha inválidos.");
    else router.push("/");
  }

  return (
    <>
    <FaixaComurg />
    <main className="mx-auto flex min-h-[calc(100vh-6px)] w-full max-w-sm flex-col justify-center p-4">
      <div className="mb-6 text-center">
        <Image src="/logo-comurg.png" alt="Comurg — Companhia de Urbanização de Goiânia" width={668} height={587} className="mx-auto mb-4 h-auto w-40" priority />
        <h1 className="text-lg font-semibold text-marca">{APP.nome}</h1>
        <p className="text-sm text-slate-600">Entre com seu e-mail ou matrícula e sua senha.</p>
      </div>
      <form onSubmit={onSubmit} className={`space-y-4 p-5 ${cardCls}`}>
        {trocada && (
          <p role="status" className="rounded border-l-4 border-green-600 bg-green-50 px-3 py-2 text-sm text-green-800">
            Senha alterada. Entre com a nova senha.
          </p>
        )}
        <Field label="E-mail ou matrícula">
          <input type="text" required autoComplete="username" autoCapitalize="none" value={login} onChange={(e) => setLogin(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Senha">
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </Field>
        {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
        <button disabled={loading} className={`w-full ${btnCls}`}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <AvisoPrivacidade />
    </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
