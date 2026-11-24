# Manual de uso

## Para todos

### Entrar
- Informe **e-mail ou matrícula** e a senha. Após 5 tentativas erradas, aguarde 15 minutos.
- **Primeiro acesso:** quem acabou de ser cadastrado entra com a **senha padrão** (informada pelo administrador). O sistema abre a tela
  **"Crie sua senha de acesso"** e só libera o uso depois da troca. Em seguida, entre de novo com a senha nova.
- **Regra da senha** (LGPD): mínimo de **8 caracteres**, com **letra, número e caractere especial**; não pode ser a senha padrão.
- Esqueceu a senha? Peça ao administrador para **redefinir para a senha padrão**; no próximo acesso você cria uma nova.
- Se o seu cadastro for **desativado**, o acesso é encerrado imediatamente.

### Notificações (sino)
O número vermelho mostra as não lidas. Clique no sino: abre um **painel flutuante** com as últimas notificações.
Clique em uma para abri-la (ela é marcada como lida), use **Marcar todas como lidas** ou **Ver todas** para a página completa.
Esc ou um clique fora fecha o painel.

### Calendário
- Visões de mês, semana, dia e lista (no celular: mês, dia e lista).
- **Filtros:** veículo (placa e tipo) e, para o administrador, solicitante e status. **Limpar filtros** volta tudo ao padrão.
- **Clique em um dia** (ou em "+n") para abrir a lista de agendamentos daquele dia: horário, veículo, solicitante e status.
  Nesse pop-up há o botão **Novo agendamento neste dia**.
- Nas visões de semana e dia, **arraste em um horário livre** para solicitar já com início e fim preenchidos.
- No celular, as marcações do mês aparecem como barras coloridas; os detalhes ficam no pop-up do dia.
- **Horários:** sempre no horário de Brasília.

## Usuário

### Solicitar um veículo
1. Clique em **Novo agendamento** (no Calendário ou em **Meus agendamentos**) ou clique em um dia/horário do calendário.
   Abre um pop-up com o formulário, já preenchido quando você veio do calendário.
2. Preencha:
   - **Veículo** (placa e tipo);
   - **Início** e **Fim**: data e hora em campos separados (a hora é uma lista de 15 em 15 minutos);
   - **Destino / motivo**;
   - **Motorista** (opcional): nome de quem vai dirigir;
   - **Nº de passageiros** (incluindo motorista).
3. Marque **"Concordo com o Termo de Responsabilidade pelo uso e guarda de veículo"**. É **obrigatório**.
   Clique no texto do termo para lê-lo antes de concordar.
4. Envie. A solicitação fica **Pendente** até o administrador decidir, e você recebe uma notificação.

O horário e o aceite do termo ficam registrados no agendamento.
O sistema recusa: fim antes do início, início com menos de 30 minutos de antecedência, passageiros acima da lotação,
veículo indisponível ou já reservado (aprovado) no período. Se houver erro, o pop-up continua aberto com a mensagem e os dados preenchidos.

### Quilometragem (km)
A cada reserva aprovada, o próprio solicitante informa o **km inicial** (hodômetro na retirada) e o **km final** (na devolução).
- Em **Meus agendamentos**, use **Informar km** (ou **Editar km**) na reserva. Abre um pop-up; também abre ao clicar na notificação de lembrete.
- O km inicial pode ser informado assim que a reserva é aprovada; o **km final só depois do início do uso**.
- O sistema **confere os números** com os registros anteriores do mesmo veículo: o km final não pode ser menor que o inicial, e o hodômetro
  não pode "andar para trás" em relação ao último km registrado (nem passar do km já registrado na reserva seguinte). Digite só números.
  Se o sistema recusar um número que você tem certeza que está certo, peça ao administrador para corrigir.
- Em branco no pop-up mantém o que já estava registrado.
- **Lembretes:** se o uso já começou e falta o km inicial, ou já terminou e falta o km final, aparece um aviso amarelo no topo de
  **Meus agendamentos** e chega uma **notificação** (repetida a cada 24 horas enquanto faltar).

### Ver os detalhes
Em **Meus agendamentos**, cada agendamento tem o link **Detalhes**, que abre um pop-up com tudo sobre ele: status, veículo (placa e tipo completo),
período, destino, motorista, passageiros, quilometragem, aceite do termo, quando foi solicitado, quem decidiu e a justificativa. No pop-up há atalhos para informar o km e para editar.
Nos cartões o tipo do veículo aparece resumido (por exemplo "Strada Freedom Cabine…"); o nome completo está nos detalhes.

### Editar ou cancelar
Em **Meus agendamentos** (no celular, um cartão por agendamento), use **Editar** ou **Cancelar** (somente antes do início).
Editar uma reserva já aprovada gera **Alteração pendente**: o administrador precisa aprovar.
Se ele rejeitar a alteração, a reserva original continua valendo.

### Cores no calendário
Laranja: sua solicitação pendente · Azul: sua alteração pendente · Verde: sua reserva aprovada · Cinza: ocupado por outra pessoa.

### Meu perfil
Seus dados (nome, matrícula, telefone, cargo, lotação, contato, CNH) e a troca de senha
(mesma regra: 8+ caracteres com letra, número e caractere especial).

## Administrador

### Painel
Quatro indicadores: **pendentes de decisão**, **concluídos no mês**, **aprovados a concluir** e **reservas sem km**.
- **Solicitações pendentes:** aprovar em lote ou abrir uma a uma.
- **Aprovados a concluir:** reservas aprovadas que ainda não terminaram, em ordem de data (as que já começaram levam a etiqueta "em andamento").
- **Concluídos no mês:** reservas aprovadas que terminaram desde o dia 1º do mês corrente.
- Cada lista mostra as 10 primeiras, com **Abrir** para ver os detalhes e **Ver todos** para abrir a lista completa já filtrada.
Um agendamento é considerado concluído quando está aprovado e o horário de fim já passou.
A seção **Quilometragem pendente** lista as reservas em que falta o km inicial ou final; **Abrir** leva ao pop-up para o administrador incluir ou cobrar.

### Aprovar ou rejeitar
- **Aprovar selecionadas** aprova várias de uma vez. Solicitações com **Conflito** (outra reserva aprovada no mesmo horário) não podem ser aprovadas.
- **Analisar** (ou **Abrir**, na lista de agendamentos, ou um clique no evento do calendário) abre um **pop-up** com a solicitação:
  solicitante, veículo, período, motorista, passageiros, **aceite do termo**, conflitos e, nas alterações, o antes e o depois.
  Aprove ou rejeite ali mesmo; rejeitar exige justificativa, que o usuário recebe.
- **Cancelar solicitação aprovada (substituição):** quando a solicitação está em conflito, o pop-up mostra a seção **Cancelar solicitação aprovada**, com o usuário que será notificado
  (nome e período). Marque a confirmação, escreva o **motivo da substituição** e clique em **Cancelar a reserva em conflito e aprovar esta**: a reserva aprovada é cancelada, a nova é aprovada,
  e os dois solicitantes são avisados por notificação. Tudo acontece de uma vez; se a aprovação não puder ser feita, nenhum cancelamento é mantido.
- Uma alteração rejeitada restaura a reserva aprovada anterior (incluindo o motorista).
- Em reservas aprovadas, a seção **Quilometragem** mostra o último km registrado do veículo, avisa o que o solicitante ainda não informou e permite
  **incluir ou corrigir** o km inicial e final (campo em branco apaga). Se alterar o km de outra pessoa, ela recebe uma notificação.
  Percursos acima de 1.000 km aparecem destacados para conferência.
- Em reservas ativas, o pop-up também tem **Editar dados** e, nas já aprovadas, **Cancelar agendamento** (com motivo opcional; o usuário é avisado).

### Agendamentos
- **Filtros:** lista de **Status** (com a quantidade de cada um; aplica ao escolher), datas **De** e **Até**, e atalhos **Hoje**, **Semanal** (segunda a domingo)
  e **Mensal**. **Limpar filtros** volta ao padrão.
- A lista é **dividida por dia**, com horário, solicitante, veículo, destino e status.
- **Novo agendamento** abre o pop-up; o administrador escolhe o **solicitante** e o agendamento já nasce **aprovado**
  (sem o aceite do termo, que é do solicitante).

### Usuários
- **Novo usuário** e **Editar** abrem pop-ups. Campos obrigatórios: nome completo, e-mail, perfil, **matrícula** (única), telefone, cargo, **lotação** e contato.
  **CNH e validade são opcionais.**
- O campo **Senha inicial** (ao lado da Lotação) já vem com a **senha padrão** do sistema; pode ser trocada por outra que siga a regra da senha.
  O usuário é obrigado a trocá-la no primeiro acesso. Informe a senha a ele.
- Na edição, se o usuário **ainda não fez o primeiro acesso**, um aviso amarelo mostra a senha padrão (ou informa que a senha foi definida pelo administrador).
  O campo **Nova senha (só para redefinir)** define uma nova senha provisória; em branco, mantém a atual. Também vale o botão **Redefinir para a senha padrão**.
- Na edição, **Redefinir para a senha padrão** volta a senha (para quem esqueceu); ele troca no próximo acesso. Não vale para a própria conta (use Meu perfil).
- **Desativar** impede o acesso na hora, sem apagar o histórico. **Reativar** devolve o acesso.
- O termo de responsabilidade não é anexado ao usuário: o **aceite eletrônico** é feito pelo próprio solicitante a cada agendamento e fica registrado nele.

### Veículos
**Novo veículo** e **Editar** abrem pop-ups. Prefixo (único), placa (única), tipo, lotação, **contrato** (opcional), status e observações. O contrato aparece na lista de veículos e nos relatórios (Excel e PDF).
Status: **Ativo**, **Em manutenção** ou **Inativo** (os dois últimos não aceitam novas solicitações).

### Calendário
Filtros por veículo, solicitante e status, **Novo agendamento** e o pop-up do dia (veja "Para todos"). Clique em um evento para decidir ou editar.

### Relatórios
Escolha o período e os filtros (veículo, solicitante, lotação, status). A tela mostra o resumo (total de agendamentos, horas aprovadas e quantidade por status).
**Exportar Excel** e **Exportar PDF** trazem a lista completa, incluindo **Motorista**, **Km inicial**, **Km final**, **Percurso (km)** e **Termo aceito em** (data e hora do aceite de cada agendamento;
"Não registrado" para reservas sem aceite, como as criadas pelo administrador).

## Dados e privacidade
- A tela de login traz o link **Aviso de privacidade LGPD**, que abre um pop-up: os dados pessoais servem apenas ao controle de uso dos veículos da Comurg.
- Todos os usuários logados veem o nome do solicitante nas reservas aprovadas do calendário.
- Senhas são guardadas de forma criptografada; nunca aparecem no sistema.
- Notificações lidas há mais de 30 dias são apagadas automaticamente.
