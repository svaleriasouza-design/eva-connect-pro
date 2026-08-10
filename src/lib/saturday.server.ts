// Pedidos de reunião no sábado: a EVA nunca decide sozinha — ela pede
// autorização ao usuário responsável do workspace (o dono da EVA) e só depois
// confirma com o lead.

import { wsDb } from "./workspace-scope.server";
import { formatBr, suggestSlots } from "./google-calendar.server";

async function admin(wid: string) {
  return (await wsDb(wid)) as any;
}

export type SaturdayRequest = {
  id: string;
  contact_id: string;
  contact_name: string | null;
  phone: string | null;
  start_at: string;
  duration_minutes: number;
  online: boolean;
  status: string;
  created_at: string;
};

/** Registra o pedido e cria uma tarefa para o responsável decidir. */
export async function createSaturdayRequest(params: {
  workspaceId: string;
  contactId: string;
  contactName: string;
  phone: string;
  startIso: string;
  durationMinutes: number;
  online: boolean;
}) {
  const db = await admin(params.workspaceId);
  // Evita duplicar pedidos pendentes para o mesmo contato.
  await db
    .from("saturday_requests")
    .update({ status: "superseded", decided_at: new Date().toISOString() })
    .eq("contact_id", params.contactId)
    .eq("status", "pending");

  const { data } = await db
    .from("saturday_requests")
    .insert({
      contact_id: params.contactId,
      contact_name: params.contactName,
      phone: params.phone,
      start_at: params.startIso,
      duration_minutes: params.durationMinutes,
      online: params.online,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  const f = formatBr(params.startIso);
  await db.from("activities").insert({
    contact_id: params.contactId,
    kind: "nota",
    title: "Pedido de reunião no sábado — aguardando sua autorização",
    content: `${params.contactName} pediu reunião no sábado, ${f.data} às ${f.hora}. Aprove ou recuse no painel da EVA.`,
    status: "OK",
    status_updated_at: new Date().toISOString(),
  });
  await db.from("tasks").insert({
    title: `Autorizar reunião de sábado — ${params.contactName}`,
    description: `${f.completo} · ${params.durationMinutes} min. Decida no painel "Pedidos de sábado".`,
    contact_id: params.contactId,
    due_at: new Date().toISOString(),
    priority: "alta",
  });

  return { ok: true as const, id: (data as any)?.id as string | undefined };
}

export async function listPendingSaturdayRequests(workspaceId: string): Promise<SaturdayRequest[]> {
  const db = await admin(workspaceId);
  const { data } = await db
    .from("saturday_requests")
    .select("id, contact_id, contact_name, phone, start_at, duration_minutes, online, status, created_at")
    .eq("status", "pending")
    .order("start_at", { ascending: true });
  return ((data ?? []) as SaturdayRequest[]).filter((r) => new Date(r.start_at).getTime() > Date.now() - 3600_000);
}

/** Aprova ou recusa o pedido, agenda (ou não) e responde ao lead no WhatsApp. */
export async function decideSaturdayRequest(params: {
  workspaceId: string;
  requestId: string;
  approve: boolean;
  userId?: string | null;
  userName?: string | null;
}) {
  const wid = params.workspaceId;
  const db = await admin(wid);
  const { data: req } = await db.from("saturday_requests").select("*").eq("id", params.requestId).maybeSingle();
  if (!req) return { ok: false as const, error: "Pedido não encontrado." };
  if ((req as any).status !== "pending") return { ok: false as const, error: "Este pedido já foi decidido." };

  const r = req as any;
  const { data: contact } = await db.from("contacts").select("name, email, whatsapp, phone").eq("id", r.contact_id).maybeSingle();
  const c = (contact ?? {}) as any;
  const to = r.phone || c.whatsapp || c.phone || "";
  const f = formatBr(r.start_at);
  const { sendAndLog } = await import("./messaging.server");

  let reply = "";
  let ok = true;
  let error: string | undefined;

  if (params.approve) {
    const { scheduleMeeting } = await import("./scheduling.server");
    if (!c.email) {
      // Sem e-mail: confirma o sábado e pede o e-mail para enviar o convite.
      await db.from("eva_scheduling_state").upsert(
        {
          contact_id: r.contact_id,
          pending_start: r.start_at,
          duration_minutes: r.duration_minutes,
          online: r.online,
          awaiting_email: true,
          awaiting_saturday: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "contact_id" },
      );
      reply = `Boa notícia! Consegui confirmar o sábado, ${f.data} às ${f.hora}. Qual é o seu melhor e-mail para eu enviar o convite com o link da reunião?`;
    } else {
      const res = await scheduleMeeting({
        workspaceId: wid,
        contactId: r.contact_id,
        contactName: c.name ?? r.contact_name ?? "Cliente",
        phone: to,
        startIso: r.start_at,
        durationMinutes: r.duration_minutes ?? 30,
        online: r.online !== false,
        email: c.email,
      });
      if (!res.ok) {
        ok = false;
        error = res.error;
        reply = `Tive um imprevisto para reservar ${f.data} às ${f.hora}. Pode me confirmar outro horário?`;
      } else {
        reply = `Confirmado! Nossa reunião ficou para ${f.data} às ${f.hora}.${res.meetLink ? `\nLink: ${res.meetLink}` : ""}\nO convite foi enviado para ${c.email}. Até lá!`;
      }
    }
  } else {
    await db.from("eva_scheduling_state").upsert(
      { contact_id: r.contact_id, pending_start: null, awaiting_saturday: false, awaiting_email: false, updated_at: new Date().toISOString() },
      { onConflict: "contact_id" },
    );
    const slots = await suggestSlots({ durationMinutes: r.duration_minutes ?? 30, limit: 3 });
    const phrase = slots.ok && slots.data.length ? ` Tenho estes horários livres: ${slots.data.map((s) => formatBr(s).completo).join(", ")}.` : "";
    reply = `Verifiquei aqui e neste sábado não vamos conseguir atender.${phrase} Qual fica melhor para você?`;
  }

  await db
    .from("saturday_requests")
    .update({
      status: params.approve ? (ok ? "approved" : "failed") : "declined",
      decided_at: new Date().toISOString(),
      decided_by: params.userId ?? null,
      decided_by_name: params.userName ?? null,
    })
    .eq("id", r.id);

  if (to) {
    await sendAndLog({
      workspaceId: wid,
      to,
      body: reply,
      contactId: r.contact_id,
      title: params.approve ? "Sábado autorizado — resposta ao lead" : "Sábado recusado — resposta ao lead",
      tag: "saturday-decision",
      sendMode: "eva",
      sentBy: params.userId ?? null,
      sentByName: params.userName ?? null,
    });
  }

  return { ok, error, reply };
}
