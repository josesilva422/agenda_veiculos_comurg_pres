import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Field, Stat, Stats, Titulo, btnCls, btnGhostCls, cardCls, inputCls } from "@/components/ui";
import { STATUS, statusInfo } from "@/lib/status";
import { buscarAgendamentos, lerFiltros, MAX_LINHAS, toQuery } from "@/lib/reports";
import { summarize } from "@/lib/reports-summary";

const h2 = (n: number) => (Math.round(n * 100) / 100).toLocaleString("pt-BR");

function Filtro({ nome, label, valor, opcoes }: { nome: string; label: string; valor?: string; opcoes: [string, string][] }) {
  return (
    <Field label={label} className="col-span-2 sm:col-span-1">
      <select name={nome} defaultValue={valor ?? ""} className={inputCls}>
        <option value="">Todos</option>
        {opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </Field>
  );
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const f = lerFiltros(await searchParams);
  const [{ rows, truncado }, vehicles, users, setores] = await Promise.all([
    buscarAgendamentos(f),
    prisma.vehicle.findMany({ orderBy: { prefixo: "asc" } }),
    prisma.user.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.user.findMany({ where: { setor: { not: null } }, select: { setor: true }, distinct: ["setor"], orderBy: { setor: "asc" } }),
  ]);
  const s = summarize(rows);
  const q = toQuery(f);

  return (
    <div>
      <Titulo>Relatórios</Titulo>
      <div className="space-y-6">
        <form className={`grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6 ${cardCls}`} method="get">
          <Field label="De">
            <input type="date" name="de" defaultValue={f.de} required className={inputCls} />
          </Field>
          <Field label="Até">
            <input type="date" name="ate" defaultValue={f.ate} required className={inputCls} />
          </Field>
          <Filtro nome="vehicleId" label="Veículo" valor={f.vehicleId} opcoes={vehicles.map((v) => [v.id, v.prefixo])} />
          <Filtro nome="userId" label="Solicitante" valor={f.userId} opcoes={users.map((u) => [u.id, u.nome])} />
          <Filtro nome="setor" label="Lotação" valor={f.setor} opcoes={setores.map((x) => [x.setor!, x.setor!])} />
          <Filtro nome="status" label="Status" valor={f.status} opcoes={STATUS.map((k) => [k, statusInfo[k].label])} />
          <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-3 lg:col-span-6">
            <button className={btnCls}>Filtrar</button>
            <Link href="/admin/relatorios" className={btnGhostCls}>Limpar</Link>
            <span className="hidden flex-1 sm:block" />
            <div className="flex w-full flex-wrap gap-2 border-t pt-3 sm:w-auto sm:border-0 sm:pt-0">
              <a href={`/api/relatorios/xlsx?${q}`} className={`${btnGhostCls} flex-1 text-center sm:flex-none`}>Exportar Excel</a>
              <a href={`/api/relatorios/pdf?${q}`} className={`${btnGhostCls} flex-1 text-center sm:flex-none`}>Exportar PDF</a>
            </div>
          </div>
        </form>

        {truncado && (
          <p role="alert" className="rounded bg-amber-50 p-3 text-sm text-amber-800">
            O período tem mais de {MAX_LINHAS} agendamentos; os totais consideram apenas os primeiros {MAX_LINHAS}. Refine os filtros.
          </p>
        )}

        <Stats>
          <Stat valor={s.total} rotulo="Agendamentos" />
          <Stat valor={h2(s.horasAprovadas)} rotulo="Horas aprovadas" />
          {(["APROVADO", "REJEITADO", "CANCELADO"] as const).map((k) => (
            <Stat key={k} valor={s.porStatus[k]} rotulo={statusInfo[k].label} />
          ))}
        </Stats>
      </div>
    </div>
  );
}
