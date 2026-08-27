# Funil com abas "Pré-venda" e "Venda" — diagnóstico e plano

## 1. Como funciona a etapa hoje

Existe **uma única** coluna `funnel_stage` (texto) na tabela `contacts` (e também em `companies`, replicada por trigger). As 9 etapas atuais estão fixadas em código em `src/lib/db.ts` (`FUNNEL_STAGES`):

Novo Lead, Primeiro Contato, Qualificado, Reunião Agendada, Proposta Enviada, Fechado, Cliente Ativo, Pós-venda, Reativar em 60 dias.

Essa coluna é usada por muito mais coisa do que o Funil:

- **Cadência automática**: o motor só entra leads `novo_lead` (`cadence-runner.server.ts`, `cadence.functions.ts`) e marca `reativar_60` no fim da cadência.
- **Agendamento/IA**: `scheduling.server.ts` move o lead de etapa quando marca reunião; `inbound-router.server.ts` marca `perdido` no opt-out.
- **Webhook Meta**: cria lead novo já como `novo_lead`.
- **Dashboard**: contadores de clientes ativos, propostas, novos leads, reuniões agendadas.
- **CRM, Empresas, Agenda, Disparos, EVA IA**: filtros, badges, seletor de etapa, contexto da IA.

## 2. Conflito com a proposta

Sim, há conflito direto: as duas listas novas (12 + 8 etapas) não são compatíveis com os valores que a cadência, a IA e o dashboard esperam. Reaproveitar `funnel_stage` para o novo Kanban quebraria cadência, agendamento e métricas.

## 3. Componente Kanban

Não existe componente reutilizável. O único Kanban é o próprio `src/routes/_authenticated/funil.tsx`, com drag-and-drop nativo HTML5 (`draggable` + `onDrop`), simples e suficiente. O plano extrai esse padrão para um componente único de board reutilizado pelas duas abas.

## 4. Abordagem recomendada — opção (a) com campos novos e separados

Recomendo **não** criar tabela nova (o vínculo é 1 lead → 1 posição por board) e **não** reaproveitar `funnel_stage`. Em vez disso, dois campos novos em `contacts`:

- `presale_stage` (texto, nullable) — etapas da aba Pré-venda
- `sales_stage` (texto, nullable) — etapas da aba Venda

Vantagens: zero risco para cadência/IA/dashboard, um lead pode estar nos dois quadros (pré-venda concluída → aparece em Venda), consultas simples e indexáveis, e a coluna "Etapa" atual do CRM continua intocada.

## 5. Escopo da implementação (depois da sua autorização)

1. Migração: adicionar `presale_stage` e `sales_stage` em `contacts`, com índices por workspace + etapa. Nada é apagado.
2. `src/lib/db.ts`: adicionar `PRESALE_STAGES` e `SALES_STAGES` com as etapas exatas que você listou, na ordem informada.
3. Extrair `KanbanBoard` (colunas, contagem real por etapa, cards arrastáveis, link para o CRM) de `funil.tsx`.
4. `funil.tsx`: três abas — "Funil (atual)", "Pré-venda", "Venda" — cada uma com seu board. Arrastar grava apenas o campo do respectivo board.
5. Coluna "Sem etapa" opcional em cada aba para leads ainda não classificados (assim os quadros não nascem vazios com 30k+ contatos).

## 6. Automação ao mover card

Recomendação para esta etapa: **apenas organização visual manual**, nenhuma automação. Motivo: "Iniciar cadência" disparando envio real ao arrastar um card é exatamente o tipo de gatilho que causou o disparo acidental de domingo. Se quiser, num segundo momento adiciono automações explícitas com modal de confirmação.

## 7. Complexidade

Baixa/média: 1 migração simples + 1 componente novo + refactor de uma tela. Sem impacto em WhatsApp, Meta, Google Calendar, Configurações ou exclusão de contatos.

## 8. Decisões que preciso de você

1. Manter a aba do Funil atual (9 etapas) junto das duas novas, ou esconder ela?
2. Leads existentes devem entrar em alguma etapa inicial de Pré-venda (ex: "Recebimento de leads") ou ficar em "Sem etapa" até você mover?
3. Confirmar: sem nenhuma automação ao mover cards nesta primeira versão?
