/*
# Revoke EXECUTE from PUBLIC on delete_contacts functions

## Motivo
O REVOKE FROM anon removeu o acesso do role anon, mas o role PUBLIC ainda
concede EXECUTE para qualquer role autenticado no banco. Como a função é
SECURITY DEFINER e valida auth.uid() internamente, o risco é mitigado, mas
é melhor prática remover o grant de PUBLIC para deixar explícito que apenas
authenticated tem acesso.

## Mudanças
- REVOKE EXECUTE ON delete_contacts FROM PUBLIC
- REVOKE EXECUTE ON delete_contacts_by_filter FROM PUBLIC
- Mantém GRANT EXECUTE TO authenticated
*/

REVOKE EXECUTE ON FUNCTION public.delete_contacts(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_contacts_by_filter(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_contacts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_contacts_by_filter(text, text, text) TO authenticated;
