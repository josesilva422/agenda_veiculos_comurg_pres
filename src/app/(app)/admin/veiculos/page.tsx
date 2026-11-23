import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ModalDecisao from "@/components/ModalDecisao";
import { Badge, Tabela, Titulo, btnCls, cardCls, linkCls } from "@/components/ui";
import { veiculoStatus } from "@/lib/status";
import { salvarVeiculo } from "./actions";
import VehicleForm from "./VehicleForm";

const LISTA = "/admin/veiculos";

export default async function VeiculosPage({ searchParams }: { searchParams: Promise<{ editar?: string; novo?: string }> }) {
  const { editar, novo } = await searchParams;
  const [veiculos, editando] = await Promise.all([
    prisma.vehicle.findMany({ orderBy: { prefixo: "asc" } }),
    editar ? prisma.vehicle.findUnique({ where: { id: editar } }) : null,
  ]);
  const abrir = (id: string) => `${LISTA}?editar=${id}`;

  return (
    <div>
      <Titulo acao={<Link href={`${LISTA}?novo=1`} className={btnCls} scroll={false}>Novo veículo</Link>}>Veículos</Titulo>

      {/* celular: um cartão por veículo, com espaço entre eles */}
      <ul className="space-y-3 sm:hidden">
        {veiculos.length === 0 && <li className={`p-4 text-center text-sm text-slate-500 ${cardCls}`}>Nenhum veículo cadastrado.</li>}
        {veiculos.map((v) => (
          <li key={v.id} className={`p-3 ${cardCls}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{v.prefixo} <span className="font-normal text-slate-500">· {v.placa}</span></div>
                <div className="text-sm text-slate-600">{v.tipo} · {v.lotacao} lugares</div>
                {v.contrato && <div className="text-sm text-slate-500">Contrato: {v.contrato}</div>}
              </div>
              <Badge cor={veiculoStatus[v.status].cor}>{veiculoStatus[v.status].label}</Badge>
            </div>
            <div className="mt-2 text-right text-sm">
              <Link href={abrir(v.id)} className={linkCls} scroll={false}>Editar</Link>
            </div>
          </li>
        ))}
      </ul>

      {/* computador: tabela */}
      <div className="max-sm:hidden">
        <Tabela cols={["Prefixo", "Placa", "Tipo", "Lotação", "Contrato", "Status", ""]} vazio="Nenhum veículo cadastrado.">
          {veiculos.map((v) => (
            <tr key={v.id}>
              <td className="whitespace-nowrap font-medium">{v.prefixo}</td>
              <td className="whitespace-nowrap">{v.placa}</td>
              <td>{v.tipo}</td>
              <td>{v.lotacao}</td>
              <td>{v.contrato ?? "—"}</td>
              <td><Badge cor={veiculoStatus[v.status].cor}>{veiculoStatus[v.status].label}</Badge></td>
              <td className="text-right">
                <Link href={abrir(v.id)} className={linkCls} scroll={false}>Editar</Link>
              </td>
            </tr>
          ))}
        </Tabela>
      </div>

      {novo === "1" && !editando && (
        <ModalDecisao param="novo" titulo="Novo veículo">
          <VehicleForm action={salvarVeiculo.bind(null, null)} retorno={LISTA} semCartao />
        </ModalDecisao>
      )}
      {editando && (
        <ModalDecisao key={editando.id} param="editar" titulo={`Editar veículo ${editando.prefixo}`}>
          <VehicleForm action={salvarVeiculo.bind(null, editando.id)} vehicle={editando} retorno={LISTA} semCartao />
        </ModalDecisao>
      )}
    </div>
  );
}
