import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase, FUNNEL_STAGES, formatDateTime } from "@/lib/db";
import { askEva } from "@/lib/eva.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MessageCircle, Calendar, CheckSquare, Sparkles, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/crm/$id")({ component: Ficha });

function Ficha() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [nextAction, setNextAction] = useState<string | null>(null);
  const [nextLoading, setNextLoading] = useState(false);
  const askServer = useServerFn(askEva);

  const { data: contact } = useQuery({
    queryKey: ["contact", id],
    queryFn: async () => (await supabase.from("contacts").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: activities = [] } = useQuery({
    queryKey: ["activities", id],
    queryFn: async () => (await supabase.from("activities").select("*").eq("contact_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  const [form, setForm] = useState<any>(null);
  const state = form ?? contact ?? {};
  const upd = (k: string) => (e: any) => setForm({ ...state, [k]: e?.target?.value ?? e });

  async function save() {
    if (!form) return;
    const { id: _id, created_at, updated_at, ...patch } = form;
    const { error } = await supabase.from("contacts").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    qc.invalidateQueries({ queryKey: ["contact", id] });
    setForm(null);
  }

  async function remove() {
    if (!confirm("Excluir este contato?")) return;
    await supabase.from("contacts").delete().eq("id", id);
    toast.success("Contato excluído");
    nav({ to: "/crm" });
  }

  async function logActivity(kind: string, title: string, content?: string) {
    await supabase.from("activities").insert({ contact_id: id, kind, title, content: content ?? null });
    await supabase.from("contacts").update({ last_contact_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["activities", id] });
    qc.invalidateQueries({ queryKey: ["contact", id] });
  }

  async function nextBestAction() {
    if (!contact) return;
    setNextLoading(true);
    setNextAction(null);
    const ctx = `Cliente: ${contact.name}. Empresa: ${contact.company_name ?? "—"}. Etapa: ${contact.funnel_stage}. Último contato: ${formatDateTime(contact.last_contact_at)}. Dor: ${contact.main_pain ?? "—"}. Objetivo: ${contact.goal ?? "—"}. Histórico (últimas atividades): ${activities.slice(0,5).map((a:any)=>`${a.kind}:${a.title}`).join(" | ") || "nenhum"}.`;
    try {
      const res = await askServer({ data: { messages: [{ role: "user", content: "Qual é a próxima melhor ação para este cliente? Responda em uma frase curta e direta, propondo apenas UMA ação (ex.: 'Enviar a mensagem do Dia 3.', 'Ligar para este contato.', 'Agendar reunião.', 'Enviar proposta.', 'Reativar lead.', 'Mover para Perdido.'). Justifique em 1 linha." }], context: ctx } });
      setNextAction(res.text);
    } catch { toast.error("EVA falhou"); }
    finally { setNextLoading(false); }
  }

  if (!contact) return <div className="p-6 text-muted-foreground">Carregando…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/crm" })}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Button>
        <div className="flex-1" />
        {form && <Button onClick={save}><Save className="mr-2 h-4 w-4" /> Salvar</Button>}
        <Button variant="destructive" size="sm" onClick={remove}><Trash2 className="mr-1 h-4 w-4" /> Excluir</Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{contact.name}</h1>
          <div className="text-sm text-muted-foreground">{contact.company_name ?? "Sem empresa"} · {contact.city ?? "—"}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {contact.whatsapp && (
            <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" onClick={() => logActivity("whatsapp","Enviou WhatsApp")}>
              <Button size="sm" variant="outline"><MessageCircle className="mr-1 h-4 w-4" /> WhatsApp</Button>
            </a>
          )}
          <Link to="/agenda"><Button size="sm" variant="outline"><Calendar className="mr-1 h-4 w-4" /> Agendar</Button></Link>
          <Link to="/tarefas"><Button size="sm" variant="outline"><CheckSquare className="mr-1 h-4 w-4" /> Tarefa</Button></Link>
          <Button size="sm" onClick={nextBestAction} disabled={nextLoading}>
            <Sparkles className="mr-1 h-4 w-4 text-[color:var(--gold)]" /> {nextLoading ? "Analisando…" : "Próxima Melhor Ação"}
          </Button>
        </div>
      </div>

      {nextAction && (
        <Card className="border-[color:var(--gold)]/40 bg-accent/10">
          <CardContent className="p-4 text-sm">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3 w-3 text-[color:var(--gold)]" /> Sugestão da EVA
            </div>
            {nextAction}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Dados cadastrais</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <F label="Nome"><Input value={state.name ?? ""} onChange={upd("name")} /></F>
            <F label="Empresa"><Input value={state.company_name ?? ""} onChange={upd("company_name")} /></F>
            <F label="WhatsApp"><Input value={state.whatsapp ?? ""} onChange={upd("whatsapp")} /></F>
            <F label="Telefone"><Input value={state.phone ?? ""} onChange={upd("phone")} /></F>
            <F label="E-mail"><Input value={state.email ?? ""} onChange={upd("email")} /></F>
            <F label="Instagram"><Input value={state.instagram ?? ""} onChange={upd("instagram")} /></F>
            <F label="Cidade"><Input value={state.city ?? ""} onChange={upd("city")} /></F>
            <F label="Nascimento"><Input type="date" value={state.birthdate ?? ""} onChange={upd("birthdate")} /></F>
            <F label="Profissão"><Input value={state.profession ?? ""} onChange={upd("profession")} /></F>
            <F label="Filhos"><Input value={state.children ?? ""} onChange={upd("children")} /></F>
            <F label="Serviço de interesse" className="md:col-span-2"><Input value={state.service_interest ?? ""} onChange={upd("service_interest")} /></F>
            <F label="Etapa do funil">
              <Select value={state.funnel_stage} onValueChange={(v) => setForm({ ...state, funnel_stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FUNNEL_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Próxima ação"><Input value={state.next_action ?? ""} onChange={upd("next_action")} /></F>
            <F label="Objetivo" className="md:col-span-2"><Textarea rows={2} value={state.goal ?? ""} onChange={upd("goal")} /></F>
            <F label="Dor principal" className="md:col-span-2"><Textarea rows={2} value={state.main_pain ?? ""} onChange={upd("main_pain")} /></F>
            <F label="Observações" className="md:col-span-2"><Textarea rows={3} value={state.notes ?? ""} onChange={upd("notes")} /></F>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Etapa:</span> <Badge variant="secondary">{FUNNEL_STAGES.find(s=>s.key===contact.funnel_stage)?.label}</Badge></div>
              <div><span className="text-muted-foreground">Último contato:</span> {formatDateTime(contact.last_contact_at)}</div>
              <div><span className="text-muted-foreground">Origem:</span> {contact.origin ?? "—"}</div>
              <div><span className="text-muted-foreground">Não contatar:</span> {contact.do_not_contact ? "Sim" : "Não"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Linha do tempo</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              <NoteAdder onAdd={(t) => logActivity("nota","Nota", t)} />
              {activities.length === 0 && <p className="text-xs text-muted-foreground">Sem atividades ainda.</p>}
              {activities.map((a: any) => (
                <div key={a.id} className="rounded-md border-l-2 border-primary/40 bg-muted/40 p-2 text-xs">
                  <div className="flex justify-between"><b>{a.title}</b><span className="text-muted-foreground">{formatDateTime(a.created_at)}</span></div>
                  {a.content && <div className="text-muted-foreground mt-1">{a.content}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function NoteAdder({ onAdd }: { onAdd: (t: string) => void }) {
  const [t, setT] = useState("");
  return (
    <div className="flex gap-2">
      <Input placeholder="Registrar observação…" value={t} onChange={(e) => setT(e.target.value)} />
      <Button size="sm" onClick={() => { if (t.trim()) { onAdd(t.trim()); setT(""); } }}>+</Button>
    </div>
  );
}

function F({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className}`}><Label className="text-xs">{label}</Label>{children}</div>;
}