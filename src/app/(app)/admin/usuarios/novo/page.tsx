import { Titulo } from "@/components/ui";
import { salvarUsuario } from "../actions";
import UserForm from "../UserForm";

export default function NovoUsuario() {
  return (
    <div>
      <Titulo>Novo usuário</Titulo>
      <UserForm action={salvarUsuario.bind(null, null)} />
    </div>
  );
}
