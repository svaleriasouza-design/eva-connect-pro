import { supabase } from "@/integrations/supabase/client";

export type DueContact = {
  id: string;
  name: string;
  whatsapp: string | null;
  phone: string | null;
  cadence_day: number;
  nextDay: number;
  message: string;
};

/**
 * Retorna os contatos que devem receber mensagem hoje.
 * Regras:
 *  - cadence_active = true
 *  - do_not_contact = false
 *  - cadence_day entre 0 e 4 (próxima mensagem é Dia 1-5)
 *  - last_contact_at nulo OU anterior às 00:00 de hoje
 */
export function isWeekendIn(timezone = "America/Sao_Paulo"): boolean {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(new Date());
  return wd === "Sat" || wd === "Sun";
}

export async function fetchDueCadence(limit?: number): Promise<DueContact[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id, name, whatsapp, phone, cadence_day, cadence_active, do_not_contact, last_contact_at")
    .eq("cadence_active", true)
    .eq("do_not_contact", false)
    .lt("cadence_day", 5);
  if (error) throw error;

  let eligibles = (contacts ?? []).filter(
    (c) => !c.last_contact_at || new Date(c.last_contact_at) < today,
  );
  if (limit && limit > 0) eligibles = eligibles.slice(0, limit);
  if (eligibles.length === 0) return [];

  const { data: templates } = await supabase
    .from("message_templates")
    .select("category, content");

  const byDay: Record<number, string> = {};
  (templates ?? []).forEach((t) => {
    const m = /^Dia\s+(\d)/.exec(t.category);
    if (m) byDay[Number(m[1])] = t.content;
  });

  return eligibles.map((c) => {
    const nextDay = (c.cadence_day ?? 0) + 1;
    const raw = byDay[nextDay] ?? `Mensagem do Dia ${nextDay}`;
    const message = raw.replaceAll("{{nome}}", c.name.split(" ")[0]);
    return {
      id: c.id,
      name: c.name,
      whatsapp: c.whatsapp,
      phone: c.phone,
      cadence_day: c.cadence_day ?? 0,
      nextDay,
      message,
    };
  });
}

export async function markCadenceSent(contact: DueContact) {
  const now = new Date().toISOString();
  await supabase.from("contacts").update({
    cadence_day: contact.nextDay,
    last_contact_at: now,
    cadence_active: contact.nextDay < 5,
  }).eq("id", contact.id);
  await supabase.from("activities").insert({
    contact_id: contact.id,
    kind: "whatsapp_out",
    title: `Mensagem Dia ${contact.nextDay} enviada`,
    content: contact.message,
  });
}

export async function removeFromCadence(contactId: string, reason = "Respondeu / removido da cadência") {
  await supabase.from("contacts").update({ cadence_active: false }).eq("id", contactId);
  await supabase.from("activities").insert({
    contact_id: contactId,
    kind: "cadence_stop",
    title: "Saiu da cadência",
    content: reason,
  });
}