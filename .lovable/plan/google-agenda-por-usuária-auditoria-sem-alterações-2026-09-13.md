# Google Agenda por usuária — auditoria (sem alterações)

Nada foi alterado: nem código, nem banco, nem a conexão privada atual.

## 1. Como está hoje

- A agenda usa **uma única conta Google** (a sua), guardada como chave do projeto inteiro.
- `src/lib/google-calendar.server.ts` é o único ponto que fala com o Google. Todas as funções (consultar disponibilidade, criar, remarcar, cancelar) usam essa mesma conta, sem saber quem é a usuária.
- Existe uma trava deliberada: a agenda só é liberada para o workspace mais antigo (o seu). É por isso que as outras usuárias veem "não conectado".
- Quem chama a agenda hoje: a tela Agenda, o card de Configurações, o robô de sábado, o roteador de mensagens do WhatsApp (webhook) e a central de agendamento.

## 2. O novo conector — como fica o vínculo

O cliente OAuth por usuária final já está cadastrado e ligado a este projeto, com **acesso offline habilitado** (permite a EVA agendar sozinha depois).

No novo fluxo:

1. A usuária clica em "Conectar minha Google Agenda" em Configurações.
2. Abre uma janela com a tela oficial de consentimento do Google.
3. O Google devolve a autorização para a Lovable, que guarda e renova o acesso.
4. A EVA recebe uma **credencial própria daquela usuária**, guardada de forma cifrada e ligada ao ID da conta dela na EVA.
5. Toda chamada ao Google carrega a credencial da usuária que está pedindo — nunca a de outra. Uma usuária sem conexão simplesmente vê "não conectado".

Isolamento: a credencial é buscada pelo ID autenticado da usuária no servidor. Não há como o navegador pedir a de outra pessoa, e a credencial nunca chega ao navegador.

## 3. Ponto que preciso confirmar com você

Para o acesso offline funcionar (EVA agendando sozinha pelo WhatsApp e pelo robô, sem ninguém logado), a autorização de cada usuária **precisa ser guardada no banco da EVA**, cifrada. Isso exige **uma tabela nova** (só leitura/escrita pelo servidor, nunca pelo navegador).

Você pediu para não criar tabelas. Então há duas saídas:

- **(A) Autorizar a tabela nova** — fluxo completo: conexão por usuária + automações em segundo plano. Recomendado.
- **(B) Sem tabela nova** — não é possível guardar a autorização; a agenda funcionaria só enquanto a usuária estivesse com a tela aberta, e a EVA deixaria de agendar sozinha pelo WhatsApp. Isso quebra a automação atual.

Não existe caminho que atenda "por usuária + offline" sem armazenamento próprio.

## 4. O que será alterado (se você aprovar A)

- **Nova tabela** `google_calendar_connections`: uma linha por usuária (ID da usuária, workspace, autorização cifrada, e-mail da conta Google, datas). Acesso apenas pelo servidor.
- **Novo arquivo** com os ajudantes do conector por usuária (início do consentimento, chamada ao Google em nome da usuária, desconectar).
- **Nova página de retorno** do consentimento (janela pop-up que fecha sozinha).
- **`src/lib/google-calendar.server.ts`**: cada função passa a receber a identificação da usuária/dona da agenda em vez de usar a conta única do projeto.
- **`src/lib/scheduling.server.ts`**, **`src/lib/saturday.server.ts`**, **`src/lib/inbound-router.server.ts`**, **`src/lib/calendar.functions.ts`**: repassar essa identificação. No webhook e no robô (sem ninguém logado), a agenda usada será a da usuária responsável pelo contato/workspace.
- **`src/components/google-calendar-card.tsx`**: botão "Conectar minha Google Agenda", estado conectado com o e-mail da conta, botão "Desconectar" e "Reconectar" quando o Google expirar.
- **Permissão**: qualquer usuária autenticada do workspace pode conectar a própria agenda, como você pediu.

Não será alterado: CRM, Cadência, Disparos, Meta/WhatsApp, Funil, Histórico. A conexão privada antiga permanece intocada por enquanto.

## 5. Um passo seu no Google Cloud

No cliente OAuth criado, em "URIs de redirecionamento autorizadas", precisa constar exatamente:

```text
https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback
```

Sem isso, o Google recusa o consentimento de todas as usuárias.

## 6. Teste previsto

Sua conta e uma segunda conta conectam; cada uma vê e cria eventos só na própria agenda; uma terceira sem conectar continua vendo "não conectado".
