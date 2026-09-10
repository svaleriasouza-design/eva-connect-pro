import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BookMarked, Save, Trash2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { FUNNEL_STAGES } from "@/lib/db";

/** Mesmo prefixo/formato usado na aba Disparos, para reaproveitar as campanhas salvas. */
const SAVED_PREFIX = "Disparo: ";

type SavedRow = { id: string; category: string; content: string };
type Campaign = {
  id: string;
  name: string;
  body: string;
  stage: string;
  aiInstructions: string;
};

function parseRow(row: SavedRow): Campaign {
  const fallbackName = row.category.replace(SAVED_PREFIX, "");
  try {
    const p = JSON.parse(row.content);
    if (p && typeof p === "object" && p.__eva) {
      return {
        id: row.id,
        name: p.name ?? fallbackName,
        body: p.body ?? "",
        stage: p.stage ?? "todos",
        aiInstructions: p.aiInstructions ?? "",
      };
    }
  } catch {
    /* modelos antigos guardavam só o texto */
  }
  return { id: row.id, name: fallbackName, body: row.content, stage: "todos", aiInstructions: "" };
}

const stageLabel = (key: string) =>
  key === "todos" ? "Todos os leads" : (FUNNEL_STAGES.find((s) => s.key === key)?.label ?? key);

export const Route = createFileRoute("/_authenticated/campanhas")({
  component: Campanhas,
  head: () => ({
    meta: [
      { title: "Campanhas de WhatsApp · EVA IA" },
      {
        name: "description",
        content:
          "Salve campanhas de WhatsApp com nome, mensagem, etapa do funil e instrução da EVA para reutilizar em disparos futuros.",
      },
      { property: "og:title", content: "Campanhas de WhatsApp · EVA IA" },
      { property: "og:description", content: "Biblioteca de campanhas reutilizáveis para os disparos da EVA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Campanhas() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [stage, setStage] = useState("todos");
  const [aiInstructions, setAiInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["saved-campaign-messages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("message_templates")
        .select("id, category, content")
        .like("category", `${SAVED_PREFIX}%`)
        .order("created_at", { ascending: false });
      return ((data ?? []) as SavedRow[]).map(parseRow);
    },
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setBody("");
    setStage("todos");
    setAiInstructions("");
  }

  function editCampaign(c: Campaign) {
    setEditingId(c.id);
    setName(c.name);
    setBody(c.body);
    setStage(c.stage);
    setAiInstructions(c.aiInstructions);
  }

  async function onSave() {
    if (!name.trim() || !body.trim()) {
      toast.error("Informe o nome e a mensagem da campanha.");
      return;
    }
    setSaving(true);
    const row = {
      category: `${SAVED_PREFIX}${name.trim()}`,
      content: JSON.stringify({
        __eva: 1,
        name: name.trim(),
        body: body.trim(),
        aiInstructions,
        stage,
        q: "",
        batchSize: 50,
        numberIds: [],
      }),
    };
    const { error } = editingId
      ? await supabase.from("message_templates").update(row).eq("id", editingId)
      : await supabase.from("message_templates").insert(row);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar a campanha.");
      return;
    }
    toast.success(editingId ? "Campanha atualizada." : "Campanha salva.");
    resetForm();
    qc.invalidateQueries({ queryKey: ["saved-campaign-messages"] });
  }

  async function onDelete(id: string) {
    const { error } = await supabase.from("message_templates").delete().eq("id", id);
    if (error) toast.error("Não foi possível excluir a campanha.");
    else {
      toast.success("Campanha excluída.");
      if (editingId === id) resetForm();
      qc.invalidateQueries({ queryKey: ["saved-campaign-messages"] });
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-primary" /> Campanhas
        </h1>
        <p className="text-sm text-muted-foreground">
          Guarde aqui suas campanhas prontas — nome, mensagem, etapa do funil e como a EVA deve responder. Depois basta
          escolher a campanha na aba{" "}
          <Link to="/disparos" className="underline">
            Disparos
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar campanha" : "Nova campanha"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label>Nome da campanha</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Bio Impact — Prospecção" />
            </div>
            <div className="space-y-1">
              <Label>Mensagem</Label>
              <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Texto que será enviado…" />
            </div>
            <div className="space-y-1">
              <Label>Etapa do funil</Label>
              <Select value={stage} onValueChange={setStage}>
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
              <Label>Como a EVA deve responder?</Label>
              <Textarea
                rows={4}
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="Descreva como a EVA deve se comportar quando alguém responder a este disparo..."
              />
              <p className="text-xs text-muted-foreground">
                Defina o comportamento da EVA para as respostas recebidas nesta campanha.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingId ? "Salvar alterações" : "Salvar campanha"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" /> Nova campanha
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campanhas salvas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {isLoading && <div className="text-muted-foreground">Carregando…</div>}
            {!isLoading && campaigns.length === 0 && (
              <div className="text-muted-foreground">Nenhuma campanha salva ainda.</div>
            )}
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <Badge variant="outline">{stageLabel(c.stage)}</Badge>
                </div>
                <p className="whitespace-pre-wrap text-xs text-muted-foreground line-clamp-4">{c.body}</p>
                {c.aiInstructions && (
                  <p className="rounded bg-muted/40 p-2 text-xs">
                    <strong>EVA:</strong> {c.aiInstructions}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => editCampaign(c)}>
                    <Pencil className="mr-1 h-3 w-3" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(c.id)}>
                    <Trash2 className="mr-1 h-3 w-3" /> Excluir
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
