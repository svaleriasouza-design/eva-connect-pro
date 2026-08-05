import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const batchSchema = z.object({ batchId: z.string().uuid() });

async function scope(context: any) {
  const { currentWorkspaceId, wsDb } = await import("./workspace-scope.server");
  const { requireRole } = await import("./users.server");
  const workspaceId = await currentWorkspaceId(context.supabase);
  await requireRole(context.userId, ["admin"], workspaceId);
  return { workspaceId, db: await wsDb(workspaceId) };
}

/** Lista lotes de importação, incluindo os que estão na lixeira. */
export const listImportBatchesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { currentWorkspaceId, wsDb } = await import("./workspace-scope.server");
    const workspaceId = await currentWorkspaceId(context.supabase);
    const db = await wsDb(workspaceId);
    const { data } = await db
      .from("import_batches")
      .select("id, file_name, total_rows, inserted_rows, created_at, created_by_name, deleted_at")
      .order("created_at", { ascending: false })
      .limit(30);
    return (data ?? []) as any[];
  });

/** Desfaz uma importação (lixeira: contatos e empresas ficam ocultos, nada é apagado). */
export const undoImportFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => batchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await scope(context);
    const now = new Date().toISOString();
    await db
      .from("contacts")
      .update({ deleted_at: now, cadence_active: false })
      .eq("import_batch_id", data.batchId)
      .is("deleted_at", null);
    await db
      .from("companies")
      .update({ deleted_at: now })
      .eq("import_batch_id", data.batchId)
      .is("deleted_at", null);
    await db.from("import_batches").update({ deleted_at: now }).eq("id", data.batchId);
    return { ok: true };
  });

/** Restaura uma importação que estava na lixeira. */
export const restoreImportFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => batchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await scope(context);
    await db.from("contacts").update({ deleted_at: null }).eq("import_batch_id", data.batchId);
    await db.from("companies").update({ deleted_at: null }).eq("import_batch_id", data.batchId);
    await db.from("import_batches").update({ deleted_at: null }).eq("id", data.batchId);
    return { ok: true };
  });

/** Exclusão definitiva de uma importação (contatos, empresas e histórico). */
export const purgeImportFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => batchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await scope(context);
    const { data: rows } = await db.from("contacts").select("id").eq("import_batch_id", data.batchId);
    const ids = ((rows ?? []) as { id: string }[]).map((r) => r.id);
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      await db.from("activities").delete().in("contact_id", chunk);
      await db.from("tasks").delete().in("contact_id", chunk);
      await db.from("events").delete().in("contact_id", chunk);
    }
    await db.from("contacts").delete().eq("import_batch_id", data.batchId);
    await db.from("companies").delete().eq("import_batch_id", data.batchId);
    await db.from("import_batches").delete().eq("id", data.batchId);
    return { ok: true, removed: ids.length };
  });
