import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const batchSchema = z.object({ batchId: z.string().uuid() });
const idsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(1000) });
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

/** Exclui (lixeira reversível) os contatos selecionados no CRM. */
export const deleteContactsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await scope(context);
    const now = new Date().toISOString();
    await db
      .from("contacts")
      .update({ deleted_at: now, cadence_active: false })
      .in("id", data.ids)
      .is("deleted_at", null);
    return { ok: true, removed: data.ids.length };
  });

/** Exclui (lixeira reversível) TODOS os contatos que atendem ao filtro atual do CRM. */
export const deleteContactsByFilterFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => filterSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await scope(context);
    const now = new Date().toISOString();
    const term = (data.q ?? "").trim();
    const build = () => {
      let query: any = db.from("contacts");
      return query;
    };
    const applyFilters = (query: any) => {
      if (data.stage && data.stage !== "all") query = query.eq("funnel_stage", data.stage);
      if (data.batch === "none") query = query.is("import_batch_id", null);
      else if (data.batch && data.batch !== "all") query = query.eq("import_batch_id", data.batch);
      if (term)
        query = query.or(
          `name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%`,
        );
      return query.is("deleted_at", null);
    };

    let removed = 0;
    // Atualiza em blocos para não estourar tempo de execução em listas grandes.
    for (let i = 0; i < 200; i++) {
      const { data: rows } = await applyFilters(build().select("id")).limit(1000);
      const ids = ((rows ?? []) as { id: string }[]).map((r) => r.id);
      if (ids.length === 0) break;
      await db.from("contacts").update({ deleted_at: now, cadence_active: false }).in("id", ids);
      removed += ids.length;
      if (ids.length < 1000) break;
    }
    return { ok: true, removed };
  });
