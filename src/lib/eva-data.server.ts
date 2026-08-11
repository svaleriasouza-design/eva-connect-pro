// Leitura de dados do workspace para a EVA (function calling).
// Todas as consultas são escopadas por workspace_id via wsDb.
import { wsDb } from "./workspace-scope.server";

const NOT_DELETED = "deleted_at";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function crmOverview(wid: string) {
  const db = await wsDb(wid);
  const { data } = await db
    .from("contacts")
    .select("funnel_stage, status, cadence_active, do_not_contact, last_contact_at")
    .is(NOT_DELETED, null)
    .limit(20000);
  const rows = (data ?? []) as any[];
  const byStage: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let ativos = 0;
  let optout = 0;
  let semContato = 0;
  for (const r of rows) {
    byStage[r.funnel_stage ?? "sem_etapa"] = (byStage[r.funnel_stage ?? "sem_etapa"] ?? 0) + 1;
    byStatus[r.status ?? "sem_status"] = (byStatus[r.status ?? "sem_status"] ?? 0) + 1;
    if (r.cadence_active) ativos++;
    if (r.do_not_contact) optout++;
    if (!r.last_contact_at) semContato++;
  }
  return { total: rows.length, por_etapa: byStage, por_status: byStatus, em_cadencia: ativos, opt_out: optout, nunca_contatados: semContato };
}

export async function listContacts(
  wid: string,
  opts: { search?: string | null; funnelStage?: string | null; limit?: number | null },
) {
  const db = await wsDb(wid);
  let q = db
    .from("contacts")
    .select(
      "id, name, company_name, whatsapp, email, city, funnel_stage, status, last_contact_at, next_action, next_action_at, cadence_day, cadence_active, notes",
    )
    .is(NOT_DELETED, null);
  if (opts.search) q = q.or(`name.ilike.%${opts.search}%,company_name.ilike.%${opts.search}%,whatsapp.ilike.%${opts.search}%`);
  if (opts.funnelStage) q = q.eq("funnel_stage", opts.funnelStage);
  const { data } = await q.order("updated_at", { ascending: false }).limit(Math.min(opts.limit ?? 20, 50));
  return (data ?? []) as any[];
}

export async function companiesOverview(wid: string, opts: { search?: string | null; limit?: number | null }) {
  const db = await wsDb(wid);
  let q = db
    .from("companies")
    .select("id, name, responsible, whatsapp, city, segment, funnel_stage, status, contacts_count, last_contact_at, next_action, next_action_at")
    .is(NOT_DELETED, null);
  if (opts.search) q = q.ilike("name", `%${opts.search}%`);
  const { data } = await q.order("last_contact_at", { ascending: false, nullsFirst: false }).limit(Math.min(opts.limit ?? 20, 50));
  const { count } = await (await wsDb(wid)).from("companies").select("id", { count: "exact", head: true }).is(NOT_DELETED, null);
  const contatadas = await (await wsDb(wid))
    .from("companies")
    .select("id", { count: "exact", head: true })
    .not("last_contact_at", "is", null)
    .is(NOT_DELETED, null);
  return {
    total_empresas: count ?? null,
    empresas_contatadas: (contatadas as any)?.count ?? null,
    amostra: (data ?? []) as any[],
  };
}

export async function agenda(wid: string, opts: { days?: number | null }) {
  const db = await wsDb(wid);
  const from = startOfToday().toISOString();
  const to = new Date(Date.now() + (opts.days ?? 7) * 86400_000).toISOString();
  const { data } = await db
    .from("events")
    .select("id, title, kind, starts_at, ends_at, status, location, meet_link, attendee_email, contact_id, source")
    .gte("starts_at", from)
    .lte("starts_at", to)
    .order("starts_at", { ascending: true })
    .limit(100);
  const rows = (data ?? []) as any[];
  const hoje = rows.filter((r) => new Date(r.starts_at).toDateString() === new Date().toDateString());
  return { periodo_dias: opts.days ?? 7, reunioes_hoje: hoje.length, hoje, proximas: rows };
}

export async function cadenceSummary(wid: string) {
  const db = await wsDb(wid);
  const { data: settings } = await db
    .from("cadence_settings")
    .select("morning_time, afternoon_time, batch_size, timezone, weekdays_only, automation_enabled, auto_reply_enabled, last_morning_run_at, last_afternoon_run_at")
    .maybeSingle();
  const { data: steps } = await db.from("cadence_steps").select("day, active, script").order("day", { ascending: true });
  const { data: contacts } = await db
    .from("contacts")
    .select("cadence_day, cadence_active, do_not_contact, last_contact_at")
    .is(NOT_DELETED, null)
    .limit(20000);
  const rows = (contacts ?? []) as any[];
  const byDay: Record<string, number> = {};
  let ativos = 0;
  for (const r of rows) {
    if (r.cadence_active && !r.do_not_contact) {
      ativos++;
      byDay[`dia_${r.cadence_day ?? 0}`] = (byDay[`dia_${r.cadence_day ?? 0}`] ?? 0) + 1;
    }
  }
  const today = startOfToday().toISOString();
  const enviadasHoje = await db
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("kind", "whatsapp_out")
    .gte("created_at", today);
  const recebidasHoje = await db
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("kind", "whatsapp_in")
    .gte("created_at", today);
  return {
    configuracao: settings ?? null,
    passos: (steps ?? []) as any[],
    leads_em_cadencia: ativos,
    distribuicao_por_dia: byDay,
    enviadas_hoje: (enviadasHoje as any)?.count ?? 0,
    respostas_hoje: (recebidasHoje as any)?.count ?? 0,
  };
}

export async function recentMessages(wid: string, opts: { days?: number | null; limit?: number | null; onlyFailed?: boolean | null }) {
  const db = await wsDb(wid);
  const since = new Date(Date.now() - (opts.days ?? 7) * 86400_000).toISOString();
  let q = db
    .from("activities")
    .select("id, kind, title, content, status, created_at, contact_id, send_mode, sent_by_name, error_message")
    .gte("created_at", since)
    .in("kind", ["whatsapp_out", "whatsapp_in", "nota"]);
  if (opts.onlyFailed) q = q.not("error_message", "is", null);
  const { data } = await q.order("created_at", { ascending: false }).limit(Math.min(opts.limit ?? 30, 100));
  return (data ?? []) as any[];
}

export async function tasksOverview(wid: string) {
  const db = await wsDb(wid);
  const { data } = await db
    .from("tasks")
    .select("id, title, description, priority, due_at, done, contact_id")
    .eq("done", false)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(50);
  return (data ?? []) as any[];
}

export async function priorityContacts(wid: string, opts: { limit?: number | null }) {
  const db = await wsDb(wid);
  const nowIso = new Date().toISOString();
  const { data: comAcao } = await db
    .from("contacts")
    .select("id, name, company_name, whatsapp, funnel_stage, status, next_action, next_action_at, last_contact_at")
    .is(NOT_DELETED, null)
    .not("next_action_at", "is", null)
    .lte("next_action_at", nowIso)
    .order("next_action_at", { ascending: true })
    .limit(Math.min(opts.limit ?? 15, 30));
  const { data: quentes } = await db
    .from("contacts")
    .select("id, name, company_name, whatsapp, funnel_stage, status, last_contact_at")
    .is(NOT_DELETED, null)
    .in("funnel_stage", ["qualificado", "reuniao_agendada", "proposta_enviada"])
    .order("last_contact_at", { ascending: false, nullsFirst: false })
    .limit(Math.min(opts.limit ?? 15, 30));
  return { acoes_atrasadas: (comAcao ?? []) as any[], leads_quentes: (quentes ?? []) as any[] };
}

export async function weeklySummary(wid: string) {
  const db = await wsDb(wid);
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const count = async (table: string, build: (q: any) => any) => {
    const { count } = await build((await wsDb(wid)).from(table).select("id", { count: "exact", head: true }));
    return count ?? 0;
  };
  const enviadas = await count("activities", (q) => q.eq("kind", "whatsapp_out").gte("created_at", since));
  const recebidas = await count("activities", (q) => q.eq("kind", "whatsapp_in").gte("created_at", since));
  const falhas = await count("activities", (q) => q.eq("kind", "whatsapp_out").not("error_message", "is", null).gte("created_at", since));
  const novosLeads = await count("contacts", (q) => q.gte("created_at", since).is(NOT_DELETED, null));
  const { data: eventos } = await db
    .from("events")
    .select("id, title, starts_at, status")
    .gte("starts_at", since)
    .order("starts_at", { ascending: true })
    .limit(100);
  const { data: sabados } = await db
    .from("saturday_requests")
    .select("id, contact_name, start_at, status")
    .eq("status", "pending")
    .limit(20);
  const funil = await crmOverview(wid);
  return {
    periodo: "últimos 7 dias",
    mensagens_enviadas: enviadas,
    respostas_recebidas: recebidas,
    falhas_de_envio: falhas,
    taxa_resposta: enviadas ? `${((recebidas / enviadas) * 100).toFixed(1)}%` : "—",
    novos_leads: novosLeads,
    reunioes: (eventos ?? []) as any[],
    pedidos_sabado_pendentes: (sabados ?? []) as any[],
    funil,
  };
}
