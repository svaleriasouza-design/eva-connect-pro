import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listWhatsappNumbersFn } from "@/lib/wa-numbers.functions";
import {
  previewCampaignFn,
  createCampaignFn,
  listCampaignsFn,
  runCampaignBatchFn,
  setCampaignStatusFn,
  campaignBreakdownFn,
} from "@/lib/campaigns.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Megaphone, Play, Pause, Users } from "lucide-react";
import { toast } from "sonner";
import { FUNNEL_STAGES } from "@/lib/db";

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
  const createFn = useServerFn(createCampaignFn);
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
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<null | { total: number; distribution: { id: string; label: string; count: number }[] }>(null);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [detail, setDetail] = useState<null | { id: string; rows: any[] }>(null);

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

  async function onCreate() {
    if (!name.trim() || !body.trim() || selected.length === 0) {
      toast.error("Informe nome, mensagem e ao menos um número de envio.");
      return;
    }
    setBusy(true);
    const res: any = await createFn({
      data: { name, body, numberIds: selected, filter, strategy: "balanced", batchSize },
    });
    setBusy(false);
    if (res?.ok) {
      toast.success(`Disparo criado · ${res.total} contatos distribuídos entre ${res.per.length} número(s).`);
      setName("");
      setBody("");
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    } else toast.error(res?.error || "Falha ao criar o disparo.");
  }

  async function onRun(id: string) {
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
          <CardHeader><CardTitle>Novo disparo</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label>Nome do disparo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Bio Impact — Prospecção" />
            </div>
            <div className="space-y-1">
              <Label>Mensagem</Label>
              <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Texto que será enviado…" />
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

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onPreview} disabled={busy || selected.length === 0}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                Ver distribuição prevista
              </Button>
              <Button onClick={onCreate} disabled={busy || selected.length === 0}>Criar disparo</Button>
            </div>

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
                  <Badge variant="outline">{c.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {c.sent_count}/{c.total_targets} enviadas · {c.failed_count} falhas
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Números: {c.numbers.map((n: any) => n.label).join(", ")}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onRun(c.id)} disabled={running === c.id || c.status === "done" || c.status === "paused"}>
                    {running === c.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                    Processar lote
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await statusFn({ data: { campaignId: c.id, status: c.status === "paused" ? "ready" : "paused" } });
                      qc.invalidateQueries({ queryKey: ["campaigns"] });
                    }}
                  >
                    <Pause className="mr-1 h-3 w-3" /> {c.status === "paused" ? "Retomar" : "Pausar"}
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