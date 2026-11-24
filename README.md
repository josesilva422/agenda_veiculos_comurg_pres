# Agendamento de Veículos

Sistema web para solicitação, aprovação e controle de uso de veículos.

- **Usuário:** escolhe veículo, data e horário (e informa o motorista, se quiser); concorda com o Termo de Responsabilidade; edita ou cancela a própria solicitação; vê o calendário de ocupação.
- **Administrador:** aprova/rejeita, vê quem solicita, cadastra usuários e veículos, consulta calendário (dia/semana/mês), relatórios (Excel/PDF) e notificações. O aceite do termo de responsabilidade fica registrado em cada agendamento e consta nos relatórios.
- **Acesso:** login por e-mail ou matrícula; usuários novos recebem uma senha provisória aleatória, gerada pelo sistema, e trocam no primeiro acesso (8+ caracteres com letra, número e caractere especial).

Stack: Next.js 15 · TypeScript · Prisma + SQLite (desenvolvimento) / PostgreSQL no Supabase (produção) · Auth.js · FullCalendar · Tailwind · app instalável (PWA) · Vercel.

## Desenvolvimento

```bash
npm install
cp .env.example .env        # defina NEXTAUTH_SECRET
npm run db:setup            # cria o banco e dados de teste (admin@exemplo.com / admin123, usuario@exemplo.com / user123)
npm run dev                 # http://localhost:3000
```

Verificações: `npm test`, `npm run lint`, `npm run build`.

> As contas de teste existem **somente** em desenvolvimento. Não rode `db:seed` em produção.

## Documentação

- [Publicação, backup e restauração](docs/DEPLOY.md)
- [Manual de uso](docs/MANUAL.md)
- [Documentação técnica](docs/DOCUMENTACAO_TECNICA.md)
- [Plano de ação original](PLANO_DE_ACAO.md)

## Scripts

| Comando | Função |
|---|---|
| `npm run db:deploy` | Aplica migrações pendentes (produção) |
| `npm run admin:create` | Cria o primeiro administrador (variáveis `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`) |
| `npm run e2e` | Testes ponta a ponta (Playwright); veja a documentação técnica |
| `npm run backup` | Backup do banco (servidor próprio, SQLite) |
| `npm run db:pg:sync` | Gera `prisma/postgres/schema.prisma` (PostgreSQL) a partir do schema principal |
