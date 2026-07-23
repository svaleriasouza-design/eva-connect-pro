import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCadenceConfigFn,
  saveCadenceStepFn,
  deleteCadenceStepFn,
  saveCadenceSettingsFn,
  runCadenceNowFn,
  type CadenceStep,
  type CadenceSettings,
} from "@/lib/cadence.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Save, Sparkles, Sun, Moon, Play, Trash2, KanbanSquare } from "lucide-react";
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

  const { data, isLoading } = useQuery({
    queryKey: ["cadence-config"],
    queryFn: () => getConfig(),
  });

  const [settings, setSettings] = useState<CadenceSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [running, setRunning] = useState<null | "morning" | "afternoon">(null);

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
    await persistStep({ day, script: "", ai_instructions: "", active: true });
    toast.success(`Dia ${day} adicionado`);
  }

  async function removeDay(day: number) {
    if (!confirm(`Remover o Dia ${day}?`)) return;
    await deleteStep({ data: { day } });
    await qc.invalidateQueries({ queryKey: ["cadence-config"] });
    toast.success(`Dia ${day} removido`);
  }

  async function submitSettings() {
    setSavingSettings(true);
    try {
      const { last_morning_run_at, last_afternoon_run_at, ...payload } = settings;
      void last_morning_run_at; void last_afternoon_run_at;
      await saveSettings({ data: payload });
      toast.success("Configurações salvas");
      await qc.invalidateQueries({ queryKey: ["cadence-config"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSavingSettings(false);
    }
  }

  async function triggerBatch(slot: "morning" | "afternoon") {
    setRunning(slot);
    try {
      const res = await runNow({ data: { slot } });
      toast.success(`Lote ${slot === "morning" ? "manhã" : "tarde"} executado: ${res.sent}/${res.attempted} enviados`);
      if (res.errors.length) console.warn("[cadence] errors", res.errors);
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao rodar lote");
    } finally {
      setRunning(null);
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
            <label className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <div className="font-medium">Somente dias úteis</div>
                <div className="text-xs text-muted-foreground">Pular sábado e domingo</div>
              </div>
              <Switch checked={settings.weekdays_only} onCheckedChange={(v) => setSettings({ ...settings, weekdays_only: v })} />
            </label>
            <label className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <div className="font-medium">EVA responde automaticamente</div>
                <div className="text-xs text-muted-foreground">Usa as instruções cadastradas por dia</div>
              </div>
              <Switch checked={settings.auto_reply_enabled} onCheckedChange={(v) => setSettings({ ...settings, auto_reply_enabled: v })} />
            </label>
            <label className="flex items-center justify-between rounded-md border p-3 text-sm md:col-span-2">
              <div>
                <div className="font-medium">Ativar rotina automática</div>
                <div className="text-xs text-muted-foreground">Dispara os lotes manhã/tarde nos horários configurados</div>
              </div>
              <Switch checked={settings.automation_enabled} onCheckedChange={(v) => setSettings({ ...settings, automation_enabled: v })} />
            </label>
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setScript(step.script);
    setInstructions(step.ai_instructions);
    setActive(step.active);
  }, [step.day, step.script, step.ai_instructions, step.active]);

  async function submit() {
    setSaving(true);
    try {
      await onSave({ day: step.day, script, ai_instructions: instructions, active });
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
          <div className="mt-1 text-[11px] text-muted-foreground">Variáveis: {"{{nome}}"}</div>
        </div>
        <div>
          <Label className="text-xs flex items-center gap-1"><Sparkles className="h-3 w-3 text-[color:var(--gold)]" /> Instruções para a EVA responder</Label>
          <Textarea rows={6} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Ex.: Se o cliente perguntar preço, diga que enviaremos a proposta e proponha reunião de 15 min. Se pedir para não receber mais, encerre educadamente." />
          <div className="mt-1 text-[11px] text-muted-foreground">A EVA usa estas regras quando o cliente responde neste dia.</div>
        </div>
      </div>
    </div>
  );
}