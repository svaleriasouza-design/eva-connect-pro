import { supabase } from "@/integrations/supabase/client";

/** Normaliza um nome de empresa para deduplicação (case/acentos/espaços). */
export function normalizeCompanyName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Garante que exista uma empresa para cada nome informado.
 * Retorna um mapa nomeNormalizado -> id.
 */
export async function ensureCompanies(
  names: string[],
  extras: Record<string, Partial<{ city: string; phone: string; email: string }>> = {},
): Promise<Map<string, string>> {
  const uniques = Array.from(
    new Map(
      names
        .filter((n) => n && n.trim())
        .map((n) => [normalizeCompanyName(n), n.trim()]),
    ).entries(),
  );
  if (uniques.length === 0) return new Map();

  const { data: existing } = await supabase
    .from("companies")
    .select("id, name");
  const map = new Map<string, string>();
  const existingByNorm = new Map<string, string>();
  (existing ?? []).forEach((c: any) => existingByNorm.set(normalizeCompanyName(c.name ?? ""), c.id));

  const toInsert: any[] = [];
  for (const [norm, original] of uniques) {
    const id = existingByNorm.get(norm);
    if (id) {
      map.set(norm, id);
    } else {
      const extra = extras[norm] ?? {};
      toInsert.push({ name: original, ...extra });
    }
  }

  if (toInsert.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const chunk = toInsert.slice(i, i + BATCH);
      const { data: inserted } = await supabase
        .from("companies")
        .insert(chunk)
        .select("id, name");
      (inserted ?? []).forEach((c: any) => map.set(normalizeCompanyName(c.name ?? ""), c.id));
    }
  }

  return map;
}

/**
 * Backfill: cria empresas para contatos que possuem company_name mas não company_id,
 * e vincula company_id de contatos cujo company_name já bate com uma empresa existente.
 * Também cria empresas "temporárias" (usando o nome do contato) quando não há empresa informada.
 */
export async function syncCompaniesFromContacts(): Promise<{ created: number; linked: number }> {
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, company_name, company_id, city, phone, whatsapp, email")
    .is("company_id", null);
  if (!contacts || contacts.length === 0) return { created: 0, linked: 0 };

  const names: string[] = [];
  const extras: Record<string, any> = {};
  contacts.forEach((c: any) => {
    const raw = (c.company_name && c.company_name.trim()) || c.name || "";
    if (!raw) return;
    names.push(raw);
    const norm = normalizeCompanyName(raw);
    if (!extras[norm]) extras[norm] = { city: c.city, phone: c.phone ?? c.whatsapp, email: c.email };
  });

  const map = await ensureCompanies(names, extras);
  let linked = 0;
  const BATCH = 200;
  const updates = contacts
    .map((c: any) => {
      const raw = (c.company_name && c.company_name.trim()) || c.name || "";
      const id = map.get(normalizeCompanyName(raw));
      return id ? { id: c.id, company_id: id, company_name: raw } : null;
    })
    .filter(Boolean) as { id: string; company_id: string; company_name: string }[];

  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH);
    await Promise.all(
      chunk.map((u) =>
        supabase
          .from("contacts")
          .update({ company_id: u.company_id, company_name: u.company_name })
          .eq("id", u.id),
      ),
    );
    linked += chunk.length;
  }

  return { created: map.size, linked };
}