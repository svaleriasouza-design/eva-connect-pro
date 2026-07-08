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