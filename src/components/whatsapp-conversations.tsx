import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { supabase, formatDateTime, FUNNEL_STAGES } from "@/lib/db";
import { sendWhatsappMessageFn, setHumanTakeoverFn, sendWhatsappAudioFn } from "@/lib/whatsapp.functions";
import { listWhatsappNumbersFn } from "@/lib/wa-numbers.functions";
import { useAccess } from "@/hooks/use-access";
import { isEligibleForAttendance, CAMPAIGN_ORIGIN } from "@/lib/conversation-eligibility";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send, Loader2, Calendar, User as UserIcon, ArrowRight, CircleDot, Check, CheckCheck, XCircle, Bot, Hand, Sparkles, Mic, Square, Paperclip } from "lucide-react";
import { toast } from "sonner";

type ActivityRow = {
  id: string;
  contact_id: string | null;
  kind: string;
  title: string;
  content: string | null;
  external_id: string | null;
  status: string | null;
  status_updated_at: string | null;
  error_message?: string | null;
  created_at: string;
  sent_by_name?: string | null;
  send_mode?: string | null;
};

type ContactRow = {
  id: string;
  name: string;
  company_name: string | null;
  whatsapp: string | null;
  phone: string | null;
  funnel_stage: string;
  cadence_day: number | null;
  cadence_active: boolean | null;
  do_not_contact: boolean | null;
  main_pain: string | null;
  goal: string | null;
  next_action: string | null;
  last_contact_at: string | null;
  is_bot: boolean | null;
  ai_paused: boolean | null;
  human_takeover: boolean | null;
  bot_reason: string | null;
  conversation_origin?: string | null;
  origin_campaign_id?: string | null;
  whatsapp_number_id?: string | null;
};

type ConvFilter = "todas" | "responderam" | "aguardando" | "manual" | "robos";

function StatusIcon({ status }: { status: string | null }) {
  const s = (status ?? "").toUpperCase();
  if (s === "READ") return <CheckCheck className="h-3 w-3 text-primary" />;
  if (s === "DELIVERED") return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
  if (s === "SENT") return <Check className="h-3 w-3 text-muted-foreground" />;
  if (s === "FAILED")
    return (
      <span title="Falha no envio — a Meta rejeitou esta mensagem (não chegou ao lead)">
        <XCircle className="h-3 w-3 text-destructive" />
      </span>
    );
  return null;
}

/**
 * `origin`:
 *  - "atendimento" (padrão) → conversas da cadência/atendimento (exclui Disparos);
 *  - "disparo" → apenas conversas originadas dos Disparos (aba WhatsApp).
 */
export function WhatsappConversations({ origin = "atendimento" }: { origin?: "atendimento" | "disparo" } = {}) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConvFilter>("todas");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const sendFn = useServerFn(sendWhatsappMessageFn);
  const audioFn = useServerFn(sendWhatsappAudioFn);
  const takeoverFn = useServerFn(setHumanTakeoverFn);

  const threadRef = useRef<HTMLDivElement | null>(null);
  const { canSend } = useAccess();

  // Realtime: sempre que atividades ou contatos mudarem, invalida as queries.
  useEffect(() => {
    const channel = supabase
      .channel("wa-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => {
        qc.invalidateQueries({ queryKey: ["wa-recent-acts"] });
        qc.invalidateQueries({ queryKey: ["wa-thread"] });
        qc.invalidateQueries({ queryKey: ["all-activities"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => {
        qc.invalidateQueries({ queryKey: ["wa-contacts"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const { data: contacts = [] } = useQuery<ContactRow[]>({
    queryKey: ["wa-contacts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, name, company_name, whatsapp, phone, funnel_stage, presale_stage, sales_stage, status, cadence_day, cadence_active, do_not_contact, main_pain, goal, next_action, last_contact_at, last_inbound_at, is_bot, ai_paused, human_takeover, bot_reason, conversation_origin, origin_campaign_id")
        .order("last_contact_at", { ascending: false, nullsFirst: false })
        .limit(300);
      return (data as ContactRow[] | null) ?? [];
    },
    refetchInterval: 15000,
  });

  const { data: recentActs = [] } = useQuery<ActivityRow[]>({
    queryKey: ["wa-recent-acts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, contact_id, kind, title, content, external_id, status, status_updated_at, error_message, created_at, sent_by_name, send_mode")
        .in("kind", ["whatsapp_out", "whatsapp_in"])
        .order("created_at", { ascending: false })
        .limit(500);
      return (data as ActivityRow[] | null) ?? [];
    },
    refetchInterval: 10000,
  });

  // Metadata por contato: última msg e se última é entrada não respondida
  const meta = useMemo(() => {
    const m = new Map<string, { last?: ActivityRow; unread: boolean; inbound: number; outbound: number }>();
    for (const a of recentActs) {
      if (!a.contact_id) continue;
      let cur = m.get(a.contact_id);
      if (!cur) {
        cur = { last: a, unread: a.kind === "whatsapp_in" && (a.status ?? "").toUpperCase() !== "UNSUPPORTED", inbound: 0, outbound: 0 };
        m.set(a.contact_id, cur);
      }
      const unsupported = (a.status ?? "").toUpperCase() === "UNSUPPORTED";
      if (a.kind === "whatsapp_in" && !unsupported) cur.inbound += 1;
      if (a.kind === "whatsapp_out") cur.outbound += 1;
    }
    return m;
  }, [recentActs]);

  // Nome do disparo que originou cada conversa (identificação da origem).
  const { data: campaignRows = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["wa-campaign-names"],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("id, name").limit(200);
      return (data as { id: string; name: string }[] | null) ?? [];
    },
    staleTime: 60000,
  });
  const campaignNames = useMemo(
    () => new Map(campaignRows.map((c) => [c.id, c.name])),
    [campaignRows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Só contatos com histórico de WhatsApp OU em cadência ativa.
    let list = contacts.filter((c) => meta.has(c.id) || c.cadence_active);
    // Separação por origem: Disparos ficam na aba WhatsApp; cadência no Atendimento.
    list = list.filter((c) =>
      origin === "disparo"
        ? c.conversation_origin === CAMPAIGN_ORIGIN
        : c.conversation_origin !== CAMPAIGN_ORIGIN,
    );
    list = list.filter((c) => {
      const m = meta.get(c.id);
      if (filter === "robos") return Boolean(c.is_bot);
      if (c.is_bot) return false;
      if (filter === "manual") return Boolean(c.ai_paused || c.human_takeover);
      // "Aguardando" = fila de atendimento: usa a regra central de elegibilidade.
      if (filter === "aguardando")
        return (
          Boolean(m?.unread) &&
          isEligibleForAttendance(c as any, { ignoreTakeover: true, includeCampaignOrigin: origin === "disparo" })
        );
      if (filter === "responderam") return (m?.inbound ?? 0) > 0 && (m?.outbound ?? 0) > 0;
      return true;
    });
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company_name ?? "").toLowerCase().includes(q) ||
          (c.whatsapp ?? "").includes(q) ||
          (c.phone ?? "").includes(q),
      );
    }
    // Ordena: com msg recente primeiro, depois por last_contact_at
    return [...list].sort((a, b) => {
      const la = meta.get(a.id)?.last?.created_at ?? a.last_contact_at ?? "";
      const lb = meta.get(b.id)?.last?.created_at ?? b.last_contact_at ?? "";
      return lb.localeCompare(la);
    });
  }, [contacts, search, meta, filter, origin]);

  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  const { data: thread = [] } = useQuery<ActivityRow[]>({
    queryKey: ["wa-thread", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, contact_id, kind, title, content, external_id, status, status_updated_at, error_message, created_at, sent_by_name, send_mode")
      .eq("contact_id", selectedId as string)
        .in("kind", ["whatsapp_out", "whatsapp_in", "cadence_stop", "bot_detected", "nota"])
        .order("created_at", { ascending: true })
        .limit(200);
      return (data as ActivityRow[] | null) ?? [];
    },
    refetchInterval: 8000,
  });

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length, selectedId]);

  async function toggleManual(c: ContactRow) {
    const next = !(c.ai_paused || c.human_takeover);
    try {
      await takeoverFn({ data: { contactId: c.id, active: next } });
      toast.success(
        next
          ? "Você assumiu a conversa — cadências e automações bloqueadas para este lead"
          : "Automação retomada — a EVA voltou a responder este contato",
      );
      qc.invalidateQueries({ queryKey: ["wa-contacts"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao alterar o atendimento");
    }
  }

  async function clearBot(c: ContactRow) {
    const { error } = await supabase
      .from("contacts")
      .update({ is_bot: false, bot_reason: null, do_not_contact: false, status: "ativo" })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Contato marcado como humano");
    qc.invalidateQueries({ queryKey: ["wa-contacts"] });
  }

  async function send() {
    if (!selected || !draft.trim()) return;
    if (!canSend) {
      toast.error("Seu acesso é somente leitura. Peça a um administrador o papel de Operador.");
      return;
    }
    const to = selected.whatsapp ?? selected.phone;
    if (!to) {
      toast.error("Contato sem WhatsApp/telefone.");
      return;
    }
    setSending(true);
    try {
      const res = await sendFn({
        data: { contactId: selected.id, to, body: draft.trim(), manual: true },
      });
      if (res.ok) {
        // Ao responder manualmente, o backend já marcou a assunção humana.
        qc.invalidateQueries({ queryKey: ["wa-contacts"] });
        toast.success(
          selected.human_takeover || selected.ai_paused
            ? "Mensagem enviada"
            : "Mensagem enviada — você assumiu esta conversa (automações bloqueadas)",
        );
        setDraft("");
        qc.invalidateQueries({ queryKey: ["wa-thread", selected.id] });
        qc.invalidateQueries({ queryKey: ["wa-recent-acts"] });
      } else {
        toast.error(res.error ?? "Falha no envio");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSending(false);
    }
  }

  async function sendAudioFile(file: Blob, seconds?: number) {
    if (!selected) return;
    if (!canSend) {
      toast.error("Seu acesso é somente leitura. Peça a um administrador o papel de Operador.");
      return;
    }
    const to = selected.whatsapp ?? selected.phone;
    if (!to) {
      toast.error("Contato sem WhatsApp/telefone.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Áudio muito grande (máx. 10MB).");
      return;
    }
    setSending(true);
    try {
      // A Meta só aceita OGG/Opus, MP3, AAC/M4A(AAC real) ou AMR. O WebM do
      // MediaRecorder é remuxado para Ogg/Opus aqui (sem recodificar).
      const { normalizeRecordingForWhatsapp } = await import("@/lib/audio-ogg");
      const normalized = await normalizeRecordingForWhatsapp(file);
      const buf = new Uint8Array(await normalized.blob.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode(...buf.subarray(i, i + 8192));
      const res = await audioFn({
        data: {
          contactId: selected.id,
          to,
          base64: btoa(bin),
          mime: normalized.mime,
          ...(seconds ? { seconds } : {}),
        },
      });
      if (res.ok) {
        toast.success("Áudio enviado");
        qc.invalidateQueries({ queryKey: ["wa-thread", selected.id] });
        qc.invalidateQueries({ queryKey: ["wa-recent-acts"] });
        qc.invalidateQueries({ queryKey: ["wa-contacts"] });
      } else {
        toast.error(res.error ?? "Falha no envio do áudio");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar áudio");
    } finally {
      setSending(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Ordem por compatibilidade com a Meta: Ogg/Opus, WebM/Opus (remuxado
      // para Ogg antes do envio) e, por último, MP4 com AAC de verdade.
      const candidates = [
        "audio/ogg;codecs=opus",
        "audio/webm;codecs=opus",
        "audio/mp4;codecs=mp4a.40.2",
        "audio/webm",
      ];
      const type = candidates.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: BlobPart[] = [];
      const startedAt = Date.now();
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (blob.size > 0) void sendAudioFile(blob, (Date.now() - startedAt) / 1000);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      toast.error("Não foi possível acessar o microfone. Autorize o microfone no navegador ou anexe um arquivo de áudio.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }


  return (
    <div className="grid gap-4 h-[calc(100dvh-13rem)] min-h-[420px] md:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_300px]">
      {/* Coluna 1: Conversas */}
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_8px_24px_-18px_oklch(0.42_0.055_210_/_0.5)]">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-base font-semibold tracking-tight">Conversas</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{filtered.length}</span>
        </div>
        <div className="space-y-2.5 px-3 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contato…" className="h-9 rounded-xl border-transparent bg-muted/60 pl-8 text-sm" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([
              ["todas", "Todas"],
              ["aguardando", "Aguardando resposta"],
              ["responderam", "Fluíram"],
              ["manual", "Modo manual"],
              ["robos", "Robôs"],
            ] as [ConvFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${filter === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhum contato.</div>
          )}
          <div className="space-y-1 px-2 pb-3">
          {filtered.map((c) => {
            const m = meta.get(c.id);
            const last = m?.last;
            const preview = last?.content ?? last?.title ?? "Sem mensagens";
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`relative w-full rounded-xl px-3 py-2.5 text-left transition-colors ${active ? "bg-primary/10" : "hover:bg-muted/60"}`}
              >
                {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary" />}
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {c.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    {m?.unread && !c.is_bot && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${m?.unread ? "font-semibold" : "font-medium"}`}>{c.name}</span>
                      {last && <span className="shrink-0 text-[10px] text-muted-foreground">{formatShort(last.created_at)}</span>}
                    </div>
                    <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      {last?.kind === "whatsapp_out" && <StatusIcon status={last?.status ?? null} />}
                      <span className="truncate">{preview}</span>
                    </div>
                  </div>
                  {c.is_bot ? (
                    <Bot className="h-3.5 w-3.5 shrink-0 text-destructive" />
                  ) : c.ai_paused || c.human_takeover ? (
                    <Hand className="h-3.5 w-3.5 shrink-0 text-[color:var(--gold)]" />
                  ) : (
                    m?.unread && <CircleDot className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </div>
              </button>
            );
          })}
          </div>
        </ScrollArea>
      </div>

      {/* Coluna 2: Thread */}
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_8px_24px_-18px_oklch(0.42_0.055_210_/_0.5)]">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Selecione uma conversa
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <div className="relative shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {selected.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-primary/70" />
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold">{selected.name}</span>
                    {selected.conversation_origin === CAMPAIGN_ORIGIN && (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        Origem: Disparo{campaignNames.get(selected.origin_campaign_id ?? "") ? ` · ${campaignNames.get(selected.origin_campaign_id ?? "")}` : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[selected.company_name, selected.whatsapp ?? selected.phone].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {selected.ai_paused || selected.human_takeover ? (
                  <Button variant="default" size="sm" className="rounded-full" onClick={() => toggleManual(selected)}>
                    <Sparkles className="mr-1 h-3 w-3" />
                    Retomar EVA
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => toggleManual(selected)}>
                    <Sparkles className="mr-1 h-3 w-3" />
                    EVA respondendo
                  </Button>
                )}
                <Link to="/crm/$id" params={{ id: selected.id }}>
                  <Button variant="ghost" size="sm" className="rounded-full">Abrir ficha <ArrowRight className="ml-1 h-3 w-3" /></Button>
                </Link>
              </div>
            </div>


            {selected.is_bot && (
              <div className="border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
                Atendimento automático detectado{selected.bot_reason ? `: ${selected.bot_reason}` : ""}. A EVA parou de responder este número.
                <button type="button" className="ml-2 underline" onClick={() => clearBot(selected)}>Marcar como humano</button>
              </div>
            )}
            {(selected.ai_paused || selected.human_takeover) && !selected.is_bot && (
              <div className="border-b bg-[color:var(--gold)]/15 px-4 py-2 text-xs">
                Você assumiu esta conversa. A EVA não responde automaticamente aqui até você devolver o controle.
              </div>
            )}
            <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-2.5 bg-muted/25 p-4 sm:p-5">
              {thread.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">Sem histórico ainda. Envie a primeira mensagem.</div>
              )}
              {thread.map((a) => {
                if (a.kind === "cadence_stop" || a.kind === "bot_detected" || a.kind === "nota") {
                  return (
                    <div key={a.id} className="mx-auto max-w-md rounded-md bg-background/60 px-3 py-1 text-center text-[11px] text-muted-foreground">
                      {a.title} · {formatDateTime(a.created_at)}
                    </div>
                  );
                }
                const outgoing = a.kind === "whatsapp_out";
                const manual = a.send_mode === "manual" && !!a.sent_by_name;
                return (
                  <div key={a.id} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[75%] ${outgoing ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground" : "rounded-2xl rounded-bl-md border bg-card"}`}>
                      {outgoing && manual && (
                        <div className="mb-0.5 flex items-center gap-1 text-[10px] font-medium opacity-80">
                          <Hand className="h-2.5 w-2.5" />
                          Manual · {a.sent_by_name}
                        </div>
                      )}
                      {outgoing && !manual && a.title?.startsWith("Mensagem enviada por") && (
                        <div className="mb-0.5 text-[10px] font-medium opacity-80">{a.title.replace("Mensagem enviada por ", "")}</div>
                      )}
                      {outgoing && a.title?.startsWith("EVA respondeu") && (
                        <div className="mb-0.5 text-[10px] font-medium opacity-80">EVA</div>
                      )}
                      {(a.content ?? "").startsWith("[audio]") ? (
                        <AudioBubble content={a.content ?? ""} />
                      ) : (
                        <div className="whitespace-pre-wrap break-words">{a.content ?? a.title}</div>
                      )}
                      <div className={`mt-1 flex items-center gap-1 text-[10px] ${outgoing ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"}`}>
                        <span>{manual ? formatDateTime(a.created_at) : formatShort(a.created_at)}</span>
                        {outgoing && <StatusIcon status={a.status} />}
                      </div>
                      {outgoing && (a.status ?? "").toUpperCase() === "FAILED" && (
                        <div className="mt-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive">
                          Não entregue — a Meta recusou o envio{a.error_message ? `: ${a.error_message}` : ""}.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t bg-card p-3 sm:p-4">
              <div className="flex items-end gap-2">
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) sendAudioFile(f);
                  }}
                />
                <Button
                  variant="outline"
                  size="icon" className="shrink-0 rounded-xl"
                  title="Anexar arquivo de áudio"
                  disabled={!canSend || sending || recording}
                  onClick={() => audioInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant={recording ? "destructive" : "outline"}
                  size="icon" className="shrink-0 rounded-xl"
                  title={recording ? "Parar e enviar áudio" : "Gravar áudio"}
                  disabled={!canSend || sending}
                  onClick={recording ? stopRecording : startRecording}
                >
                  {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Textarea
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={canSend ? "Escreva sua mensagem…" : "Acesso somente leitura — envio bloqueado"}
                  disabled={!canSend}
                  className="min-h-[44px] resize-none rounded-xl bg-muted/40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
                  }}
                />
                <Button onClick={send} disabled={sending || !draft.trim() || !canSend}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {recording
                  ? "Gravando… clique no quadrado para parar e enviar."
                  : "Envio real via Meta Cloud API · ⌘/Ctrl + Enter · 🎤 áudio só depois que o lead responder (janela de 24h)"}
              </div>
            </div>

          </>
        )}
      </div>

      {/* Coluna 3: Ficha rápida */}
      <div className="hidden min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_8px_24px_-18px_oklch(0.42_0.055_210_/_0.5)] xl:flex">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-muted-foreground">Selecione um contato para ver a ficha.</div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="relative">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                    {selected.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-primary/70" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{selected.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{selected.company_name ?? "Sem empresa"}</div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-1">
                <Badge variant="secondary" className="text-[10px]">{FUNNEL_STAGES.find(s => s.key === selected.funnel_stage)?.label ?? selected.funnel_stage}</Badge>
                {selected.cadence_active ? (
                  <Badge className="text-[10px]">Cadência Dia {selected.cadence_day ?? 0}/5</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Fora da cadência</Badge>
                )}
                {selected.do_not_contact && <Badge variant="destructive" className="text-[10px]">Não contatar</Badge>}
                {selected.is_bot && <Badge variant="destructive" className="text-[10px]">Robô/URA</Badge>}
                {(selected.ai_paused || selected.human_takeover) && <Badge variant="outline" className="text-[10px]">Modo manual</Badge>}
              </div>

              <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-center">
                <InfoBlock label="Telefone" value={selected.whatsapp ?? selected.phone} />
                <InfoBlock label="Último contato" value={selected.last_contact_at ? formatDateTime(selected.last_contact_at) : "—"} />
              </div>

              <div className="space-y-3 rounded-xl border p-3">
                <InfoBlock label="Objetivo" value={selected.goal} />
                <InfoBlock label="Dor principal" value={selected.main_pain} />
                <InfoBlock label="Próxima ação" value={selected.next_action} />
              </div>

              <div className="space-y-2 pt-1">
                <Link to="/crm/$id" params={{ id: selected.id }} className="block">
                  <Button variant="outline" className="w-full justify-start rounded-xl"><UserIcon className="mr-2 h-4 w-4" /> Abrir ficha completa</Button>
                </Link>
                <Link to="/agenda" className="block">
                  <Button variant="outline" className="w-full justify-start rounded-xl"><Calendar className="mr-2 h-4 w-4" /> Agendar reunião</Button>
                </Link>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value?.trim() ? value : <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function formatShort(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return same
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
/** Player do áudio enviado — busca uma URL assinada no bucket whatsapp-audio. */
function AudioBubble({ content }: { content: string }) {
  const path = content.replace("[audio]", "").trim().split(" ")[0];
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.storage
      .from("whatsapp-audio")
      .createSignedUrl(path, 3600)
      .then(({ data }) => { if (alive) setUrl(data?.signedUrl ?? null); });
    return () => { alive = false; };
  }, [path]);
  if (!url) return <div className="text-xs opacity-80">🎤 Áudio</div>;
  return <audio controls src={url} className="max-w-[220px]" />;
}
