"use client";
import { useRef } from "react";
import { Field, inputCls } from "./ui";

const p2 = (n: number) => String(n).padStart(2, "0");
/** Horários de 15 em 15 minutos: fáceis de escolher no celular, sem digitar. */
const HORARIOS = Array.from({ length: 96 }, (_, i) => `${p2(Math.floor(i / 4))}:${p2((i % 4) * 15)}`);

function Periodo({
  nome,
  rotulo,
  valor,
  dataRef,
  aoMudarData,
}: {
  nome: "inicio" | "fim";
  rotulo: string;
  valor?: string;
  dataRef?: React.Ref<HTMLInputElement>;
  aoMudarData?: (v: string) => void;
}) {
  const [data = "", hora = ""] = (valor ?? "").split("T");
  // horário fora da grade (ex.: 17:11 de um agendamento antigo) continua selecionável
  const opcoes = hora && !HORARIOS.includes(hora) ? [hora, ...HORARIOS].sort() : HORARIOS;
  return (
    <Field label={`${rotulo} (horário de Brasília)`} className="sm:col-span-2">
      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
        <input
          ref={dataRef}
          name={`${nome}_data`}
          type="date"
          required
          defaultValue={data}
          onChange={(e) => aoMudarData?.(e.target.value)}
          aria-label={`Data de ${rotulo.toLowerCase()}`}
          className={inputCls}
        />
        <select name={`${nome}_hora`} required defaultValue={hora} aria-label={`Hora de ${rotulo.toLowerCase()}`} className={inputCls}>
          <option value="" disabled>Hora</option>
          {opcoes.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>
    </Field>
  );
}

/** Início e fim com data e hora separadas. O servidor junta os pares (veja `validar`). */
export default function CamposPeriodo({ inicio, fim }: { inicio?: string; fim?: string }) {
  const fimData = useRef<HTMLInputElement>(null);
  return (
    <>
      <Periodo
        nome="inicio"
        rotulo="Início"
        valor={inicio}
        // escolhida a data de início, sugere a mesma data no fim (se ainda estiver vazia)
        aoMudarData={(v) => {
          if (fimData.current && !fimData.current.value) fimData.current.value = v;
        }}
      />
      <Periodo nome="fim" rotulo="Fim" valor={fim} dataRef={fimData} />
    </>
  );
}
