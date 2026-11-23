import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { parseLocalBr, toInputDateTime } from "./datetime";
import { ehStatus, statusInfo, type BookingStatus } from "./status";

export const MAX_LINHAS = 5000;

export type Filtros = {
  de: string; // yyyy-mm-dd
  ate: string; // yyyy-mm-dd (inclusive)
  vehicleId?: string;
  userId?: string;
  setor?: string;
  status?: BookingStatus;
};

type SP = Record<string, string | string[] | undefined>;
const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Lê filtros da query string. Padrão: mês corrente (Brasília). */
export function lerFiltros(sp: SP, agora = new Date()): Filtros {
  const hoje = toInputDateTime(agora).slice(0, 10);
  const primeiro = `${hoje.slice(0, 8)}01`;
  const de = um(sp.de);
  const ate = um(sp.ate);
  const st = um(sp.status);
  return {
    de: de && DATA.test(de) ? de : primeiro,
    ate: ate && DATA.test(ate) ? ate : hoje,
    vehicleId: um(sp.vehicleId),
    userId: um(sp.userId),
    setor: um(sp.setor),
    status: ehStatus(st) ? st : undefined,
  };
}

export function toQuery(f: Filtros): string {
  const p = new URLSearchParams({ de: f.de, ate: f.ate });
  if (f.vehicleId) p.set("vehicleId", f.vehicleId);
  if (f.userId) p.set("userId", f.userId);
  if (f.setor) p.set("setor", f.setor);
  if (f.status) p.set("status", f.status);
  return p.toString();
}

/** Agendamentos cujo início está no período (dias inclusivos, horário de Brasília). */
export async function buscarAgendamentos(f: Filtros) {
  const ini = parseLocalBr(`${f.de}T00:00`);
  const fimIncl = parseLocalBr(`${f.ate}T00:00`);
  if (!ini || !fimIncl) return { rows: [], truncado: false };
  const fim = new Date(fimIncl.getTime() + 24 * 3600_000);

  const where: Prisma.BookingWhereInput = {
    inicio: { gte: ini, lt: fim },
    ...(f.vehicleId ? { vehicleId: f.vehicleId } : {}),
    ...(f.userId ? { userId: f.userId } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.setor ? { user: { setor: f.setor } } : {}),
  };
  const rows = await prisma.booking.findMany({
    where,
    include: { user: true, vehicle: true, decididoPor: true },
    orderBy: { inicio: "asc" },
    take: MAX_LINHAS + 1,
  });
  const truncado = rows.length > MAX_LINHAS;
  return { rows: truncado ? rows.slice(0, MAX_LINHAS) : rows, truncado };
}

export type RowCompleta = Awaited<ReturnType<typeof buscarAgendamentos>>["rows"][number];

const dm = (s: string) => s.split("-").reverse().join("/");

/** Dados completos do relatório, já com a descrição legível dos filtros. */
export async function carregarRelatorio(f: Filtros) {
  const { rows, truncado } = await buscarAgendamentos(f);
  const [v, u] = await Promise.all([
    f.vehicleId ? prisma.vehicle.findUnique({ where: { id: f.vehicleId } }) : null,
    f.userId ? prisma.user.findUnique({ where: { id: f.userId } }) : null,
  ]);
  const filtrosTxt = [
    `Período: ${dm(f.de)} a ${dm(f.ate)}`,
    `Veículo: ${v ? `${v.prefixo} (${v.placa})` : "todos"}`,
    `Solicitante: ${u ? u.nome : "todos"}`,
    `Lotação: ${f.setor ?? "todos"}`,
    `Status: ${f.status ? statusInfo[f.status].label : "todos"}`,
  ];
  return { rows, truncado, filtrosTxt };
}
