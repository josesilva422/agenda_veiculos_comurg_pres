"use client";
import { inputCls } from "./ui";

/** Lista suspensa que envia o formulário assim que a opção muda. */
export default function StatusSelect({
  name,
  defaultValue,
  opcoes,
}: {
  name: string;
  defaultValue: string;
  opcoes: { valor: string; rotulo: string }[];
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={`${inputCls} text-sm font-normal normal-case tracking-normal text-slate-900 lg:w-56`}
    >
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>{o.rotulo}</option>
      ))}
    </select>
  );
}
