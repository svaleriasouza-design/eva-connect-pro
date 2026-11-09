import { assertAttempt, assertMetaAssets, EMBEDDED_ATTEMPT_TTL_MS } from "./meta-embedded-contract";
import { encryptMetaToken } from "./meta-token-crypto.server";

export function embeddedConfig() {
  const appId = process.env["META_EMBEDDED_APP_ID"] ?? "";
  const configId = process.env["META_EMBEDDED_CONFIG_ID"] ?? "";
  const appSecret = process.env["META_EMBEDDED_APP_SECRET"] ?? "";
  const verifyToken = process.env["META_WA_VERIFY_TOKEN"] ?? "";
  const ready = Boolean(/^\d+$/.test(appId) && /^\d+$/.test(configId) && appSecret && verifyToken && process.env["META_TOKEN_ENCRYPTION_KEY"]);
  return { appId, configId, appSecret, verifyToken, ready, graphVersion: "v27.0" };
}

async function graph(path: string, token?: string, body?: Record<string, string>, query?: URLSearchParams) {
  const url = new URL(`https://graph.facebook.com/v27.0/${path}`);
  if (query) url.search = query.toString();
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  const json = await response.json() as any;
  // Never expose provider bodies: they can echo tokens, codes or request parameters.
  if (!response.ok || json.error) throw new Error(`A Meta recusou a etapa de conexão (HTTP ${response.status}${json.error?.code ? `, código ${Number(json.error.code)}` : ""}).`);
  return json;
}

export async function beginEmbedded(db: any, userId: string, workspaceId: string) {
  const config = embeddedConfig();
  if (!config.ready) throw new Error("A conexão guiada aguarda a configuração do aplicativo Meta.");
  const { data, error } = await db.from("meta_embedded_attempts").insert({
    user_id: userId, workspace_id: workspaceId, expires_at: new Date(Date.now() + EMBEDDED_ATTEMPT_TTL_MS).toISOString(),
  }).select("id,expires_at").single();
  if (error || !data) throw new Error("Não foi possível iniciar a conexão.");
  return { attemptId: String(data.id), expiresAt: String(data.expires_at) };
}

export async function finishEmbedded(db: any, userId: string, workspaceId: string, input: { attemptId: string; code: string; wabaId: string; phoneNumberId: string; pin: string }) {
  const config = embeddedConfig();
  if (!config.ready) throw new Error("A conexão guiada aguarda a configuração do aplicativo Meta.");
  const { data: attempt } = await db.from("meta_embedded_attempts").select("*").eq("id", input.attemptId).eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle();
  assertAttempt(attempt, userId, workspaceId);
  const { data: claim, error: claimError } = await db.from("meta_embedded_attempts").update({ status: "processing" }).eq("id", input.attemptId).eq("workspace_id", workspaceId).eq("user_id", userId).eq("status", "pending").gt("expires_at", new Date().toISOString()).select("id").maybeSingle();
  if (claimError || !claim) throw new Error("Esta tentativa já foi utilizada. Inicie uma nova conexão.");
  const updateAttempt = (patch: Record<string, unknown>) => db.from("meta_embedded_attempts").update(patch).eq("id", input.attemptId).eq("workspace_id", workspaceId).eq("user_id", userId);
  let newNumberId: string | null = null;
  try {
    const exchange = await graph("oauth/access_token", undefined, undefined, new URLSearchParams({ client_id: config.appId, client_secret: config.appSecret, code: input.code }));
    const token = exchange.access_token;
    if (typeof token !== "string" || !token) throw new Error("A Meta não retornou uma autorização válida.");
    const debug = await graph("debug_token", `${config.appId}|${config.appSecret}`, undefined, new URLSearchParams({ input_token: token }));
    // Read all pages without accepting pagination URLs from the provider as arbitrary fetch destinations.
    const phones: any[] = [];
    let after: string | undefined;
    for (let page = 0; page < 20; page++) {
      const query = new URLSearchParams({ fields: "id,display_phone_number,verified_name,platform_type", limit: "100" });
      if (after) query.set("after", after);
      const result = await graph(`${input.wabaId}/phone_numbers`, token, undefined, query);
      phones.push(...(result.data ?? []));
      if (!result.paging?.next) break;
      after = result.paging?.cursors?.after;
      if (!after) break;
    }
    assertMetaAssets(debug.data ?? {}, config.appId, phones, input.phoneNumberId);
    const phone = phones.find(p => String(p.id) === input.phoneNumberId);
    const { data: owners, error: ownerError } = await db.from("whatsapp_numbers").select("id,workspace_id,active,is_primary,connection_source").eq("phone_number_id", input.phoneNumberId);
    if (ownerError) throw new Error("Não foi possível verificar a empresa do número.");
    if ((owners ?? []).some((n: any) => n.workspace_id !== workspaceId)) throw new Error("Este número já está associado a outra empresa na EVA.");
    const existing = (owners ?? [])[0];
    // Reserve a new number inactive before external provisioning; existing credentials are untouched until success.
    if (!existing) {
      const { data: created, error } = await db.from("whatsapp_numbers").insert({
        workspace_id: workspaceId, phone_number_id: input.phoneNumberId, waba_id: input.wabaId,
        label: phone?.verified_name || phone?.display_phone_number || "WhatsApp", display_phone: phone?.display_phone_number ?? null,
        connection_source: "embedded", active: false, is_primary: false, onboarding_status: "provisioning", connection_status: "pending",
      }).select("id").single();
      if (error || !created) throw new Error("Não foi possível reservar o número. Verifique se ele já foi associado.");
      newNumberId = String(created.id);
    }
    const subscribed = await graph(`${input.wabaId}/subscribed_apps`, token, {});
    if (subscribed.success !== true) throw new Error("A inscrição para recebimento de mensagens não foi concluída.");
    // This configuration supports Cloud API only. Coexistence is deliberately not launched.
    if (phone?.platform_type !== "CLOUD_API") {
      const registered = await graph(`${input.phoneNumberId}/register`, token, { messaging_product: "whatsapp", pin: input.pin });
      if (registered.success !== true) throw new Error("O registro do número não foi concluído.");
    }
    const now = new Date().toISOString();
    const expiration = Number(debug.data?.expires_at ?? 0);
    const patch = {
      waba_id: input.wabaId, encrypted_access_token: encryptMetaToken(token, workspaceId, input.phoneNumberId),
      connection_source: "embedded", meta_app_id: config.appId, graph_version: config.graphVersion,
      token_expires_at: expiration > 0 ? new Date(expiration * 1000).toISOString() : null,
      onboarding_status: "completed", verified_business_name: phone?.verified_name ?? null,
      display_phone: phone?.display_phone_number ?? null, connection_status: "connected", connection_error: null,
      connected_at: now, last_checked_at: now, active: existing ? existing.active : true,
    };
    const numberId = existing?.id ?? newNumberId;
    const { data: saved, error } = await db.from("whatsapp_numbers").update(patch).eq("id", numberId).eq("workspace_id", workspaceId).select("id").single();
    if (error || !saved) throw new Error("A Meta autorizou a conexão, mas não foi possível salvá-la. Reconecte para concluir.");
    const completed = await updateAttempt({ status: "completed", number_id: numberId, completed_at: now });
    if (completed.error) throw new Error("A conexão foi salva, mas a confirmação está pendente. Atualize a lista.");
    return { ok: true as const, numberId: String(numberId), phone: String(phone?.display_phone_number ?? ""), name: String(phone?.verified_name ?? "") };
  } catch (error) {
    const message = error instanceof Error && !/fetch|network|json/i.test(error.message) ? error.message : "Não foi possível concluir a conexão com a Meta. Tente novamente.";
    if (newNumberId) await db.from("whatsapp_numbers").update({ onboarding_status: "failed", connection_status: "error", connection_error: message }).eq("id", newNumberId).eq("workspace_id", workspaceId).eq("onboarding_status", "provisioning");
    await updateAttempt({ status: "failed", error_message: message });
    return { ok: false as const, error: message };
  }
}