export const EMBEDDED_ATTEMPT_TTL_MS = 10 * 60 * 1000;
export const META_MESSAGE_ORIGINS = new Set(["https://www.facebook.com", "https://web.facebook.com"]);

export function parseEmbeddedMessage(origin: string, value: unknown) {
  if (!META_MESSAGE_ORIGINS.has(origin)) return null;
  try {
    const message = typeof value === "string" ? JSON.parse(value) : value;
    if (!message || message.type !== "WA_EMBEDDED_SIGNUP") return null;
    if (message.event === "CANCEL" || message.event === "ERROR") return { event: message.event as "CANCEL" | "ERROR" };
    if (message.event !== "FINISH") return null;
    const { waba_id, phone_number_id } = message.data ?? {};
    if (!/^\d{3,64}$/.test(String(waba_id ?? "")) || !/^\d{3,64}$/.test(String(phone_number_id ?? ""))) return null;
    return { event: "FINISH" as const, wabaId: String(waba_id), phoneNumberId: String(phone_number_id) };
  } catch { return null; }
}

export function assertAttempt(attempt: { user_id: string; workspace_id: string; status: string; expires_at: string } | null, userId: string, workspaceId: string, now = Date.now()) {
  if (!attempt || attempt.user_id !== userId || attempt.workspace_id !== workspaceId || attempt.status !== "pending" || Date.parse(attempt.expires_at) <= now) {
    throw new Error("Tentativa inválida ou expirada. Inicie a conexão novamente.");
  }
}

export function assertMetaAssets(debug: { is_valid?: boolean; app_id?: string; scopes?: string[] }, appId: string, phones: { id: string }[], phoneId: string) {
  if (!debug.is_valid || String(debug.app_id) !== appId || !["whatsapp_business_management", "whatsapp_business_messaging"].every(s => debug.scopes?.includes(s))) {
    throw new Error("A autorização Meta não pertence ao aplicativo ou não possui as permissões necessárias.");
  }
  if (!phones.some(p => String(p.id) === phoneId)) throw new Error("O número não pertence à conta WhatsApp autorizada.");
}