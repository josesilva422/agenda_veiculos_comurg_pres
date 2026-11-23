# Plano de Ação — Sistema de Agendamento de Veículos

## 1. Objetivo
Controlar o uso de veículos disponíveis: usuários solicitam o veículo (data/hora de início e fim), o administrador aprova ou rejeita, e todos acompanham pelo calendário.

## 2. Perfis e permissões

| Perfil | Pode |
|---|---|
| **Usuário** | Ver calendário, escolher veículo, solicitar data/hora, editar/cancelar a própria solicitação, ver o próprio termo de responsabilidade e histórico |
| **Administrador** | Tudo do usuário + aprovar/rejeitar, criar/editar/cancelar qualquer agendamento, cadastrar usuários e veículos, anexar termos, ver calendário (dia/semana/mês), gerar relatórios, ver auditoria |

## 3. Regras de negócio (a validar — ver item 9)

1. **Fluxo de status do agendamento**
   `PENDENTE → APROVADO | REJEITADO`; `APROVADO/PENDENTE → CANCELADO`; `APROVADO/PENDENTE → ALTERADO_AGUARDANDO` (após edição do usuário) `→ APROVADO | REJEITADO`.
2. **Conflito de horário**: um veículo não pode ter dois agendamentos *aprovados* sobrepostos. Pendentes podem coexistir, mas o admin é alertado do conflito ao aprovar; aprovar um bloqueia os demais conflitantes.
3. **Edição pelo usuário**: volta o agendamento para "Alteração pendente de aprovação" e gera notificação ao admin, mostrando o antes e depois.
4. **Termo de responsabilidade**: usuário só pode solicitar veículo se tiver termo anexado e válido (bloqueio configurável).
5. **Validações**: fim > início; não permitir datas no passado; antecedência mínima (configurável); veículo precisa estar ativo (não em manutenção/inativo).
6. **Veículo**: prefixo (único), placa (única, formato Mercosul/antigo), tipo, lotação, status (ativo / manutenção / inativo).
7. **Histórico/auditoria**: toda mudança de status e edição fica registrada (quem, quando, o que mudou).

## 4. Funcionalidades por módulo

### 4.1 Autenticação e usuários
- Login por e-mail/senha, recuperação de senha, perfil (usuário/admin).
- Admin: CRUD de usuários (nome, matrícula, e-mail, telefone, setor, CNH/validade, perfil, ativo/inativo).
- Anexo do **termo de responsabilidade** (PDF) no perfil, com data de assinatura e validade.

### 4.2 Veículos
- CRUD: prefixo, placa, tipo, lotação, status; (opcional) foto, observações.
- Inativar em vez de excluir quando houver histórico.

### 4.3 Agendamentos
- Formulário: veículo, data/hora início e fim, destino/motivo, nº de passageiros (≤ lotação).
- Verificação de disponibilidade em tempo real (mostra veículos livres no período).
- Usuário: lista "meus agendamentos", editar, cancelar.
- Admin: criar/editar/cancelar em nome de qualquer usuário.

### 4.4 Calendário
- Visões **dia, semana, mês** (e lista) com cores por status e filtro por veículo/usuário/status.
- Usuário vê ocupação dos veículos (sem dados sensíveis de terceiros); admin vê quem solicitou.
- Clique no evento abre detalhes; clique em horário livre abre nova solicitação.

### 4.5 Painel do administrador
- Fila de **solicitações pendentes** em destaque (solicitante, veículo, período, motivo, conflitos).
- Ações: aprovar, rejeitar (com justificativa), aprovar em lote.
- Indicadores: pendentes, veículos em uso hoje, próximos agendamentos.

### 4.6 Notificações
- In-app (sino/contador) para: nova solicitação, alteração, aprovação/rejeição, cancelamento.
- E-mail (fase posterior, opcional).

### 4.7 Relatórios
- Filtros: período, veículo, usuário, setor, status.
- Exportação **Excel (.xlsx)** e **PDF**.
- Relatórios: agendamentos por período, utilização por veículo, ranking de usuários, cancelamentos/rejeições.

### 4.8 Extras sugeridos
- Auditoria/log de ações, bloqueio de veículo para manutenção, check-in/check-out com km e combustível (fase futura), termo vencido em alerta.

## 5. Modelo de dados (resumo)

- **User**: id, nome, email, senhaHash, matrícula, telefone, setor, cnh, cnhValidade, perfil, ativo
- **TermoResponsabilidade**: id, userId, arquivo, assinadoEm, validoAte
- **Vehicle**: id, prefixo (único), placa (única), tipo, lotação, status, observações
- **Booking**: id, userId, vehicleId, inicio, fim, destino/motivo, passageiros, status, decididoPor, decididoEm, justificativa
- **BookingHistory**: id, bookingId, autorId, ação, dadosAntes, dadosDepois, criadoEm
- **Notification**: id, userId, tipo, bookingId, lida, criadoEm

## 6. Stack proposta

| Camada | Escolha | Motivo |
|---|---|---|
| Frontend + Backend | **Next.js (App Router) + TypeScript** | Um só projeto, fácil de publicar |
| UI | Tailwind CSS + shadcn/ui | Interface rápida e consistente |
| Calendário | **FullCalendar** | Visões dia/semana/mês prontas |
| Banco | **PostgreSQL** (SQLite em dev) via **Prisma** | Restrições e transações para evitar conflito de horário |
| Autenticação | Auth.js (NextAuth) | Sessões e perfis |
| Upload | Disco local/volume (termos em PDF); S3 compatível depois | Simples no início |
| Relatórios | exceljs (Excel) + PDF (react-pdf/pdfkit) | |
| Testes | Vitest (regras) + Playwright (fluxos principais) | |

> Alternativa se preferir outro ecossistema (Laravel, Django, .NET): o plano e o modelo de dados se mantêm.

## 7. Fases e entregas

| Fase | Entrega | Critério de pronto |
|---|---|---|
| **0. Alinhamento** | Responder dúvidas do item 9, definir stack | Decisões confirmadas |
| **1. Base** | Projeto, banco, autenticação, perfis, layout | Login funciona; rotas protegidas por perfil |
| **2. Cadastros** | CRUD de usuários (+ termo) e veículos | Admin cadastra; termo anexado e baixável |
| **3. Agendamento** | Solicitar, editar, cancelar, regra de conflito | Sem sobreposição aprovada; validações cobertas por testes |
| **4. Aprovação** | Fila do admin, aprovar/rejeitar, fluxo de alteração, histórico | Edição gera nova solicitação ao admin |
| **5. Calendário** | Dia/semana/mês, filtros, cores por status | Usuário e admin visualizam corretamente |
| **6. Relatórios** | Filtros + exportação Excel/PDF | Arquivos batem com os dados da tela |
| **7. Notificações e polimento** | Notificações in-app, auditoria, responsivo, acessibilidade | Fluxo ponta a ponta validado |
| **8. Publicação** | Deploy, backup, manual rápido | Sistema no ar com dados reais |

Ordem recomendada: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Ao fim da fase 5 já existe um MVP utilizável.

## 8. Estrutura de pastas prevista
```
agendamento_veiculo/
├─ prisma/            # schema e migrações
├─ src/app/           # páginas e rotas (admin/, usuario/, api/)
├─ src/components/    # calendário, formulários, tabelas
├─ src/lib/           # regras de agendamento, auth, relatórios
├─ uploads/           # termos de responsabilidade
└─ tests/
```

## 9. Pontos em aberto (assumirei o padrão indicado se não houver resposta)

1. Quantos veículos e usuários, aproximadamente? *(padrão: dezenas de veículos, centenas de usuários)*
2. Aprovação pendente bloqueia o horário para outros? *(padrão: não; só o aprovado bloqueia)*
3. Quem cria usuários: só o admin, ou autocadastro com aprovação? *(padrão: só o admin)*
4. Existe mais de um administrador? *(padrão: sim, múltiplos)*
5. Termo sem validade ou com vencimento? Bloquear solicitação se faltar? *(padrão: com validade; bloqueia)*
6. Precisa de motorista separado do solicitante, ou o solicitante dirige? *(padrão: solicitante dirige)*
7. Notificações por e-mail são necessárias já na primeira versão? *(padrão: só in-app)*
8. Onde será hospedado (servidor próprio, nuvem)? *(padrão: definir na fase 8)*
9. Existe limite de duração ou horário de funcionamento para os agendamentos? *(padrão: sem limite)*

## 10. Riscos
- **Conflito de horário concorrente**: tratar com transação e restrição no banco.
- **Fuso horário**: gravar em UTC, exibir em America/Sao_Paulo (ou local).
- **Dados pessoais (LGPD)**: termos e CNH acessíveis só ao próprio usuário e ao admin; arquivos fora da pasta pública.
- **Escopo crescente**: itens "extras" (4.8) ficam fora do MVP.
