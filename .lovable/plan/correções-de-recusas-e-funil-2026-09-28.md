# Correções de recusas e funil

## Objetivo
Corrigir somente os três pontos solicitados, preservando dados e as demais automações.

## Alterações
- Fortalecer a identificação de respostas negativas curtas e variações comuns de “não”, garantindo que recusas sejam classificadas como **Perdido**, saiam da cadência e fiquem bloqueadas para novos contatos.
- Na ficha individual, tornar o direcionamento manual mais claro e funcional para as colunas de **Pré-venda** e **Venda**, com confirmação visual e atualização imediata do funil.
- Remover **Nova tentativa em 90 dias** apenas do **Funil (atual)**, mantendo essa coluna exclusivamente em **Pré-venda** e sem excluir ou alterar contatos existentes.

## Validação
- Testar a classificação com respostas negativas representativas e confirmar que frases não negativas não sejam capturadas indevidamente.
- Verificar na ficha que o direcionamento manual salva e atualiza as colunas corretas.
- Confirmar que a coluna de 90 dias aparece em Pré-venda e não aparece mais no Funil atual.
- Conferir a página em desktop e celular e garantir que não haja erros na versão atualizada.

## Detalhes técnicos
- Centralizar as variações de recusa na regra já usada pelo recebimento de mensagens, sem criar fluxo paralelo.
- Retirar a etapa antiga `reativar_60` da lista visual do funil principal; nenhum registro será apagado.
- Reutilizar os campos existentes `presale_stage` e `sales_stage` no direcionamento manual da ficha.
