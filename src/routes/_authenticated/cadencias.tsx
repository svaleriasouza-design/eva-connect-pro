import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCadenceConfigFn,
  saveCadenceStepFn,
  deleteCadenceStepFn,
  saveCadenceSettingsFn,
  runCadenceNowFn,
  startCadenceForAllEligibleFn,
  getCadenceStatsFn,
  uploadCadenceAudioFn,
  getCadenceAudioUrlFn,
  type CadenceStep,
  type CadenceSettings,
  type CadenceReplyType,
} from "@/lib/cadence.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Plus, Save, Sparkles, Sun, Moon, Play, Trash2, KanbanSquare, Rocket, Music } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cadencias")({ component: Cadencias });

const DEFAULT_SETTINGS: CadenceSettings = {
  morning_time: "09:00",
  afternoon_time: "15:00",
  batch_size: 10,
  timezone: "America/Sao_Paulo",
  weekdays_only: true,
  auto_reply_enabled: true,
  automation_enabled: false,
  last_morning_run_at: null,
  last_afternoon_run_at: null,
};

function Cadencias() {
  const qc = useQueryClient();
  const getConfig = useServerFn(getCadenceConfigFn);
  const saveStep = useServerFn(saveCadenceStepFn);
  const deleteStep = useServerFn(deleteCadenceStepFn);
  const saveSettings = useServerFn(saveCadenceSettingsFn);
  const runNow = useServerFn(runCadenceNowFn);
  const startAll = useServerFn(startCadenceForAllEligibleFn);
  const getStats = useServerFn(getCadenceStatsFn);

  const { data, isLoading } = useQuery({
    queryKey: ["cadence-config"],
    queryFn: () => getConfig(),
  });
  const { data: stats } = useQuery({
    queryKey: ["cadence-stats"],
    queryFn: () => getStats(),
    refetchInterval: 10000,
  });

  const [settings, setSettings] = useState<CadenceSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [running, setRunning] = useState<null | "morning" | "afternoon">(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (data?.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
  }, [data?.settings]);

  const steps: CadenceStep[] = useMemo(() => data?.steps ?? [], [data?.steps]);
  const nextDay = (steps.length ? Math.max(...steps.map((s) => s.day)) : 0) + 1;

  async function persistStep(step: CadenceStep) {
    await saveStep({ data: step });
    await qc.invalidateQueries({ queryKey: ["cadence-config"] });
  }

  async function addDay() {
    const day = Math.min(30, nextDay);
    await persistStep({
      day,
      script: "",
      ai_instructions: "",
      active: true,
      reply_type: "texto",
      audio_path: null,
      audio_name: null,
    });
    toast.success(`Dia ${day} adicionado`);
  }

  async function removeDay(day: number) {
    if (!confirm(`Remover o Dia ${day}?`)) return;
    await deleteStep({ data: { day } });
    await qc.invalidateQueries({ queryKey: ["cadence-config"] });
    toast.success(`Dia ${day} removido`);
  }

  async function submitSettings() {
    await persistSettings(settings);
  }

  async function toggleAutomation(v: boolean) {
    const next = { ...settings, automation_enabled: v };
    setSettings(next);
    const ok = await persistSettings(next, v ? "Rotina automática ativada" : "Rotina automática pausada");
    if (!ok) setSettings(settings);
  }

  async function persistSettings(value: CadenceSettings, message = "Configurações salvas") {
    setSavingSettings(true);
    try {
      const { last_morning_run_at, last_afternoon_run_at, ...payload } = value;
      void last_morning_run_at; void last_afternoon_run_at;
      await saveSettings({ data: payload });
      toast.success(message);
      await qc.invalidateQueries({ queryKey: ["cadence-config"] });
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
      return false;
    } finally {
      setSavingSettings(false);
    }
  }

  async function triggerBatch(slot: "morning" | "afternoon") {
    setRunning(slot);
    try {
      const res = await runNow({ data: { slot } });
      const label = slot === "morning" ? "manhã" : "tarde";
      if (res.attempted === 0) {
        toast.warning(
          `Lote ${label}: nenhum contato elegível. Clique em "Iniciar cadência para todos os leads" para ativar os novos leads.`,
          { duration: 6000 },
        );
      } else if (res.sent === 0) {
        toast.error(
          `Lote ${label}: 0/${res.attempted} enviados · ${res.failed} falhas · ${res.skipped} pulados. ${res.errors[0] ?? ""}`,
          { duration: 8000 },
        );
      } else {
        toast.success(
          `Lote ${label}: ${res.sent}/${res.attempted} enviados · ${res.failed} falhas · ${res.skipped} pulados`,
        );
      }
      if (res.errors.length) console.warn("[cadence] errors", res.errors);
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao rodar lote");
    } finally {
      setRunning(null);
    }
  }

  async function onStartAll() {
    if (!confirm(`Iniciar a cadência para todos os leads elegíveis (${stats?.eligible ?? "?"} contatos)? Isso ativa o disparo automático nos horários configurados.`)) return;
    setStarting(true);
    try {
      const res = await startAll({ data: undefined as any });
      toast.success(`${res.activated} contatos entraram na cadência.`);
      await qc.invalidateQueries({ queryKey: ["cadence-stats"] });
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao iniciar cadência");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <KanbanSquare className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Cadências</h1>
          <p className="text-sm text-muted-foreground">Scripts por dia, respostas automáticas da EVA e disparos em lote (manhã/tarde).</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Automação</CardTitle>
            <Badge variant={settings.automation_enabled ? "default" : "secondary"}>
              {settings.automation_enabled ? "Ativa" : "Pausada"}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3">
              <div className="text-xs">
                <span className="font-semibold">{stats?.active ?? "…"}</span> na cadência ·{" "}
                <span className="font-semibold">{stats?.eligible ?? "…"}</span> elegíveis ·{" "}
                <span className="font-semibold">{stats?.blocked ?? "…"}</span> bloqueados
              </div>
              <div className="flex-1" />
              <Button size="sm" onClick={onStartAll} disabled={starting || (stats?.eligible ?? 0) === 0}>
                {starting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Rocket className="mr-1 h-4 w-4" />}
                Iniciar cadência para todos os leads elegíveis
              </Button>
            </div>
            <div>
              <Label className="text-xs">Horário do lote da MANHÃ</Label>
              <Input type="time" value={settings.morning_time.slice(0, 5)} onChange={(e) => setSettings({ ...settings, morning_time: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Horário do lote da TARDE</Label>
              <Input type="time" value={settings.afternoon_time.slice(0, 5)} onChange={(e) => setSettings({ ...settings, afternoon_time: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Tamanho do lote (contatos por disparo)</Label>
              <Input type="number" min={1} max={500} value={settings.batch_size} onChange={(e) => setSettings({ ...settings, batch_size: Math.max(1, Number(e.target.value) || 1) })} />
            </div>
            <div>
              <Label className="text-xs">Fuso horário</Label>
              <Input value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <div className="font-medium">Somente dias úteis</div>
                <div className="text-xs text-muted-foreground">Pular sábado e domingo</div>
              </div>
              <Switch checked={settings.weekdays_only} onCheckedChange={(v) => setSettings({ ...settings, weekdays_only: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <div className="font-medium">EVA responde automaticamente</div>
                <div className="text-xs text-muted-foreground">Usa as instruções cadastradas por dia</div>
              </div>
              <Switch checked={settings.auto_reply_enabled} onCheckedChange={(v) => setSettings({ ...settings, auto_reply_enabled: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3 text-sm md:col-span-2">
              <div>
                <div className="font-medium">Ativar rotina automática</div>
                <div className="text-xs text-muted-foreground">
                  Dispara os lotes manhã/tarde nos horários configurados. A mudança é salva na hora.
                </div>
              </div>
              <Switch
                checked={settings.automation_enabled}
                disabled={savingSettings}
                onCheckedChange={(v) => toggleAutomation(v)}
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Button onClick={submitSettings} disabled={savingSettings}>
                {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar configurações
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => triggerBatch("morning")} disabled={running !== null}>
                {running === "morning" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sun className="mr-2 h-4 w-4" />}
                Rodar lote manhã agora
              </Button>
              <Button variant="outline" onClick={() => triggerBatch("afternoon")} disabled={running !== null}>
                {running === "afternoon" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Moon className="mr-2 h-4 w-4" />}
                Rodar lote tarde agora
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Como funciona</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Configure os scripts de cada dia da cadência abaixo.</p>
            <p>2. Para cada dia, escreva as <b>instruções</b> que a EVA deve seguir ao responder o cliente (ex.: "Se pedir preço, ofereça reunião").</p>
            <p>3. Ative um contato na cadência (botão "Iniciar cadência" no CRM). O sistema dispara <b>{settings.batch_size}</b> mensagens de manhã e <b>{settings.batch_size}</b> à tarde.</p>
            <p>4. Quando o cliente responde, a EVA lê a instrução do dia atual e responde sozinha — a cadência para automaticamente.</p>
            <p className="text-xs">Envio 100% via Meta Cloud API. Nenhuma janela do WhatsApp Web é aberta.</p>
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Scripts e treinamento por dia</CardTitle>
          <Button size="sm" onClick={addDay} disabled={nextDay > 30}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar dia {Math.min(30, nextDay)}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          )}
          {!isLoading && steps.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum dia cadastrado. Clique em "Adicionar dia 1" para começar.
            </div>
          )}
          {steps.map((step) => (
            <StepEditor key={step.day} step={step} onSave={persistStep} onDelete={() => removeDay(step.day)} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StepEditor({ step, onSave, onDelete }: { step: CadenceStep; onSave: (s: CadenceStep) => Promise<void>; onDelete: () => void }) {
  const [script, setScript] = useState(step.script);
  const [instructions, setInstructions] = useState(step.ai_instructions);
  const [active, setActive] = useState(step.active);
  const [replyType, setReplyType] = useState<CadenceReplyType>(step.reply_type ?? "texto");
  const [audioPath, setAudioPath] = useState<string | null>(step.audio_path ?? null);
  const [audioName, setAudioName] = useState<string | null>(step.audio_name ?? null);
  const [uploading, setUploading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadAudio = useServerFn(uploadCadenceAudioFn);
  const getAudioUrl = useServerFn(getCadenceAudioUrlFn);

  useEffect(() => {
    setScript(step.script);
    setInstructions(step.ai_instructions);
    setActive(step.active);
    setReplyType(step.reply_type ?? "texto");
    setAudioPath(step.audio_path ?? null);
    setAudioName(step.audio_name ?? null);
    setAudioUrl(null);
  }, [step.day, step.script, step.ai_instructions, step.active, step.reply_type, step.audio_path, step.audio_name]);

  const needsAudio = replyType === "audio" || replyType === "texto_audio";

  async function pickAudio(file: File) {
    setUploading(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode(...buf.subarray(i, i + 8192));
      const res = await uploadAudio({
        data: {
          day: step.day,
          fileName: file.name,
          mime: file.type || "audio/mpeg",
          base64: btoa(bin),
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAudioPath(res.path);
      setAudioName(res.name);
      setAudioUrl(null);
      toast.success("Áudio anexado. Clique em Salvar para vincular a este dia.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao anexar o áudio");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function playAudio() {
    if (!audioPath) return;
    const res = await getAudioUrl({ data: { path: audioPath } });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setAudioUrl(res.url);
  }

  async function submit() {
    if (needsAudio && !audioPath) {
      toast.error("Anexe o áudio desta etapa ou volte o tipo de resposta para Texto.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        day: step.day,
        script,
        ai_instructions: instructions,
        active,
        reply_type: replyType,
        audio_path: needsAudio ? audioPath : null,
        audio_name: needsAudio ? audioName : null,
      });
      toast.success(`Dia ${step.day} salvo`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={active ? "default" : "secondary"}>Dia {step.day}</Badge>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={active} onCheckedChange={setActive} /> Ativo
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Salvar
          </Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs">Mensagem enviada neste dia</Label>
          <Textarea rows={6} value={script} onChange={(e) => setScript(e.target.value)} placeholder="Use {{nome}} para o primeiro nome do contato…" />
          <div className="mt-1 text-[11px] text-muted-foreground">
            Variáveis: {"{{nome}}"} · esta mensagem é sempre enviada como texto (template da Meta).
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs flex items-center gap-1"><Sparkles className="h-3 w-3 text-[color:var(--gold)]" /> Instruções para a EVA responder</Label>
            <Textarea rows={6} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Ex.: Se o cliente perguntar preço, diga que enviaremos a proposta e proponha reunião de 15 min. Se pedir para não receber mais, encerre educadamente." />
            <div className="mt-1 text-[11px] text-muted-foreground">A EVA usa estas regras quando o cliente responde neste dia.</div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 space-y-3">
            <div>
              <Label className="text-xs">Como a EVA responde neste dia</Label>
              <RadioGroup
                className="mt-2 flex flex-wrap gap-4"
                value={replyType}
                onValueChange={(v) => setReplyType(v as CadenceReplyType)}
              >
                {[
                  { v: "texto", l: "Texto" },
                  { v: "audio", l: "Áudio" },
                  { v: "texto_audio", l: "Texto + Áudio" },
                ].map((o) => (
                  <label key={o.v} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={o.v} id={`rt-${step.day}-${o.v}`} />
                    {o.l}
                  </label>
                ))}
              </RadioGroup>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Vale só para a resposta automática da EVA quando o cliente responder — não altera a mensagem do disparo.
              </div>
            </div>

            {needsAudio && (
              <div className="space-y-2">
                <Label className="text-xs">Áudio da resposta da EVA</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/ogg,audio/mp4,audio/aac,audio/amr,audio/x-m4a,.mp3,.ogg,.m4a,.aac,.amr"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void pickAudio(f);
                  }}
                />
                {!audioPath ? (
                  <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                    Adicionar áudio
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Music className="h-4 w-4 text-[color:var(--gold)]" />
                      <span className="truncate">{audioName ?? audioPath.split("/").pop()}</span>
                      <Button size="sm" variant="outline" onClick={playAudio}>
                        <Play className="mr-1 h-3 w-3" /> Reproduzir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAudioPath(null);
                          setAudioName(null);
                          setAudioUrl(null);
                        }}
                      >
                        <Trash2 className="mr-1 h-3 w-3" /> Remover
                      </Button>
                    </div>
                    {audioUrl && <audio controls src={audioUrl} className="w-full max-w-sm" />}
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground">
                  Formatos aceitos pelo WhatsApp: MP3, OGG/Opus, M4A (AAC) ou AMR. O arquivo é guardado uma única vez e
                  reutilizado nas respostas deste dia.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}