import Link from "next/link";
import { Titulo, btnGhostCls } from "@/components/ui";
import PainelDecisao from "@/components/PainelDecisao";

export default async function DetalheAgendamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="max-w-3xl">
      <Titulo acao={<Link href="/admin/agendamentos" className={btnGhostCls}>Voltar</Link>}>Agendamento</Titulo>
      <PainelDecisao id={id} />
    </div>
  );
}
