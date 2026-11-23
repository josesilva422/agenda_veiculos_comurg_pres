import { Titulo } from "@/components/ui";
import { salvarVeiculo } from "../actions";
import VehicleForm from "../VehicleForm";

export default function NovoVeiculo() {
  return (
    <div>
      <Titulo>Novo veículo</Titulo>
      <VehicleForm action={salvarVeiculo.bind(null, null)} />
    </div>
  );
}
