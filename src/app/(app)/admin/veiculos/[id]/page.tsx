import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Titulo } from "@/components/ui";
import { salvarVeiculo } from "../actions";
import VehicleForm from "../VehicleForm";

export default async function EditarVeiculo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) notFound();
  return (
    <div>
      <Titulo>Editar veículo {vehicle.prefixo}</Titulo>
      <VehicleForm action={salvarVeiculo.bind(null, id)} vehicle={vehicle} />
    </div>
  );
}
