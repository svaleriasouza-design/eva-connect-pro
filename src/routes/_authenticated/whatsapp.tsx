import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, MESSAGE_CATEGORIES } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, MessageCircle, Info, MessagesSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/whatsapp")({ component: WhatsApp });

function WhatsApp() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /> WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Cadência automática e biblioteca de mensagens.</p>
      </div>
      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <MessagesSquare className="h-4 w-4 shrink-0" />
        <span>As conversas agora ficam na aba <Link to="/atendimento" className="font-medium text-primary underline">Atendimento</Link>, com envio de texto e áudio.</span>
      </div>
      <Tabs defaultValue="cadencia">
        <TabsList>
          <TabsTrigger value="cadencia">Cadência</TabsTrigger>
          <TabsTrigger value="biblioteca">Biblioteca</TabsTrigger>
        </TabsList>
        <TabsContent value="cadencia"><Cadencia /></TabsContent>
        <TabsContent value="biblioteca"><Biblioteca /></TabsContent>
      </Tabs>
    </div>
  );
}

function Cadencia() {
  const [perDay, setPerDay] = useState(20);
  const [interval, setIntervalMin] = useState(5);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Configurações</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label className="text-xs">Mensagens por dia</Label><Input type="number" value={perDay} onChange={(e) => setPerDay(+e.target.value)} /></div>
          <div>
            <Label className="text-xs">Intervalo entre mensagens (min)</Label>
            <Select value={String(interval)} onValueChange={(v) => setIntervalMin(+v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[3,5,7,10].map(n => <SelectItem key={n} value={String(n)}>{n} minutos</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button className="w-full"><Plus className="mr-2 h-4 w-4" /> Iniciar cadência</Button>
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>O envio real de WhatsApp requer integração com Twilio, Meta Cloud API ou Z-API. Esta versão organiza a cadência e a biblioteca; o disparo é feito clicando em "WhatsApp" na ficha do cliente.</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Regras da EVA</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>• Ao responder, a cadência é interrompida automaticamente.</p>
          <p>• O contato é movido para "Respondido" e a EVA sugere resposta.</p>
          <p>• Contatos marcados como "Não contatar" são ignorados.</p>
          <p>• A IA rotaciona variantes para reduzir repetição.</p>
          <p>• Mensagens nunca são enviadas simultaneamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Biblioteca() {
  const qc = useQueryClient();
  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await supabase.from("message_templates").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [category, setCategory] = useState<string>(MESSAGE_CATEGORIES[0]);
  const [content, setContent] = useState("");
  async function add() {
    if (!content.trim()) return;
    await supabase.from("message_templates").insert({ category, content });
    setContent(""); toast.success("Modelo salvo");
    qc.invalidateQueries({ queryKey: ["templates"] });
  }
  async function remove(id: string) { await supabase.from("message_templates").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["templates"] }); }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader><CardTitle>Nova mensagem</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MESSAGE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Texto da mensagem…" />
          <Button className="w-full" onClick={add}><Plus className="mr-2 h-4 w-4" /> Salvar variante</Button>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Biblioteca</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
          {MESSAGE_CATEGORIES.map((cat) => {
            const items = templates.filter((t: any) => t.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <div className="text-xs font-semibold uppercase text-muted-foreground mt-3 mb-1">{cat}</div>
                {items.map((t: any) => (
                  <div key={t.id} className="flex justify-between items-start gap-2 rounded-md border p-2 mb-1 text-sm">
                    <div className="whitespace-pre-wrap">{t.content}</div>
                    <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            );
          })}
          {templates.length === 0 && <div className="text-sm text-muted-foreground">Nenhum modelo ainda.</div>}
        </CardContent>
      </Card>
    </div>
  );
}