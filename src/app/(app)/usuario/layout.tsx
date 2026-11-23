import AppShell, { type Grupo } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const grupos: Grupo[] = [
  {
    titulo: "Agendamentos",
    itens: [
      { href: "/usuario", label: "Calendário", icon: "calendario" },
      { href: "/usuario/agendamentos", label: "Meus agendamentos", icon: "lista" },
    ],
  },
  {
    titulo: "Conta",
    itens: [{ href: "/usuario/perfil", label: "Meu perfil", icon: "perfil" }],
  },
];

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const naoLidas = await prisma.notification.count({ where: { userId: u.id, lida: false } });
  return (
    <AppShell
      grupos={grupos}
      nome={u.name ?? ""}
      perfil={u.role === "ADMIN" ? "Administrador" : "Usuário"}
      notifHref="/usuario/notificacoes"
      naoLidas={naoLidas}
    >
      {children}
    </AppShell>
  );
}
