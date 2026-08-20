# Google Agenda por usuária (multi-tenant) — diagnóstico e plano

## 1. Causa da limitação atual

`src/lib/google-calendar.server.ts` fala com o Google através de **duas variáveis de ambiente do projeto**: `LOVABLE_API_KEY` + `GOOGLE_CALENDAR_API_KEY`. Essas variáveis representam **uma única conexão**, a que você autorizou. Elas são globais do projeto — não existe versão "por workspace".

Como qualquer requisição usaria a sua agenda, a função `calendarConfigured(workspaceId)` foi escrita como uma trava de segurança:

```
workspaceId === legacyWorkspaceId()   // só o workspace mais antigo (o seu)
```

Ou seja: a limitação não é um bug, é uma proteção deliberada para a Solange não acabar lendo/gravando na sua agenda. Sem essa trava, todas as workspaces compartilhariam a mesma conta Google.

## 2. Existe estrutura no banco para conexão por workspace?

Não. Só existe `events.google_event_id` (id do evento criado no Google). Não há tabela nem coluna para guardar credencial/conexão de Google por `workspace_id`. Isso precisa ser criado.

## 3. Como está o conector hoje no Lovable

Hoje o projeto usa um **App Connector** (conector de aplicação): uma conexão da conta do construtor, injetada como segredo do projeto. É global por definição — não há como ter uma por workspace.

Existe, porém, um segundo mecanismo nativo: **App User Connector** para `google_calendar` (disponível e habilitado nesta workspace, hoje sem nenhum cliente OAuth configurado). Nele, você registra **um** cliente OAuth do Google uma vez, e **cada usuária final** faz o próprio consentimento; a Lovable guarda/renova o token dela e a chamada é feita "em nome" daquela usuária.

## 4. Recomendação

**Opção (a) — App User Connector `google_calendar`.** É a solução recomendada.

| | (a) App User Connector | (b) OAuth 2.0 próprio |
|---|---|---|
| Cliente OAuth no Google | 1, configurado uma vez | 1, configurado uma vez |
| Troca de código, refresh token, expiração | feito pela Lovable | você mantém no código |
| Armazenar credencial | chave opaca por usuária no seu banco | refresh token do Google no seu banco (dado sensível) |
| Risco de segurança | baixo | alto (custódia de tokens Google) |
| Complexidade | média | alta |

Não há vantagem real na (b) neste caso — ela só faria sentido se você quisesse sair da Lovable levando os tokens.

### Complexidade estimada
Média. O trabalho não está no OAuth em si, e sim em trocar **todos os pontos** que hoje assumem "uma agenda" por "a agenda daquele workspace": `google-calendar.server.ts`, `scheduling.server.ts`, o robô de cadência, o webhook da Meta (que roda sem usuária logada) e o card de Configurações.

## 5. O que decidir antes de eu implementar

1. **Verificação no Google.** Ler/criar eventos exige escopos sensíveis do Google Calendar. Com o app não verificado, o Google mostra aviso "app não verificado" e limita a ~100 contas de teste. Para muitas clientes, é preciso passar pela verificação do Google (leva dias/semanas). Decisão: começamos com contas de teste e verificamos depois, ou já iniciamos a verificação?
2. **Uso em segundo plano.** A EVA agenda sozinha via webhook e cron, sem ninguém logado. Isso exige que o cliente OAuth seja criado com **acesso offline habilitado** (consentimento com refresh). Se não for possível, a EVA só agenda quando a usuária estiver com a tela aberta — o que quebra a automação.
3. **Sua conexão atual.** Migro você para o novo fluxo (você reconecta sua agenda uma vez, como as demais) e removo o conector global, ou mantenho o antigo como fallback só para o seu workspace por um período?
4. **Quem conecta.** Qualquer usuária do workspace pode conectar a agenda, ou só o papel `admin` do workspace?

## 6. Plano técnico (executado só após sua autorização)

1. Criar o cliente OAuth do App User Connector para `google_calendar` (com acesso offline), incluindo `calendar` + `calendar.events` nos escopos.
2. Migração: tabela `google_calendar_connections` (`workspace_id` único, chave de conexão criptografada, e-mail da conta, `calendar_id`, datas), RLS + GRANTs, acesso apenas via server (nunca exposta ao navegador).
3. Novo módulo `src/lib/google-connection.server.ts`: salvar/ler/apagar a conexão por `workspace_id`.
4. Refatorar `google-calendar.server.ts`: toda função passa a receber `workspaceId` e usa a conexão daquele workspace; `calendarConfigured` deixa de comparar com o workspace legado e passa a checar se existe conexão.
5. Ajustar chamadas em `scheduling.server.ts`, cadência e webhook para repassar o `workspaceId`.
6. Configurações: botão "Conectar minha Google Agenda" (popup de consentimento), estado conectado com o e-mail da conta e botão "Desconectar", por workspace.
7. Testar: sua conta e uma segunda conta, confirmando que cada uma vê só a própria agenda.

Nada de CRM, exclusão de contatos, Cadência ou Meta/WhatsApp será alterado além do repasse do `workspaceId` nas chamadas de agenda.
