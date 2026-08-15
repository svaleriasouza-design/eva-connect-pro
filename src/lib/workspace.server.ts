import { wsDb } from "./workspace-scope.server";

export type Workspace = { name: string; tagline: string; owner_name: string };

export const WORKSPACE_FALLBACK: Workspace = {
  name: "EVA IA",
  tagline: "Assistente Executiva",
  owner_name: "",
};



export async function loadWorkspace(workspaceId: string, supabase?: any): Promise<Workspace> {
  const db = supabase ?? (await wsDb(workspaceId));
  const { data } = await db
    .from("workspace_settings")
    .select("name, tagline, owner_name")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
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
  supabase?: any,
) {
  const db = supabase ?? (await wsDb(workspaceId));
  const { error } = await db.from("workspace_settings").upsert(
    {
      id: true,
      workspace_id: workspaceId,
      name: input.name,
      tagline: input.tagline || null,
      owner_name: input.owner_name || null,
    },
    { onConflict: "workspace_id" },
  );
  if (error) return { ok: false as const, error: error.message };
  const admin = supabase ?? (await wsDb(workspaceId));
  await admin.from("workspaces").update({ name: input.name }).eq("id", workspaceId);
  return { ok: true as const };
}
