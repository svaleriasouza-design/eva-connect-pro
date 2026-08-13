# EVA Pro Companion

crie um app com esse PROMPT MESTRE – EVA IA V1

Objetivo do Projeto

Criar um sistema web responsivo chamado EVA IA, uma assistente executiva com inteligência artificial voltada para prospecção comercial B2B, gestão de clientes e agendamento de reuniões do programa Bio Impact.

O sistema deverá funcionar em computador e celular.

A primeira versão deverá conter apenas os módulos descritos abaixo.

MENU LATERAL

Criar um menu lateral contendo:

 Dashboard

 CRM

 Empresas

 WhatsApp

 Agenda

 Histórico

 Funil

 EVA IA

 Tarefas

 Configurações

MÓDULO CRM

Este será o módulo principal.

Cada cliente possuirá uma ficha completa.

Campos:

 Nome

 Empresa

 WhatsApp

 Telefone

 E-mail

 Instagram

 Cidade

 Data de nascimento

 Profissão

 Filhos

 Objetivo

 Dor principal

 Origem do contato

 Instagram

 Facebook

 Site

 Evento

 Indicação

 Outro

 Serviço de interesse

 Status do funil

 Último contato

 Próxima ação

 Observações

 Arquivos anexos

Botões:

 Novo Cliente

 Editar

 Excluir

 Importar Contatos

 Exportar

O sistema deverá permitir importar listas em:

 CSV

 Excel

FICHA DO CLIENTE

Cada cliente deverá possuir uma tela própria.

Mostrar:

Dados cadastrais

Linha do tempo

Último contato

Próxima ação

Observações

Arquivos

Botões:

Enviar WhatsApp

Agendar reunião

Criar tarefa

Mover no funil

Perguntar para EVA

MÓDULO WHATSAPP

Criar um módulo de cadência.

O sistema deverá permitir selecionar uma lista de contatos.

Configurações:

Quantidade de mensagens por dia

Intervalo entre mensagens

Exemplo

3 minutos

5 minutos

7 minutos

10 minutos

Nunca enviar mensagens simultaneamente.

Se o cliente responder:

Parar automaticamente a cadência.

Mover automaticamente para:

RESPONDIDO

CADÊNCIA

Criar biblioteca de mensagens.

Categorias:

Dia 1

Dia 2

Dia 3

Dia 4

Dia 5

No Show

Lembretes

Qualificação

Quebra de objeções

Fechamento

Importância

Reativação

Cada categoria armazenará os textos fornecidos pelo usuário.

A IA deverá escolher automaticamente uma variante disponível para reduzir repetição.

IA

Criar uma assistente chamada EVA.

A EVA deverá conseguir:

Responder mensagens.

Sugerir respostas.

Criar mensagens.

Criar propostas.

Criar apresentações.

Escrever e-mails.

Resumir conversas.

Organizar agenda.

Criar tarefas.

Lembrar follow-ups.

Identificar clientes esquecidos.

Mostrar aniversários.

Responder dúvidas sobre Bio Impact.

Responder dúvidas sobre Terapia.

Preparar reuniões.

AGENDA

Visualização

Hoje

Semana

Mês

Eventos:

Sessão

Workshop

Reunião

Mentoria

Follow-up

Lembrete

Campos:

Cliente

Empresa

Data

Hora

Local

Link Google Meet

Status

LEMBRETES

Criar lembretes automáticos.

Após agendamento

1 dia antes

4 horas antes

1 hora antes

10 minutos antes

No Show

Os textos utilizados serão exatamente aqueles cadastrados pelo administrador.

Caso dois lembretes coincidam no mesmo horário, espaçar automaticamente o envio em 20 minutos.

HISTÓRICO

Toda interação deverá ficar registrada em ordem cronológica.

Registrar:

WhatsApp

E-mail

Reuniões

Propostas

Contratos

Pagamentos

Observações

Resumos gerados pela IA

FUNIL

Criar funil em formato Kanban.

Etapas:

Novo Lead

Primeiro Contato

Qualificado

Reunião Agendada

Proposta Enviada

Fechado

Cliente Ativo

Pós-venda

Permitir mover clientes arrastando entre as etapas.

MÓDULO EMPRESAS

Cada empresa deverá possuir uma ficha.

Campos:

Nome

Responsável

Telefone

E-mail

Segmento

Cidade

Número de colaboradores

Diagnóstico

Última reunião

Próxima reunião

Propostas

Contratos

Treinamentos

Resultados

Renovação

Cada empresa poderá possuir vários contatos vinculados.

DASHBOARD

Ao entrar no sistema mostrar:

Quantidade de novos leads

Mensagens pendentes

Follow-ups pendentes

Reuniões de hoje

No Shows

Propostas pendentes

Clientes ativos

Agenda do dia

A IA deverá mostrar sugestões como:

"Há clientes sem contato há mais de 15 dias."

"Existem follow-ups atrasados."

"Você possui reuniões hoje."

IMPORTAÇÃO DE CONTATOS

Criar botão:

IMPORTAR CONTATOS

Permitir importar:

CSV

Excel

Cada linha deverá criar automaticamente um novo lead.

PERFIS DE ACESSO

Administrador

 Acesso total.

Secretária

 CRM

 Agenda

 WhatsApp

 Histórico

Terapeuta

 Apenas seus clientes

 Agenda

 Histórico

REGRAS DA IA

Quando um cliente responder no WhatsApp:

 Parar imediatamente a cadência.

 Registrar o horário da resposta.

 Alterar o status para "Respondido".

 Sugerir uma resposta baseada no histórico da conversa.

Quando um cliente solicitar para não receber mais mensagens:

 Encerrar imediatamente a cadência.

 Marcar o contato como "Não contatar".

 Não permitir novos envios automáticos para esse contato.

OBJETIVO DA PRIMEIRA VERSÃO

O foco da versão 1 é permitir que uma única usuária (Valéria) organize seus leads, acompanhe empresas, gerencie cadências, agende reuniões, mantenha o histórico dos contatos e utilize uma assistente de IA para apoiar a prospecção e o acompanhamento comercial.

Minha única sugestão de melhoria

Há apenas uma funcionalidade que eu incluiria porque ela economiza muito tempo e está totalmente alinhada ao que você quer vender.

Na tela do cliente, adicionar um botão:

"Próxima Melhor Ação"

Ao clicar, a EVA analisa o histórico daquele cliente e sugere o próximo passo, por exemplo:

 "Enviar a mensagem do Dia 3."

 "Ligar para este contato."

 "Agendar uma reunião."

 "Enviar a proposta."

 "Reativar este lead."

 "Mover para 'Perdido'."

Essa funcionalidade aproveita a IA para organizar sua rotina comercial sem alterar a estrutura do sistema que você definiu. Ela apenas ajuda você a decidir qual ação tomar em cada lead.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://eva-connect-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/90136cc5-512a-4924-accd-a888fd73d8e5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
