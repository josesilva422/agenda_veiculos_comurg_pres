import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Últimas notificações do usuário logado, para o painel flutuante do sino. */
export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  const itens = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { criadoEm: "desc" },
    take: 15,
    select: { id: true, tipo: true, mensagem: true, lida: true, criadoEm: true, bookingId: true },
  });
  return NextResponse.json({ itens });
}
