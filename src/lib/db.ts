import { supabase } from "@/integrations/supabase/client";

export const FUNNEL_STAGES = [
  { key: "novo_lead", label: "Novo Lead" },
  { key: "primeiro_contato", label: "Primeiro Contato" },
  { key: "qualificado", label: "Qualificado" },
  { key: "reuniao_agendada", label: "Reunião Agendada" },
  { key: "proposta_enviada", label: "Proposta Enviada" },
  { key: "fechado", label: "Fechado" },
  { key: "cliente_ativo", label: "Cliente Ativo" },
  { key: "pos_venda", label: "Pós-venda" },
] as const;

export const MESSAGE_CATEGORIES = [
  "Dia 1","Dia 2","Dia 3","Dia 4","Dia 5",
  "No Show","Lembretes","Qualificação","Quebra de objeções",
  "Fechamento","Importância","Reativação",
] as const;

export const EVENT_KINDS = ["sessao","workshop","reuniao","mentoria","follow-up","lembrete"] as const;

export const ORIGENS = ["Instagram","Facebook","Site","Evento","Indicação","Outro"] as const;

export { supabase };

/**
 * Busca todas as linhas de uma tabela usando paginação por range
 * (contorna o limite padrão do PostgREST de 1000 linhas).
 */
export async function fetchAllRows<T = any>(
  table: string,
  select = "*",
  order?: { column: string; ascending?: boolean },
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q: any = supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (order) q = q.order(order.column, { ascending: order.ascending ?? false });
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export function formatDate(d?: string | Date | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
}

export function formatDateTime(d?: string | Date | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}