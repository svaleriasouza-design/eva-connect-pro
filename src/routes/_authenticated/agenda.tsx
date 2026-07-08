import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, EVENT_KINDS, formatDateTime } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/agenda")({ component: Agenda });

function Agenda() {
  const qc = useQueryClient();
  const [view, setView] = useState<"hoje" | "semana" | "mes">("semana");
  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => (await supabase.from("events").select("*, contact:contacts(name), company:companies(name)").order("starts_at")).data ?? [],
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-min"],
    queryFn: async () => (await supabase.from("contacts").select("id, name").order("name")).data ?? [],
  });

  const now = new Date();
  const filtered = events.filter((e: any) => {
    const d = new Date(e.starts_at);
    if (view === "hoje") return d.toDateString() === now.toDateString();
    if (view === "semana") { const in7 = new Date(); in7.setDate(now.getDate() + 7); return d >= now && d <= in7; }
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ kind: "reuniao", starts_at: "" });
  const upd = (k: string) => (e: any) => setForm({ ...form, [k]: e?.target?.value ?? e });

  async function save() {
    if (!form.title || !form.starts_at) return toast.error("Preencha título e data");
    const payload = { ...form, starts_at: new Date(form.starts_at).toISOString() };
    const { error } = await supabase.from("events").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Evento criado"); setOpen(false); setForm({ kind: "reuniao" });
    qc.invalidateQueries({ queryKey: ["events"] });
  }
  async function remove(id: string) { await supabase.from("events").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["events"] }); }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Agenda</h1><p className="text-sm text-muted-foreground">{filtered.length} evento(s)</p></div>
        <div className="flex gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList><TabsTrigger value="hoje">Hoje</TabsTrigger><TabsTrigger value="semana">Semana</TabsTrigger><TabsTrigger value="mes">Mês</TabsTrigger></TabsList>
          </Tabs>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo Evento</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo evento</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <F label="Título *"><Input value={form.title ?? ""} onChange={upd("title")} /></F>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Tipo">
                    <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{EVENT_KINDS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                    </Select>
                  </F>
                  <F label="Cliente">
                    <Select value={form.contact_id ?? ""} onValueChange={(v) => setForm({ ...form, contact_id: v || null })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{contacts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </F>
                </div>
                <F label="Data e hora *"><Input type="datetime-local" value={form.starts_at ?? ""} onChange={upd("starts_at")} /></F>
                <F label="Local"><Input value={form.location ?? ""} onChange={upd("location")} /></F>
                <F label="Link Google Meet"><Input value={form.meet_link ?? ""} onChange={upd("meet_link")} /></F>
                <F label="Observações"><Textarea rows={2} value={form.notes ?? ""} onChange={upd("notes")} /></F>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <Card className="p-8 text-center text-muted-foreground"><CalIcon className="mx-auto mb-2 h-8 w-8" /> Sem eventos neste período.</Card>}
        {filtered.map((e: any) => (
          <Card key={e.id} className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2 font-medium">{e.title} <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] uppercase text-primary">{e.kind}</span></div>
              <div className="text-xs text-muted-foreground">{formatDateTime(e.starts_at)} {e.contact?.name && `· ${e.contact.name}`} {e.location && `· ${e.location}`}</div>
              {e.meet_link && <a href={e.meet_link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Abrir Meet</a>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function F({ label, children }: any) { return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>; }