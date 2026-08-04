import { wsDb } from "./workspace-scope.server";

export type Workspace = { name: string; tagline: string; owner_name: string };

export const WORKSPACE_FALLBACK: Workspace = {
  name: "EVA IA",
  tagline: "Assistente Executiva",
  owner_name: "",
};

export async function loadWorkspace(workspaceId: string): Promise<Workspace> {
  const db = await wsDb(workspaceId);
  const { data } = await db.from("workspace_settings").select("name, tagline, owner_name").maybeSingle();
  const row = (data ?? {}) as any;
  return {
    name: row.name || WORKSPACE_FALLBACK.name,
    tagline: row.tagline || WORKSPACE_FALLBACK.tagline,
    owner_name: row.owner_name || "",
  };
}

export async function saveWorkspace(
  workspaceId: string,
  input: { name: string; tagline?: string | null; owner_name?: string | null },
) {
  const db = await wsDb(workspaceId);
  const { error } = await db.from("workspace_settings").upsert(
    {
      id: true,
      name: input.name,
      tagline: input.tagline || null,
      owner_name: input.owner_name || null,
    },
    { onConflict: "workspace_id" },
  );
  if (error) return { ok: false as const, error: error.message };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await (supabaseAdmin as any).from("workspaces").update({ name: input.name }).eq("id", workspaceId);
  return { ok: true as const };
}
