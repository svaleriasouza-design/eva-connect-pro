import { n as wsDb } from "./workspace-scope.server-BnuHkW86.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/eva-data.server-CkHrVQn1.js
var NOT_DELETED = "deleted_at";
var STAGES = [
	"novo_lead",
	"primeiro_contato",
	"qualificado",
	"reuniao_agendada",
	"proposta_enviada",
	"fechado",
	"cliente_ativo",
	"pos_venda",
	"perdido"
];
/** Contagem exata (head:true) — nunca limitada a 1000 linhas. */
async function countRows(wid, table, build) {
	let q = (await wsDb(wid)).from(table).select("id", {
		count: "exact",
		head: true
	});
	if (build) q = build(q);
	const { count } = await q;
	return count ?? 0;
}
function startOfToday() {
	const d = /* @__PURE__ */ new Date();
	d.setHours(0, 0, 0, 0);
	return d;
}
async function crmOverview(wid) {
	const base = (q) => q.is(NOT_DELETED, null);
	const total = await countRows(wid, "contacts", base);
	const por_etapa = {};
	for (const s of STAGES) {
		const n = await countRows(wid, "contacts", (q) => base(q).eq("funnel_stage", s));
		if (n) por_etapa[s] = n;
	}
	const em_cadencia = await countRows(wid, "contacts", (q) => base(q).eq("cadence_active", true).eq("do_not_contact", false));
	const opt_out = await countRows(wid, "contacts", (q) => base(q).eq("do_not_contact", true));
	const nunca_contatados = await countRows(wid, "contacts", (q) => base(q).is("last_contact_at", null));
	return {
		total,
		por_etapa,
		em_cadencia,
		opt_out,
		nunca_contatados,
		contatados: total - nunca_contatados
	};
}
async function listContacts(wid, opts) {
	let q = (await wsDb(wid)).from("contacts").select("id, name, company_name, whatsapp, email, city, funnel_stage, status, last_contact_at, next_action, next_action_at, cadence_day, cadence_active, notes").is(NOT_DELETED, null);
	if (opts.search) q = q.or(`name.ilike.%${opts.search}%,company_name.ilike.%${opts.search}%,whatsapp.ilike.%${opts.search}%`);
	if (opts.funnelStage) q = q.eq("funnel_stage", opts.funnelStage);
	const { data } = await q.order("updated_at", { ascending: false }).limit(Math.min(opts.limit ?? 20, 50));
	return data ?? [];
}
async function companiesOverview(wid, opts) {
	let q = (await wsDb(wid)).from("companies").select("id, name, responsible, whatsapp, city, segment, funnel_stage, status, contacts_count, last_contact_at, next_action, next_action_at").is(NOT_DELETED, null);
	if (opts.search) q = q.ilike("name", `%${opts.search}%`);
	const { data } = await q.order("last_contact_at", {
		ascending: false,
		nullsFirst: false
	}).limit(Math.min(opts.limit ?? 20, 50));
	const total = await countRows(wid, "companies", (x) => x.is(NOT_DELETED, null));
	const contatadas = await countRows(wid, "companies", (x) => x.is(NOT_DELETED, null).not("last_contact_at", "is", null));
	return {
		total_empresas: total,
		empresas_contatadas: contatadas,
		empresas_nao_contatadas: total - contatadas,
		amostra: data ?? []
	};
}
async function agenda(wid, opts) {
	const db = await wsDb(wid);
	const from = startOfToday().toISOString();
	const to = new Date(Date.now() + (opts.days ?? 7) * 864e5).toISOString();
	const { data } = await db.from("events").select("id, title, kind, starts_at, ends_at, status, location, meet_link, attendee_email, contact_id, source").gte("starts_at", from).lte("starts_at", to).order("starts_at", { ascending: true }).limit(100);
	const rows = data ?? [];
	const hoje = rows.filter((r) => new Date(r.starts_at).toDateString() === (/* @__PURE__ */ new Date()).toDateString());
	return {
		periodo_dias: opts.days ?? 7,
		reunioes_hoje: hoje.length,
		hoje,
		proximas: rows
	};
}
async function cadenceSummary(wid) {
	const db = await wsDb(wid);
	const { data: settings } = await db.from("cadence_settings").select("morning_time, afternoon_time, batch_size, timezone, weekdays_only, automation_enabled, auto_reply_enabled, last_morning_run_at, last_afternoon_run_at").maybeSingle();
	const { data: steps } = await db.from("cadence_steps").select("day, active, script").order("day", { ascending: true });
	const ativosBase = (q) => q.is(NOT_DELETED, null).eq("cadence_active", true).eq("do_not_contact", false);
	const ativos = await countRows(wid, "contacts", ativosBase);
	const byDay = {};
	for (let d = 0; d <= 5; d++) {
		const n = await countRows(wid, "contacts", (q) => ativosBase(q).eq("cadence_day", d));
		if (n) byDay[`dia_${d}`] = n;
	}
	const today = startOfToday().toISOString();
	const enviadasHoje = await countRows(wid, "activities", (q) => q.eq("kind", "whatsapp_out").gte("created_at", today));
	const recebidasHoje = await countRows(wid, "activities", (q) => q.eq("kind", "whatsapp_in").gte("created_at", today));
	return {
		configuracao: settings ?? null,
		passos: steps ?? [],
		leads_em_cadencia: ativos,
		distribuicao_por_dia: byDay,
		enviadas_hoje: enviadasHoje,
		respostas_hoje: recebidasHoje
	};
}
async function recentMessages(wid, opts) {
	const db = await wsDb(wid);
	const since = (/* @__PURE__ */ new Date(Date.now() - (opts.days ?? 7) * 864e5)).toISOString();
	let q = db.from("activities").select("id, kind, title, content, status, created_at, contact_id, send_mode, sent_by_name, error_message").gte("created_at", since).in("kind", [
		"whatsapp_out",
		"whatsapp_in",
		"nota"
	]);
	if (opts.onlyFailed) q = q.not("error_message", "is", null);
	const { data } = await q.order("created_at", { ascending: false }).limit(Math.min(opts.limit ?? 30, 100));
	return data ?? [];
}
async function tasksOverview(wid) {
	const { data } = await (await wsDb(wid)).from("tasks").select("id, title, description, priority, due_at, done, contact_id").eq("done", false).order("due_at", {
		ascending: true,
		nullsFirst: false
	}).limit(50);
	return data ?? [];
}
async function priorityContacts(wid, opts) {
	const db = await wsDb(wid);
	const nowIso = (/* @__PURE__ */ new Date()).toISOString();
	const { data: comAcao } = await db.from("contacts").select("id, name, company_name, whatsapp, funnel_stage, status, next_action, next_action_at, last_contact_at").is(NOT_DELETED, null).not("next_action_at", "is", null).lte("next_action_at", nowIso).order("next_action_at", { ascending: true }).limit(Math.min(opts.limit ?? 15, 30));
	const { data: quentes } = await db.from("contacts").select("id, name, company_name, whatsapp, funnel_stage, status, last_contact_at").is(NOT_DELETED, null).in("funnel_stage", [
		"qualificado",
		"reuniao_agendada",
		"proposta_enviada"
	]).order("last_contact_at", {
		ascending: false,
		nullsFirst: false
	}).limit(Math.min(opts.limit ?? 15, 30));
	return {
		acoes_atrasadas: comAcao ?? [],
		leads_quentes: quentes ?? []
	};
}
async function weeklySummary(wid) {
	const db = await wsDb(wid);
	const since = (/* @__PURE__ */ new Date(Date.now() - 6048e5)).toISOString();
	const count = (table, build) => countRows(wid, table, build);
	const enviadas = await count("activities", (q) => q.eq("kind", "whatsapp_out").gte("created_at", since));
	const recebidas = await count("activities", (q) => q.eq("kind", "whatsapp_in").gte("created_at", since));
	const falhas = await count("activities", (q) => q.eq("kind", "whatsapp_out").not("error_message", "is", null).gte("created_at", since));
	const novosLeads = await count("contacts", (q) => q.gte("created_at", since).is(NOT_DELETED, null));
	const { data: eventos } = await db.from("events").select("id, title, starts_at, status").gte("starts_at", since).order("starts_at", { ascending: true }).limit(100);
	const { data: sabados } = await db.from("saturday_requests").select("id, contact_name, start_at, status").eq("status", "pending").limit(20);
	const funil = await crmOverview(wid);
	return {
		periodo: "últimos 7 dias",
		mensagens_enviadas: enviadas,
		respostas_recebidas: recebidas,
		falhas_de_envio: falhas,
		taxa_resposta: enviadas ? `${(recebidas / enviadas * 100).toFixed(1)}%` : "—",
		novos_leads: novosLeads,
		reunioes: eventos ?? [],
		pedidos_sabado_pendentes: sabados ?? [],
		funil
	};
}
//#endregion
export { agenda, cadenceSummary, companiesOverview, crmOverview, listContacts, priorityContacts, recentMessages, tasksOverview, weeklySummary };
