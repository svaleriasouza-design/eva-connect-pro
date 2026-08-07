// Transcrição de áudio (WhatsApp -> texto) usando Lovable AI (speech-to-text).
import { loadMetaConfig } from "./whatsapp.server";

const EXT: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/opus": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/amr": "amr",
  "audio/wav": "wav",
  "audio/webm": "webm",
};

/** Baixa a mídia da Meta Cloud API (2 passos: metadados -> download). */
export async function downloadMetaMedia(
  workspaceId: string,
  mediaId: string,
): Promise<{ ok: boolean; blob?: Blob; mime?: string; error?: string }> {
  try {
    const cfg = await loadMetaConfig(workspaceId);
    if (!cfg.accessToken) return { ok: false, error: "Token Meta não configurado." };
    const metaRes = await fetch(
      `https://graph.facebook.com/${cfg.graphVersion}/${mediaId}`,
      { headers: { Authorization: `Bearer ${cfg.accessToken}` } },
    );
    const meta = (await metaRes.json().catch(() => null)) as any;
    const url = meta?.url as string | undefined;
    if (!url) return { ok: false, error: `Sem URL da mídia (${metaRes.status})` };
    const fileRes = await fetch(url, { headers: { Authorization: `Bearer ${cfg.accessToken}` } });
    if (!fileRes.ok) return { ok: false, error: `Download falhou (${fileRes.status})` };
    const blob = await fileRes.blob();
    const mime = (meta?.mime_type || blob.type || "audio/ogg").split(";")[0];
    return { ok: true, blob, mime };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Envia o áudio para o endpoint de transcrição do Lovable AI. */
export async function transcribeAudioBlob(
  blob: Blob,
  mime: string,
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { ok: false, error: "LOVABLE_API_KEY não configurado." };
  if (!blob.size) return { ok: false, error: "Áudio vazio." };
  const ext = EXT[mime] ?? "ogg";
  const form = new FormData();
  form.append("model", "openai/gpt-4o-mini-transcribe");
  form.append("file", blob, `audio.${ext}`);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const raw = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, error: `Transcrição falhou (${res.status}): ${raw.slice(0, 300)}` };
    let json: any = null;
    try { json = raw ? JSON.parse(raw) : null; } catch { json = null; }
    const text = (json?.text ?? "").toString().trim();
    if (!text) return { ok: false, error: "Transcrição vazia." };
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Fluxo completo: baixa da Meta e transcreve. */
export async function transcribeMetaAudio(workspaceId: string, mediaId: string) {
  const dl = await downloadMetaMedia(workspaceId, mediaId);
  if (!dl.ok || !dl.blob) return { ok: false as const, error: dl.error };
  const tr = await transcribeAudioBlob(dl.blob, dl.mime ?? "audio/ogg");
  if (!tr.ok) return { ok: false as const, error: tr.error };
  return { ok: true as const, text: tr.text! };
}
