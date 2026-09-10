import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listWhatsappNumbersFn } from "@/lib/wa-numbers.functions";
import {
  previewCampaignFn,
  listCampaignsFn,
  runCampaignBatchFn,
  setCampaignStatusFn,
  campaignBreakdownFn,
  saveDraftCampaignFn,
  scheduleDraftCampaignFn,
  listDraftCampaignsFn,
} from "@/lib/campaigns.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Megaphone, Play, Pause, Users, Save, CalendarClock, X } from "lucide-react";
import { toast } from "sonner";
import { FUNNEL_STAGES } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

const SAVED_PREFIX = "Disparo: ";

const STATUS_LABEL: Record<string, string> = {
  draft: "📝 Rascunho",
  scheduled: "🕐 Agendado",
  ready: "🕐 Agendado",
  running: "🟢 Em andamento",
  done: "✅ Concluído",
  paused: "⏸️ Pausado",
  cancelled: "❌ Cancelado",
};

function fmtWhen(iso: string | null) {
  if (!iso) return "sem agendamento";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export const Route = createFileRoute("/_authenticated/disparos")({
  component: Disparos,
  head: () => ({
    meta: [
      { title: "Disparos WhatsApp · EVA IA" },
      {
        name: "description",
        content: "Crie disparos de WhatsApp escolhendo vários números da EVA e distribua os contatos entre eles.",
      },
      { property: "og:title", content: "Disparos WhatsApp · EVA IA" },
      { property: "og:description", content: "Campanhas multi-número com distribuição automática de contatos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Disparos() {
  const qc = useQueryClient();
  const listNumbers = useServerFn(listWhatsappNumbersFn);
  const previewFn = useServerFn(previewCampaignFn);
  const saveDraftFn = useServerFn(saveDraftCampaignFn);
  const scheduleFn = useServerFn(scheduleDraftCampaignFn);
  const listDraftsFn = useServerFn(listDraftCampaignsFn);
  const listFn = useServerFn(listCampaignsFn);
  const runFn = useServerFn(runCampaignBatchFn);
  const statusFn = useServerFn(setCampaignStatusFn);
  const breakdownFn = useServerFn(campaignBreakdownFn);

  const { data: numbers = [] } = useQuery({ queryKey: ["wa-numbers"], queryFn: () => listNumbers() });
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: () => listFn() });

  const active = useMemo(() => numbers.filter((n) => n.active && n.has_access_token), [numbers]);

  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [stage, setStage] = useState<string>("todos");
  const [q, setQ] = useState("");
  const [batchSize, setBatchSize] = useState(50);
  const [aiInstructions, setAiInstructions] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("09:30");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [preview, setPreview] = useState<null | { total: number; distribution: { id: string; label: string; count: number }[] }>(null);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [detail, setDetail] = useState<null | { id: string; rows: any[] }>(null);
  const [saving, setSaving] = useState(false);
  // Id do disparo em edição — garante UPDATE do mesmo registro, sem duplicar.
  const [draftId, setDraftId] = useState<string | null>(null);
  // Status do disparo em edição ("draft" | "scheduled" | ...).
  const [editStatus, setEditStatus] = useState<string>("draft");

  // Rascunhos salvos (mesma tabela de disparos, status "Rascunho").
  const { data: drafts = [] } = useQuery({
    queryKey: ["campaign-drafts"],
    queryFn: () => listDraftsFn(),
  });

  // Modelos antigos salvos na aba Campanhas (compatibilidade).
  const { data: saved = [] } = useQuery({
    queryKey: ["saved-campaign-messages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("message_templates")
        .select("id, category, content")
        .like("category", `${SAVED_PREFIX}%`)
        .order("created_at", { ascending: false });
      return (data ?? []) as { id: string; category: string; content: string }[];
    },
  });

  const draftConfig = useMemo(
    () => ({ stage, q, schedDate, schedTime, batchSize, numberIds: selected }),
    [stage, q, schedDate, schedTime, batchSize, selected],
  );

  const isScheduledEdit = Boolean(draftId) && editStatus !== "draft";

  /** Data/horário agendados em campos separados (para reabrir na edição). */
  function localParts(iso: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const p = (n: number) => String(n).padStart(2, "0");
    return {
      date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
      time: `${p(d.getHours())}:${p(d.getMinutes())}`,
    };
  }

  /** Salva o disparo. Nunca envia e não limpa o formulário. */
  async function onSaveDraft() {
    if (!name.trim() || !body.trim()) {
      toast.error("Informe o nome e a mensagem antes de salvar.");
      return;
    }
    if (isScheduledEdit && selected.length === 0) {
      toast.error("Selecione ao menos um número de envio.");
      return;
    }
    let scheduledAt: string | null = null;
    if (isScheduledEdit && schedDate && schedTime) {
      const when = new Date(`${schedDate}T${schedTime}:00`);
      if (Number.isNaN(when.getTime())) {
        toast.error("Data ou horário inválidos.");
        return;
      }
      scheduledAt = when.toISOString();
    }
    setSaving(true);
    try {
      const res: any = await saveDraftFn({
        data: {
          campaignId: draftId,
          name: name.trim(),
          body,
          numberIds: selected,
          filter,
          batchSize,
          aiInstructions,
          draftConfig,
          scheduledAt,
        },
      });
      if (res?.ok) {
        setDraftId(res.campaignId);
        setEditStatus(res.status ?? "draft");
        toast.success(
          res.status && res.status !== "draft"
            ? "Disparo atualizado — continua agendado."
            : "Disparo salvo como rascunho.",
        );
        qc.invalidateQueries({ queryKey: ["campaign-drafts"] });
        qc.invalidateQueries({ queryKey: ["campaigns"] });
      } else toast.error(res?.error || "Não foi possível salvar o disparo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o disparo.");
    } finally {
      setSaving(false);
    }
  }

  /** Abre um disparo (rascunho ou agendado) para edição, com todos os campos. */
  function loadDraft(d: any) {
    const cfg = (d.draft_config ?? {}) as any;
    const sched = localParts(d.scheduled_at ?? null);
    setDraftId(d.id);
    setEditStatus((d.status as string) ?? "draft");
    setName(d.name ?? "");
    setBody(d.body ?? "");
    setAiInstructions(d.ai_instructions ?? "");
    setStage(cfg.stage ?? "todos");
    setQ(cfg.q ?? "");
    setBatchSize(Number(d.batch_size) > 0 ? Number(d.batch_size) : 50);
    setSelected(Array.isArray(d.number_ids) ? d.number_ids : []);
    setSchedDate(cfg.schedDate ?? sched?.date ?? "");
    setSchedTime(cfg.schedTime || sched?.time || "09:30");
    setPreview(null);
    setConfirmation(null);
  }

  /** Editar pela lista "Disparos criados" — bloqueado se o envio já começou. */
  function onEditCampaign(c: any) {
    if (c.status === "running" || c.status === "done" || (c.sent_count ?? 0) > 0) {
      toast.error("Este disparo já está em andamento — não é possível editar.");
      return;
    }
    loadDraft(c);
    toast.success("Disparo aberto para edição.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function loadSaved(raw: string, fallbackName: string) {
    let parsed: any = null;
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === "object" && p.__eva) parsed = p;
    } catch {
      parsed = null;
    }
    setDraftId(null);
    if (!parsed) {
      // Modelos antigos guardavam apenas o texto da mensagem.
      setName(fallbackName);
      setBody(raw);
      setPreview(null);
      return;
    }
    setName(parsed.name ?? fallbackName);
    setBody(parsed.body ?? "");
    setAiInstructions(parsed.aiInstructions ?? "");
    setStage(parsed.stage ?? "todos");
    setQ(parsed.q ?? "");
    setBatchSize(Number(parsed.batchSize) > 0 ? Number(parsed.batchSize) : 50);
    setSelected(Array.isArray(parsed.numberIds) ? parsed.numberIds : []);
    setPreview(null);
  }

  function onNewDraft() {
    setDraftId(null);
    setName("");
    setBody("");
    setAiInstructions("");
    setStage("todos");
    setQ("");
    setSelected([]);
    setSchedDate("");
    setSchedTime("09:30");
    setPreview(null);
    setConfirmation(null);
  }

  const filter = useMemo(
    () => ({ q: q.trim() || null, stage: stage === "todos" ? null : stage, batch: null }),
    [q, stage],
  );

  function toggle(id: string) {
    setPreview(null);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function onPreview() {
    setBusy(true);
    const res = await previewFn({ data: { numberIds: selected, filter } });
    setBusy(false);
    setPreview(res);
  }

  async function onSchedule() {
    if (!name.trim() || !body.trim() || selected.length === 0) {
      toast.error("Informe nome, mensagem e ao menos um número de envio.");
      return;
    }
    if (!schedDate || !schedTime) {
      toast.error("Escolha a data e o horário do disparo.");
      return;
    }
    const when = new Date(`${schedDate}T${schedTime}:00`);
    if (Number.isNaN(when.getTime())) {
      toast.error("Data ou horário inválidos.");
      return;
    }
    if (when.getTime() < Date.now() - 60_000) {
      toast.error("Escolha uma data e horário no futuro.");
      return;
    }
    const ok = window.confirm(
      `Agendar este disparo para ${fmtWhen(when.toISOString())}? Nenhuma mensagem é enviada agora — o envio começa automaticamente no horário.`,
    );
    if (!ok) return;

    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        body,
        numberIds: selected,
        filter,
        batchSize,
        aiInstructions,
        draftConfig,
      };
      // Garante um rascunho salvo (mesmo registro) antes de agendar.
      let id = draftId;
      if (!id) {
        const saved: any = await saveDraftFn({ data: { ...payload, campaignId: null } });
        if (!saved?.ok) {
          toast.error(saved?.error || "Falha ao salvar o disparo.");
          return;
        }
        id = saved.campaignId as string;
        setDraftId(id);
      }
      const res: any = await scheduleFn({
        data: { ...payload, campaignId: id, scheduledAt: when.toISOString() },
      });
      if (res?.ok) {
        const msg = `Disparo agendado com sucesso! A campanha será iniciada em ${fmtWhen(when.toISOString())}.`;
        toast.success(msg);
        setConfirmation(`${msg} ${res.total} contato(s) distribuído(s) entre ${res.per.length} número(s).`);
        setDraftId(null);
        setPreview(null);
        qc.invalidateQueries({ queryKey: ["campaigns"] });
        qc.invalidateQueries({ queryKey: ["campaign-drafts"] });
      } else toast.error(res?.error || "Falha ao agendar o disparo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao agendar o disparo.");
    } finally {
      setBusy(false);
    }
  }

  async function onRun(id: string) {
    // Ação separada e sempre confirmada — nunca acionada por "Salvar" ou "Agendar".
    const c = (campaigns as any[]).find((x) => x.id === id);
    const ok = window.confirm(
      `Enviar agora um lote do disparo "${c?.name ?? ""}"? As mensagens serão enviadas imediatamente.`,
    );
    if (!ok) return;
    setRunning(id);
    const res: any = await runFn({ data: { campaignId: id } });
    setRunning(null);
    if (res?.ok) {
      toast.success(`Lote processado · ${res.sent} enviadas, ${res.failed} falhas, ${res.pending} restantes.`);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } else toast.error(res?.error || "Falha ao processar o lote.");
  }

  async function onDetail(id: string) {
    const rows = await breakdownFn({ data: { campaignId: id } });
    setDetail({ id, rows: rows as any[] });
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" /> Disparos
        </h1>
        <p className="text-sm text-muted-foreground">
          Escolha um ou vários números de envio — a EVA distribui os contatos entre eles, sem repetir contato.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>{draftId ? "Editando rascunho" : "Novo disparo"}</CardTitle>
            {draftId && (
              <Button variant="ghost" size="sm" onClick={onNewDraft}>
                Novo disparo
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label>Nome do disparo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Bio Impact — Prospecção" />
            </div>
            <div className="space-y-1">
              <Label>Mensagem</Label>
              <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Texto que será enviado…" />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar disparo
                </Button>
                {(drafts.length > 0 || saved.length > 0) && (
                  <Select
                    value=""
                    onValueChange={(id) => {
                      const d = (drafts as any[]).find((x) => x.id === id);
                      if (d) {
                        loadDraft(d);
                        toast.success("Rascunho carregado para edição.");
                        return;
                      }
                      const t = saved.find((s) => s.id === id);
                      if (!t) return;
                      loadSaved(t.content, t.category.replace(SAVED_PREFIX, ""));
                      toast.success("Disparo carregado.");
                    }}
                  >
                    <SelectTrigger className="h-9 w-full sm:w-64">
                      <SelectValue placeholder="Usar disparos salvos" />
                    </SelectTrigger>
                    <SelectContent>
                      {(drafts as any[]).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          📝 {d.name}
                        </SelectItem>
                      ))}
                      {saved.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.category.replace(SAVED_PREFIX, "")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Como a EVA deve responder?</Label>
              <Textarea
                rows={10}
                className="min-h-[220px]"
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="Descreva como a EVA deve se comportar quando alguém responder a este disparo..."
              />
              <p className="text-xs text-muted-foreground">
                Defina o comportamento da EVA para as respostas recebidas nesta campanha. Sem limite de caracteres —{" "}
                {aiInstructions.length.toLocaleString("pt-BR")} caractere(s) escritos.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Etapa do funil</Label>
                <Select value={stage} onValueChange={(v) => { setStage(v); setPreview(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os leads</SelectItem>
                    {FUNNEL_STAGES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Busca (nome, empresa, telefone)</Label>
                <Input value={q} onChange={(e) => { setQ(e.target.value); setPreview(null); }} />
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="font-medium">Números de envio</div>
              {active.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  Nenhum número ativo. Cadastre em Configurações &rarr; Números WhatsApp.
                </div>
              )}
              {active.map((n) => (
                <div key={n.id} className="flex items-center gap-2">
                  <Checkbox checked={selected.includes(n.id)} onCheckedChange={() => toggle(n.id)} id={`n-${n.id}`} />
                  <label htmlFor={`n-${n.id}`} className="cursor-pointer">
                    {n.label} {n.display_phone && <span className="text-muted-foreground">· {n.display_phone}</span>}
                    {n.is_primary && <Badge variant="secondary" className="ml-2">Principal</Badge>}
                  </label>
                </div>
              ))}
              <div className="text-xs text-muted-foreground">{selected.length} número(s) selecionado(s)</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Estratégia de distribuição</Label>
                <Select value="balanced" onValueChange={() => {}}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="balanced">Equilibrada</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Mensagens por lote</Label>
                <Input type="number" value={batchSize} onChange={(e) => setBatchSize(Math.max(1, +e.target.value))} />
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="font-medium">Agendamento</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Data do disparo</Label>
                  <Input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Horário do disparo</Label>
                  <Input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                O disparo será iniciado automaticamente nesta data e horário.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onPreview} disabled={busy || selected.length === 0}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                Ver distribuição prevista
              </Button>
              <Button onClick={onSchedule} disabled={busy || selected.length === 0}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
                Agendar disparo
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              “Salvar disparo” apenas guarda o rascunho — nenhuma mensagem é enviada. O envio só começa no horário
              agendado.
            </p>

            {confirmation && (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-xs">{confirmation}</div>
            )}

            {preview && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
                <div>Contatos: <strong>{preview.total}</strong> · Números selecionados: <strong>{preview.distribution.length}</strong></div>
                {preview.distribution.map((d) => (
                  <div key={d.id}>{d.label} → {d.count}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Disparos criados</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {campaigns.length === 0 && <div className="text-muted-foreground">Nenhum disparo ainda.</div>}
            {campaigns.map((c: any) => (
              <div key={c.id} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <Badge variant="outline">{STATUS_LABEL[c.status] ?? c.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {c.sent_count}/{c.total_targets} enviadas · {c.failed_count} falhas
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Números: {c.numbers.map((n: any) => n.label).join(", ")}
                </div>
                {c.scheduled_at && (
                  <div className="text-xs text-muted-foreground">
                    Início programado: <strong>{fmtWhen(c.scheduled_at)}</strong>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => onRun(c.id)}
                    disabled={
                      running === c.id ||
                      c.status === "done" ||
                      c.status === "paused" ||
                      c.status === "draft" ||
                      c.status === "cancelled"
                    }
                  >
                    {running === c.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                    Enviar agora (1 lote)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={c.status === "done" || c.status === "cancelled"}
                    onClick={async () => {
                      await statusFn({
                        data: { campaignId: c.id, status: c.status === "paused" ? "scheduled" : "paused" },
                      });
                      qc.invalidateQueries({ queryKey: ["campaigns"] });
                      toast.success(c.status === "paused" ? "Disparo retomado." : "Disparo pausado.");
                    }}
                  >
                    <Pause className="mr-1 h-3 w-3" /> {c.status === "paused" ? "Retomar" : "Pausar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={c.status === "cancelled" || c.status === "done"}
                    onClick={async () => {
                      await statusFn({ data: { campaignId: c.id, status: "cancelled" } });
                      qc.invalidateQueries({ queryKey: ["campaigns"] });
                      toast.success("Disparo cancelado.");
                    }}
                  >
                    <X className="mr-1 h-3 w-3" /> Cancelar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDetail(c.id)}>Ver por número</Button>
                </div>
                {detail !== null && detail.id === c.id && (
                  <div className="rounded-md bg-muted/40 p-2 text-xs space-y-1">
                    {detail.rows.length === 0 && <div>Sem alvos registrados.</div>}
                    {detail.rows.map((r) => (
                      <div key={r.id}>{r.label}: {r.sent} enviadas · {r.failed} falhas · {r.pending} pendentes</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}