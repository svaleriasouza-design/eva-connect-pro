export type Workspace = { name: string; tagline: string; owner_name: string };

export const WORKSPACE_FALLBACK: Workspace = {
  name: "EVA IA",
  tagline: "Assistente Executiva",
  owner_name: "",
};

export async function loadWorkspace(): Promise<Workspace> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("workspace_settings" as any)
    .select("name, tagline, owner_name")
    .eq("id", true)
    .maybeSingle();
  const row = (data ?? {}) as any;
  return {
    name: row.name || WORKSPACE_FALLBACK.name,
    tagline: row.tagline || WORKSPACE_FALLBACK.tagline,
    owner_name: row.owner_name || "",
  };
}

export async function saveWorkspace(input: {
  name: string;
  tagline?: string | null;
  owner_name?: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("workspace_settings" as any).upsert(
    {
      id: true,
      name: input.name,
      tagline: input.tagline || null,
      owner_name: input.owner_name || null,
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
