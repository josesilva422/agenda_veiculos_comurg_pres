"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { duplicado, retornoSeguro, validar, voltar } from "@/lib/action";
import { vehicleSchema } from "@/lib/validation";

/** Cria (id nulo) ou atualiza um veículo. */
export async function salvarVeiculo(id: string | null, fd: FormData) {
  await requireAdmin();
  // vindo do pop-up de cadastro/edição, volta para a lista (com o pop-up aberto se der erro)
  const retorno = retornoSeguro(fd, ["/admin/veiculos"]);
  const back = retorno ? `${retorno}?${id ? `editar=${id}` : "novo=1"}` : `/admin/veiculos/${id ?? "novo"}`;
  const data = validar(vehicleSchema, fd, back);
  try {
    if (id) await prisma.vehicle.update({ where: { id }, data });
    else await prisma.vehicle.create({ data });
  } catch (e) {
    if (!duplicado(e)) throw e;
    voltar(back, { erro: "Já existe um veículo com este prefixo ou placa." });
  }
  revalidatePath("/admin/veiculos");
  voltar("/admin/veiculos", { ok: id ? "Veículo atualizado." : "Veículo cadastrado." });
}
