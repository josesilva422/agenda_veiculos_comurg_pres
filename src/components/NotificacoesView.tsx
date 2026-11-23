import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/datetime";
import { marcarLida, marcarTodasLidas } from "@/app/actions/notificacoes";
import { Titulo, btnGhostCls, cardCls, linkCls } from "./ui";

/** Página de notificações das duas áreas. No admin o link abre o agendamento; no usuário, a lista dele. */
export default async function NotificacoesView({ area }: { area: "admin" | "usuario" }) {
  const u = area === "admin" ? await requireAdmin() : await requireUser();
  // economiza espaço: apaga notificações já lidas com mais de 30 dias
  await prisma.notification.deleteMany({
    where: { userId: u.id, lida: true, criadoEm: { lt: new Date(Date.now() - 30 * 86400_000) } },
  });
  const itens = await prisma.notification.findMany({ where: { userId: u.id }, orderBy: { criadoEm: "desc" }, take: 100 });
  const link = (bookingId: string) => (area === "admin" ? `/admin/agendamentos/${bookingId}` : "/usuario/agendamentos");

  return (
    <div className="max-w-3xl">
      <Titulo
        acao={
          itens.some((n) => !n.lida) && (
            <form action={marcarTodasLidas}>
              <button className={btnGhostCls}>Marcar todas como lidas</button>
            </form>
          )
        }
      >
        Notificações
      </Titulo>
      <ul className={`divide-y ${cardCls}`}>
        {itens.map((n) => (
          <li key={n.id} className={`flex items-start justify-between gap-3 p-4 text-sm ${n.lida ? "text-slate-500" : "bg-marca-suave/60"}`}>
            <div>
              <div className={n.lida ? "" : "font-medium text-slate-900"}>{n.mensagem}</div>
              <div className="mt-1 text-xs text-slate-500">
                {fmtDateTime(n.criadoEm)}
                {n.bookingId && (
                  <>
                    {" · "}
                    <Link href={link(n.bookingId)} className={linkCls}>Abrir</Link>
                  </>
                )}
              </div>
            </div>
            {!n.lida && (
              <form action={marcarLida.bind(null, n.id)}>
                <button className={`whitespace-nowrap text-xs ${linkCls}`}>Marcar como lida</button>
              </form>
            )}
          </li>
        ))}
        {itens.length === 0 && <li className="p-6 text-center text-slate-500">Nenhuma notificação.</li>}
      </ul>
    </div>
  );
}
