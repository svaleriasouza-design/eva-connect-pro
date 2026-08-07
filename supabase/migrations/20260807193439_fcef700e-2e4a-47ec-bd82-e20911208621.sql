update public.contacts
set do_not_contact = true, cadence_active = false, status = 'perdido', funnel_stage = 'perdido',
    next_action = null, next_action_at = null, updated_at = now()
where id = 'a0e3c641-f3a2-47fc-9e8e-189d9520c282';

insert into public.activities (contact_id, workspace_id, kind, title, content)
select c.id, c.workspace_id, 'nota', 'Auditoria: pedido de remoção não reconhecido',
 'Auditoria retroativa da EVA identificou pedido de remoção ("Não precisamos" / "Pode retirar o numero da lista"). Lead marcado como não entrar em contato, cadência encerrada e movido para Perdido.'
from public.contacts c where c.id = 'a0e3c641-f3a2-47fc-9e8e-189d9520c282';

update public.cadence_settings set automation_enabled = false, updated_at = now() where automation_enabled = true;