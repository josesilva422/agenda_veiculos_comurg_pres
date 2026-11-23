import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Titulo } from "@/components/ui";
import { salvarUsuario } from "../actions";
import UserForm from "../UserForm";

export default async function EditarUsuario({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  return (
    <div>
      <Titulo>Editar usuário</Titulo>
      <UserForm action={salvarUsuario.bind(null, id)} user={user} />
    </div>
  );
}
