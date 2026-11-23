import AppShell, { type Grupo } from "@/components/AppShell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const grupos: Grupo[] = [
  {
    titulo: "Operação",
    itens: [
      { href: "/admin", label: "Painel", icon: "painel" },
      { href: "/admin/agendamentos", label: "Agendamentos", icon: "lista" },
      { href: "/admin/calendario", label: "Calendário", icon: "calendario" },
      { href: "/admin/relatorios", label: "Relatórios", icon: "relatorios" },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { href: "/admin/usuarios", label: "Usuários", icon: "usuarios" },
      { href: "/admin/veiculos", label: "Veículos", icon: "carro" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireAdmin();
  const naoLidas = await prisma.notification.count({ where: { userId: u.id, lida: false } });
  return (
    <AppShell
      grupos={grupos}
      nome={u.name ?? ""}
      perfil="Administrador"
      notifHref="/admin/notificacoes"
      naoLidas={naoLidas}
    >
      {children}
    </AppShell>
  );
}
