import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const batchSchema = z.object({ batchId: z.string().uuid() });
const idsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(10000) });
const filterSchema = z.object({
  q: z.string().max(200).optional(),
  stage: z.string().max(50).optional(),
  batch: z.string().max(60).optional(),
});

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

/** Desfaz uma importação: exclui permanentemente contatos, empresas e histórico relacionado. */
export const undoImportFn = createServerFn({ method: "POST" })
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
      await db.from("eva_scheduling_state").delete().in("contact_id", chunk);
      await db.from("saturday_requests").delete().in("contact_id", chunk);
    }
    await db.from("contacts").delete().eq("import_batch_id", data.batchId);
    await db.from("companies").delete().eq("import_batch_id", data.batchId);
    await db.from("import_batches").delete().eq("id", data.batchId);
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
      await db.from("eva_scheduling_state").delete().in("contact_id", chunk);
      await db.from("saturday_requests").delete().in("contact_id", chunk);
    }
    await db.from("contacts").delete().eq("import_batch_id", data.batchId);
    await db.from("companies").delete().eq("import_batch_id", data.batchId);
    await db.from("import_batches").delete().eq("id", data.batchId);
    return { ok: true, removed: ids.length };
  });

/**
 * Exclui permanentemente os contatos selecionados no CRM.
 * Usa a RPC delete_contacts (SECURITY DEFINER) que:
 *   - valida auth.uid() e role admin internamente
 *   - verifica que todos os contatos pertencem ao workspace do chamador
 *   - deleta atomicamente — CASCADE remove activities/eva_scheduling_state/saturday_requests
 *   - SET NULL preserva events e tasks (contact_id fica NULL)
 *   - não toca em empresas
 *   - recalcula agregados das empresas afetadas
 */
export const deleteContactsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: removed } = await context.supabase.rpc("delete_contacts", {
      p_ids: data.ids,
    });
    if (error) throw new Error("Não foi possível excluir os contatos.");
    return { ok: true, removed: (removed as number) ?? 0 };
  });

/**
 * Exclui permanentemente TODOS os contatos que correspondem ao filtro atual do CRM.
 * Usa a RPC delete_contacts_by_filter (SECURITY DEFINER) que processa todo o filtro
 * no banco de forma atômica — não apenas os contatos visíveis na página.
 */
export const deleteContactsByFilterFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => filterSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: removed } = await context.supabase.rpc("delete_contacts_by_filter", {
      p_q: data.q ?? null,
      p_stage: data.stage ?? null,
      p_batch: data.batch ?? null,
    });
    if (error) throw new Error("Não foi possível excluir os contatos do filtro.");
    return { ok: true, removed: (removed as number) ?? 0 };
  });

/** Exclui permanentemente as empresas selecionadas. Contatos vinculados ficam sem empresa. */
export const deleteCompaniesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: removed } = await context.supabase.rpc("delete_companies", {
      p_ids: data.ids,
    });
    if (error) throw new Error("Não foi possível excluir as empresas.");
    return { ok: true, removed: (removed as number) ?? 0 };
  });
