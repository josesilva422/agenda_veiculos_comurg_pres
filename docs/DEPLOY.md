# Publicação, backup e restauração

Há dois caminhos. O **principal** é **Vercel + Supabase** (sistema online, instalável no celular). A alternativa é um
servidor próprio com Docker/Node (SQLite), descrita mais abaixo.

## Principal — Vercel + Supabase (PostgreSQL) + app instalável

O projeto já está preparado; faltam apenas as contas e as chaves. Em desenvolvimento continua tudo local (SQLite), sem mudar nada.

### Como funciona
| Parte | Local (desenvolvimento) | Produção |
|---|---|---|
| Banco | SQLite (`prisma/dev.db`) | PostgreSQL do Supabase |
| Limite de tentativas de login | tabela no banco | tabela no banco |
| Reservas aprovadas sem sobreposição | conferido pelo sistema | conferido pelo sistema **e** pelo banco (regra `booking_no_overlap`) |

O `schema.prisma` principal (SQLite) é a fonte única. O comando `npm run db:pg:sync` gera `prisma/postgres/schema.prisma`
(mesmo modelo, provedor PostgreSQL). As migrações de produção ficam em `prisma/postgres/migrations/`
(`0001_init` = todas as tabelas; `0002_sem_sobreposicao` = regra que impede duas reservas aprovadas no mesmo horário; `0003_rls` = bloqueia o acesso às tabelas pela API pública do Supabase).
Elas foram testadas em um PostgreSQL de verdade: encostar horários (fim = início) é permitido; sobrepor reserva aprovada, não.

### 1. Supabase (você cria)
1. Crie o projeto (região **São Paulo**, `sa-east-1`) e guarde a senha do banco.
2. Em **Project Settings → Database → Connection string**, copie duas conexões:
   - **Transaction pooler** (porta 6543) → será a `DATABASE_URL`; acrescente no fim `?pgbouncer=true&connection_limit=1`.
   - **Direct / Session** (porta 5432) → será a `DIRECT_URL` (usada só nas migrações).
3. Backup: o plano **Free não tem backup automático**; o **Pro** faz backup diário. Para dados reais, use o Pro.

#### Criar as tabelas sem usar comandos (opcional)
Em vez de `npm run db:pg:deploy`, dá para abrir `prisma/postgres/supabase-sql-editor.sql`, copiar tudo e colar no **SQL Editor** do Supabase
(Run, uma vez, em projeto vazio). O arquivo já registra as migrações para o Prisma, então nada mais é necessário.
Se as migrações mudarem, gere o arquivo de novo com `npm run db:pg:sql`.

### 2. Vercel
1. Importe o repositório. O `vercel.json` já define o comando de build (`npm run vercel-build`) e a região `gru1` (São Paulo).
2. Em **Settings → Environment Variables**, cadastre:

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | conexão 6543 do Supabase (com `?pgbouncer=true&connection_limit=1`) |
   | `DIRECT_URL` | conexão 5432 do Supabase |
   | `NEXTAUTH_URL` | `https://seu-dominio` |
   | `NEXTAUTH_SECRET` | 48+ caracteres aleatórios (`node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`) |
   | `SENHA_PADRAO` | opcional (padrão `Comurg@2026`) |

3. Faça o deploy. O build gera o cliente PostgreSQL, **aplica as migrações** e compila. Em produção o sistema se recusa a iniciar
   se faltar alguma configuração (banco PostgreSQL, Supabase, segredo).
4. Crie o primeiro administrador (no seu computador, apontando para o banco de produção):

   ```bash
   DATABASE_URL="<conexão 5432>" DIRECT_URL="<conexão 5432>" ADMIN_NAME="Fulano" ADMIN_EMAIL=fulano@empresa.com ADMIN_PASSWORD='senha-forte-10+' \
     npx tsx scripts/create-admin.ts
   ```

   (O script usa o cliente gerado; antes, rode uma vez `npx prisma generate --schema prisma/postgres/schema.prisma`.)
5. Monitoramento: `GET /api/health`.

### Alterar o modelo de dados depois do primeiro deploy
Edite `prisma/schema.prisma`, crie a migração local (`npx prisma migrate dev`) **e** a de produção:
`npm run db:pg:sync` e depois `npx prisma migrate dev --schema prisma/postgres/schema.prisma --name descricao` (com `DATABASE_URL`/`DIRECT_URL`
de um banco de desenvolvimento do Supabase). O deploy aplica automaticamente. Antes do primeiro deploy, se o modelo mudar, basta refazer a
migração `0001_init`: `npm run db:pg:sync` e
`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/postgres/schema.prisma --script --output prisma/postgres/migrations/0001_init/migration.sql`.

### Instalar no celular (app)
O sistema é um app instalável (PWA): em **Chrome (Android)**, abra o endereço, menu ⋮ → **Instalar app** / **Adicionar à tela inicial**;
no **iPhone (Safari)**, botão compartilhar → **Adicionar à Tela de Início**. Exige HTTPS (a Vercel já entrega).
O app só guarda o visual; **os dados nunca ficam salvos no aparelho** (LGPD). Sem internet, aparece uma página de aviso.

#### Segurança — checklist (servidor próprio) (Vercel/Supabase)
- [ ] `DATABASE_URL` e `DIRECT_URL` (contêm a senha do banco) apenas nas variáveis da Vercel, nunca no código nem no GitHub.
- [ ] Nenhuma conta de teste (`admin@exemplo.com`) no banco de produção; não rode `db:seed` em produção.
- [ ] Plano Pro do Supabase (backup diário) ou cópia periódica do banco para fora.
- [ ] Domínio com HTTPS e `NEXTAUTH_URL` com `https://`.

## Alternativa — servidor próprio (Docker ou Node, SQLite)

O sistema usa **SQLite** (um arquivo). É adequado para uso interno
(dezenas de veículos, centenas de usuários) em **um único servidor**.

### Opção A — Docker

Requisitos: Docker e Docker Compose no servidor, e um proxy HTTPS (Caddy, Nginx, Traefik…) na frente.

1. Copie o projeto para o servidor.
2. Crie `.env.production` (modelo em `.env.example`):

   ```env
   NEXTAUTH_URL=https://agendamento.suaempresa.com.br
   NEXTAUTH_SECRET=<48+ caracteres aleatórios>
   ```

   Gere o segredo: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`.
   Em produção o sistema **se recusa a iniciar** com segredo ausente, curto ou de exemplo.

3. Suba:

   ```bash
   docker compose up -d --build
   ```

   As migrações são aplicadas automaticamente na inicialização. Dados ficam no volume `dados` (`/data`).

4. Crie o primeiro administrador:

   ```bash
   docker compose exec -e ADMIN_NAME="Fulano" -e ADMIN_EMAIL=fulano@empresa.com -e ADMIN_PASSWORD='senha-forte-10+' app npm run admin:create
   ```

5. Configure o proxy HTTPS apontando para a porta 3000 do contêiner e acesse a URL.
   Monitoramento: `GET /api/health` responde `{"status":"ok"}` (200) ou 503.

### Atualizar versão

```bash
docker compose run --rm app npm run backup   # backup antes de atualizar
docker compose up -d --build                 # reconstrói e aplica migrações
```

### Opção B — Servidor Node sem Docker

```bash
npm ci
export DATABASE_URL="file:/var/lib/agendamento/app.db" \
       NEXTAUTH_URL=https://... NEXTAUTH_SECRET=...
npm run db:deploy && npm run build
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create
npm run start        # use systemd/pm2 para manter em execução
```

### Backup (servidor próprio)

`npm run backup` gera `backups/<data-hora>/` com `banco.db` (cópia consistente, mesmo com o sistema em uso)
Mantém os últimos `BACKUP_KEEP_DAYS` dias (padrão 14).

Agende diariamente e **copie para fora do servidor** (outro disco, nuvem). Exemplo (cron, 02:00):

```cron
0 2 * * * cd /opt/agendamento && docker compose exec -T app npm run backup
```

No Docker os backups ficam em `/data/backups` (dentro do volume). Para copiar:
`docker compose cp app:/data/backups ./backups-copia`.

Os backups contêm dados pessoais (LGPD): proteja-os com acesso restrito.

### Restauração (servidor próprio)

1. Pare o sistema: `docker compose stop app`.
2. Substitua o banco pelo do backup escolhido (no volume `/data`): `app.db` ← `banco.db`.
3. Inicie: `docker compose start app`. Teste o login.

Faça um teste de restauração antes de depender do backup.

## Segurança — checklist

- [ ] HTTPS ativo (`NEXTAUTH_URL` com `https://`).
- [ ] `NEXTAUTH_SECRET` exclusivo e secreto.
- [ ] Nenhuma conta de teste (`admin@exemplo.com`) no banco de produção.
- [ ] Backups diários copiados para fora do servidor.
- [ ] Porta 3000 acessível só pelo proxy (não exposta diretamente na internet).
- [ ] Login bloqueia por 15 min após 5 tentativas erradas do mesmo e-mail.
- [ ] Atualizar dependências periodicamente (`npm audit`).

## Limitações conhecidas

- Sem envio de e-mail nem "esqueci a senha": o admin usa "Redefinir para a senha padrão" na edição do usuário.
- Notificações apenas dentro do sistema.
