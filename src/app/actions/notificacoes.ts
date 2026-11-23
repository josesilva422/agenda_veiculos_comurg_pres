"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function rota(role: "ADMIN" | "USER") {
  return role === "ADMIN" ? "/admin/notificacoes" : "/usuario/notificacoes";
}

/** Só altera notificações do próprio usuário logado. */
export async function marcarLida(id: string) {
  const u = await requireUser();
  await prisma.notification.updateMany({ where: { id, userId: u.id }, data: { lida: true } });
  revalidatePath(rota(u.role));
  revalidatePath("/", "layout");
}

export async function marcarTodasLidas() {
  const u = await requireUser();
  await prisma.notification.updateMany({ where: { userId: u.id, lida: false }, data: { lida: true } });
  revalidatePath(rota(u.role));
  revalidatePath("/", "layout");
}
