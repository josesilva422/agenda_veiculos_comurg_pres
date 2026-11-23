import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fromWall, toWallIso } from "@/lib/datetime";
import { podeModificar } from "@/lib/booking-rules";
import { AGUARDANDO, ATIVOS, COR_OCUPADO, ehStatus, statusInfo } from "@/lib/status";

const MAX_DIAS = 100;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  const { id: meuId, role } = session.user;

  const q = req.nextUrl.searchParams;
  const s = new Date(q.get("start") ?? "");
  const e = new Date(q.get("end") ?? "");
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) {
    return NextResponse.json({ erro: "Período inválido" }, { status: 400 });
  }
  if (e.getTime() - s.getTime() > MAX_DIAS * 86400_000) {
    return NextResponse.json({ erro: "Período muito longo" }, { status: 400 });
  }
  // o calendário trabalha em hora de parede de Brasília; converte para o instante real
  const inicio = fromWall(s);
  const fim = fromWall(e);

  const vehicleId = q.get("vehicleId") || undefined;
  const statusParam = q.get("status");
  const userId = q.get("userId") || undefined;

  const where: Prisma.BookingWhereInput = {
    inicio: { lt: fim },
    fim: { gt: inicio },
    ...(vehicleId ? { vehicleId } : {}),
  };

  if (role === "ADMIN") {
    if (userId) where.userId = userId;
    where.status = ehStatus(statusParam) ? statusParam : { in: ATIVOS };
  } else {
    // usuário: vê o que está ocupado (sem dados de terceiros) e as próprias solicitações ativas
    where.OR = [
      { status: "APROVADO" },
      { userId: meuId, status: { in: AGUARDANDO } },
    ];
  }

  const lista = await prisma.booking.findMany({
    where,
    include: { vehicle: true, user: { select: { nome: true } } },
    orderBy: { inicio: "asc" },
    take: 1000,
  });

  const events = lista.map((b) => {
    const meu = b.userId === meuId;
    const admin = role === "ADMIN";
    const titulo = admin
      ? `${b.vehicle.prefixo} · ${b.user.nome}`
      : meu
        ? `${b.vehicle.prefixo} · ${b.destino}`
        : `${b.vehicle.prefixo} · ${b.user.nome}`;
    const cor = admin || meu ? statusInfo[b.status].cor : COR_OCUPADO;
    const url = admin
      ? `/admin/agendamentos/${b.id}`
      : meu && podeModificar(b.status, b.inicio)
        ? `/usuario/agendamentos/${b.id}`
        : undefined;
    return {
      id: b.id,
      title: titulo,
      start: toWallIso(b.inicio),
      end: toWallIso(b.fim),
      backgroundColor: cor,
      borderColor: cor,
      extendedProps: { status: b.status, meu, url },
    };
  });

  return NextResponse.json(events, { headers: { "Cache-Control": "private, no-store" } });
}
