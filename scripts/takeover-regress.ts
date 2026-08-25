/* Teste de regressão temporário da regra human_takeover. Removido após a execução. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendAndLog } from "@/lib/messaging.server";
import { isHumanTakeover, markHumanTakeover, releaseHumanTakeover } from "@/lib/takeover.server";
import { runCampaignBatch } from "@/lib/campaigns.server";
import { routeInboundMessage } from "@/lib/inbound-router.server";
import { runCadenceBatch } from "@/lib/cadence-runner.server";

const db = supabaseAdmin as any;
const WS_A = "0c10a407-362d-4ee8-b88f-ff3ca2290d84"; // 2 números
const WS_B = "eb35a514-51c5-4705-a2ef-263646ee07dd"; // 1 número
const out: string[] = [];
const log = (s: string) => {
  out.push(s);
  console.log(s);
};

async function mkContact(ws: string, name: string, phone: string) {
  const { data, error } = await db
    .from("contacts")
    .insert({
      workspace_id: ws,
      name,
      whatsapp: phone,
      funnel_stage: "novo_lead",
      status: "ativo",
      cadence_active: true,
      cadence_day: 0,
      do_not_contact: false,
      is_bot: false,
      ai_paused: false,
      human_takeover: false,
    })
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data.id as string;
}

async function main() {
  const stamp = Date.now();
  const A1 = await mkContact(WS_A, `ZZ_TESTE_A1_${stamp}`, "5511900000001");
  const A2 = await mkContact(WS_A, `ZZ_TESTE_A2_${stamp}`, "5511900000002");
  const B1 = await mkContact(WS_B, `ZZ_TESTE_B1_${stamp}`, "5511900000003");
  const ids = [A1, A2, B1];

  // 1) Antes do takeover: automação passa pela trava (envio real falha por número fake — o que importa é não ser bloqueado)
  let r = await sendAndLog({ workspaceId: WS_A, to: "5511900000001", body: "cadencia dia 1", contactId: A1, tag: "cadence-day-1", sendMode: "cadencia" });
  log(`1. Cadência antes do takeover: bloqueado_por_takeover=${r.error === "Envio automático bloqueado: atendimento assumido por humano."}`);

  // 2) Humano envia manual -> takeover
  const manual = await sendAndLog({ workspaceId: WS_A, to: "5511900000001", body: "oi, sou humana", contactId: A1, tag: "crm-manual", sendMode: "manual", sentBy: null, sentByName: "Teste" });
  await markHumanTakeover({ workspaceId: WS_A, contactId: A1, userName: "Teste Regressão" });
  log(`2. Envio manual não bloqueado=${manual.error !== "Envio automático bloqueado: atendimento assumido por humano."}; takeover=${await isHumanTakeover(WS_A, A1)}`);

  // 3) Cron/cadência depois do takeover
  const cad = await sendAndLog({ workspaceId: WS_A, to: "5511900000001", body: "cadencia dia 2", contactId: A1, tag: "cadence-day-2", sendMode: "cadencia" });
  const { data: elig } = await db
    .from("contacts")
    .select("id")
    .eq("workspace_id", WS_A)
    .eq("cadence_active", true)
    .eq("human_takeover", false)
    .in("id", ids);
  log(`3. Cadência pós-takeover bloqueada=${!cad.ok}; motivo="${cad.error}"; elegíveis do cron entre os testes=${(elig ?? []).map((x: any) => (x.id === A1 ? "A1" : x.id === A2 ? "A2" : "B1")).join(",")}`);

  // 4) Campanha depois do takeover (2 números do workspace A)
  const { data: nums } = await db.from("whatsapp_numbers").select("id, phone_number_id, label").eq("workspace_id", WS_A);
  const { data: camp } = await db
    .from("campaigns")
    .insert({ workspace_id: WS_A, name: `ZZ_TESTE_CAMP_${stamp}`, body: "disparo teste", strategy: "balanced", status: "ready", number_ids: (nums ?? []).map((n: any) => n.id), total_targets: 2, batch_size: 10 })
    .select("id")
    .maybeSingle();
  await db.from("campaign_targets").insert([
    { workspace_id: WS_A, campaign_id: camp.id, contact_id: A1, whatsapp_number_id: nums[0].id, phone_number_id: nums[0].phone_number_id, to_phone: "5511900000001", status: "pending" },
    { workspace_id: WS_A, campaign_id: camp.id, contact_id: A2, whatsapp_number_id: nums[1 % nums.length].id, phone_number_id: nums[1 % nums.length].phone_number_id, to_phone: "5511900000002", status: "pending" },
  ]);
  const batch = await runCampaignBatch(WS_A, camp.id, 10);
  const { data: tg } = await db.from("campaign_targets").select("contact_id, status, error_message").eq("campaign_id", camp.id);
  log(`4. Campanha: ${(tg ?? []).map((t: any) => `${t.contact_id === A1 ? "A1(takeover)" : "A2(normal)"}=${t.status}`).join(" | ")} (batch=${JSON.stringify((batch as any).sent ?? batch)})`);

  // 5) Webhook / resposta automática após takeover
  const routed = await routeInboundMessage({ workspaceId: WS_A, contactId: A1, contactName: "A1", phone: "5511900000001", text: "quero saber mais", waitMs: 0 } as any).catch((e: any) => `erro:${e.message}`);
  log(`5. Webhook pós-takeover: resultado="${routed}"`);

  // 6) Retomar EVA
  await releaseHumanTakeover({ workspaceId: WS_A, contactId: A1, userName: "Teste Regressão" });
  log(`6. Retomar EVA: takeover=${await isHumanTakeover(WS_A, A1)}`);

  // 7) Após retomada, automação volta; alvos cancelados NÃO voltam a pendente
  const after = await sendAndLog({ workspaceId: WS_A, to: "5511900000001", body: "cadencia dia 2 (pós-retomada)", contactId: A1, tag: "cadence-day-2", sendMode: "cadencia" });
  const { data: tg2 } = await db.from("campaign_targets").select("contact_id, status").eq("campaign_id", camp.id);
  log(`7. Pós-retomada: bloqueado_por_takeover=${after.error === "Envio automático bloqueado: atendimento assumido por humano."}; alvos=${(tg2 ?? []).map((t: any) => `${t.contact_id === A1 ? "A1" : "A2"}=${t.status}`).join(" | ")}`);

  // 8) Isolamento por contato e por workspace
  await markHumanTakeover({ workspaceId: WS_A, contactId: A1, userName: "Teste" });
  const iso = {
    A1: await isHumanTakeover(WS_A, A1),
    A2: await isHumanTakeover(WS_A, A2),
    B1: await isHumanTakeover(WS_B, B1),
  };
  const a2 = await sendAndLog({ workspaceId: WS_A, to: "5511900000002", body: "cadencia dia 1", contactId: A2, tag: "cadence-day-1", sendMode: "cadencia" });
  const b1 = await sendAndLog({ workspaceId: WS_B, to: "5511900000003", body: "cadencia dia 1", contactId: B1, tag: "cadence-day-1", sendMode: "cadencia" });
  log(`8. Isolamento: ${JSON.stringify(iso)}; A2 bloqueado=${a2.error === "Envio automático bloqueado: atendimento assumido por humano."}; B1(outro workspace) bloqueado=${b1.error === "Envio automático bloqueado: atendimento assumido por humano."}`);

  // 9) Múltiplos números: takeover independe do número usado
  const perNumber: string[] = [];
  for (const n of nums ?? []) {
    const rr = await sendAndLog({ workspaceId: WS_A, to: "5511900000001", body: "teste numero", contactId: A1, whatsappNumberId: n.id, tag: "cadence-day-3", sendMode: "cadencia" });
    perNumber.push(`${n.label}=${rr.error === "Envio automático bloqueado: atendimento assumido por humano." ? "bloqueado" : "PASSOU"}`);
  }
  log(`9. Múltiplos números: ${perNumber.join(" | ")}`);

  // 10) Registro do bloqueio no histórico
  const { data: acts } = await db
    .from("activities")
    .select("title, status")
    .eq("contact_id", A1)
    .eq("status", "BLOCKED");
  log(`10. Bloqueios registrados no histórico para A1=${(acts ?? []).length}`);

  // limpeza
  await db.from("campaign_targets").delete().eq("campaign_id", camp.id);
  await db.from("campaigns").delete().eq("id", camp.id);
  await db.from("activities").delete().in("contact_id", ids);
  await db.from("contacts").delete().in("id", ids);
  const { count } = await db.from("contacts").select("id", { count: "exact", head: true }).in("id", ids);
  log(`Limpeza: contatos de teste restantes=${count ?? 0}`);
}

main().catch((e) => {
  console.error("FALHA", e);
  process.exit(1);
});
