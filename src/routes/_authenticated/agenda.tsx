import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase, formatDateTime } from "@/lib/db";
import { scheduleMeetingFn, rescheduleMeetingFn, cancelMeetingFn, suggestSlotsFn } from "@/lib/calendar.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Calendar as CalIcon, Video, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agenda")({ component: Agenda });

type View = "hoje" | "futuras" | "concluidas" | "canceladas";

const STATUS_LABEL: Record<string, string> = {
  agendado: "Agendada",
  concluido: "Concluída",
  cancelado: "Cancelada",
  remarcado: "Remarcada",
};

function Agenda() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>("hoje");
  const [detail, setDetail] = useState<any | null>(null);

  const scheduleFn = useServerFn(scheduleMeetingFn);
  const rescheduleFn = useServerFn(rescheduleMeetingFn);
  const cancelFn = useServerFn(cancelMeetingFn);
  const slotsFn = useServerFn(suggestSlotsFn);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () =>
      (
        await supabase
          .from("events")
          .select("*, contact:contacts(id, name, email, whatsapp, phone, funnel_stage, company_id), company:companies(name)")
          .order("starts_at")
      ).data ?? [],
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-min"],
    queryFn: async () => (await supabase.from("contacts").select("id, name, email").order("name").limit(500)).data ?? [],
  });

  const now = new Date();
  const filtered = useMemo(
    () =>
      (events as any[]).filter((e) => {
        const d = new Date(e.starts_at);
        if (view === "canceladas") return e.status === "cancelado";
        if (view === "concluidas") return e.status === "concluido" || (e.status === "agendado" && d < now);
        if (view === "hoje") return e.status !== "cancelado" && d.toDateString() === now.toDateString();
        return e.status === "agendado" && d >= now;
      }),
    [events, view],
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ kind: "reuniao", starts_at: "", duration: 30, online: true });
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const upd = (k: string) => (e: any) => setForm({ ...form, [k]: e?.target?.value ?? e });

  async function loadSlots() {
    const res = await slotsFn({ data: { duration: Number(form.duration) || 30 } });
    if (res.ok) setSlots(res.slots);
    else toast.error(res.error);
  }

  async function save() {
    if (!form.starts_at) return toast.error("Escolha data e hora");
    setSaving(true);
    try {
      if (form.contact_id) {
        const res = await scheduleFn({
          data: {
            contactId: form.contact_id,
            startIso: new Date(form.starts_at).toISOString(),
            duration: Number(form.duration) || 30,
            online: form.online !== false,
            title: form.title || undefined,
          },
        });
        if (!res.ok) return toast.error(res.error);
        toast.success("Reunião criada no Google Calendar e sincronizada");
      } else {
        if (!form.title) return toast.error("Informe um título");
        const { error } = await supabase.from("events").insert({
          title: form.title,
          kind: form.kind,
          starts_at: new Date(form.starts_at).toISOString(),
          location: form.location ?? null,
          notes: form.notes ?? null,
          duration_minutes: Number(form.duration) || 30,
        });
        if (error) return toast.error(error.message);
        toast.success("Evento criado na Agenda");
      }
      setOpen(false);
      setForm({ kind: "reuniao", duration: 30, online: true });
      qc.invalidateQueries({ queryKey: ["events"] });
    } finally {
      setSaving(false);
    }
  }

  async function doCancel(ev: any) {
    if (!ev.contact_id) {
      await supabase.from("events").update({ status: "cancelado" }).eq("id", ev.id);
    } else {
      const res = await cancelFn({ data: { contactId: ev.contact_id } });
      if (!res.ok) return toast.error(res.error ?? "Falha ao cancelar");
    }
    toast.success("Reunião cancelada");
    setDetail(null);
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  async function doReschedule(ev: any, startLocal: string) {
    if (!ev.contact_id) return toast.error("Evento sem contato vinculado");
    const res = await rescheduleFn({ data: { contactId: ev.contact_id, startIso: new Date(startLocal).toISOString() } });
    if (!res.ok) return toast.error(res.error ?? "Falha ao remarcar");
    toast.success("Reunião remarcada e sincronizada");
    setDetail(null);
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} reunião(ões) · sincronizada com o Google Calendar</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="hoje">Hoje</TabsTrigger>
              <TabsTrigger value="futuras">Futuras</TabsTrigger>
              <TabsTrigger value="concluidas">Concluídas</TabsTrigger>
              <TabsTrigger value="canceladas">Canceladas</TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova reunião</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nova reunião</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <F label="Cliente (cria no Google Calendar e no CRM)">
                  <Select value={form.contact_id ?? ""} onValueChange={(v) => setForm({ ...form, contact_id: v || null })}>
                    <SelectTrigger><SelectValue placeholder="— evento interno —" /></SelectTrigger>
                    <SelectContent>
                      {(contacts as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </F>
                <F label="Título"><Input value={form.title ?? ""} onChange={upd("title")} placeholder="Reunião / Sessão - Cliente" /></F>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Data e hora *"><Input type="datetime-local" value={form.starts_at ?? ""} onChange={upd("starts_at")} /></F>
                  <F label="Duração (min)"><Input type="number" value={form.duration} onChange={upd("duration")} /></F>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span>Online (gera Google Meet)</span>
                  <Button type="button" size="sm" variant={form.online !== false ? "default" : "outline"} onClick={() => setForm({ ...form, online: form.online === false })}>
                    {form.online !== false ? "Sim" : "Não"}
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Button type="button" size="sm" variant="outline" onClick={loadSlots}><Clock className="mr-2 h-3 w-3" /> Ver horários livres</Button>
                  {slots.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {slots.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm({ ...form, starts_at: toLocalInput(s) })}
                          className="rounded-full border px-2 py-0.5 text-xs hover:border-primary hover:text-primary"
                        >
                          {formatDateTime(s)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <F label="Observações"><Textarea rows={2} value={form.notes ?? ""} onChange={upd("notes")} /></F>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading && <Card className="p-8 text-center text-muted-foreground">Carregando…</Card>}
        {!isLoading && filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground"><CalIcon className="mx-auto mb-2 h-8 w-8" /> Sem reuniões neste filtro.</Card>
        )}
        {filtered.map((e: any) => (
          <Card key={e.id} className="flex items-center justify-between gap-3 p-4 cursor-pointer hover:border-primary" onClick={() => setDetail(e)}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 font-medium">
                {e.title}
                <Badge variant="secondary" className="text-[10px]">{STATUS_LABEL[e.status] ?? e.status}</Badge>
                {e.source === "eva" && <Badge className="text-[10px]">EVA</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(e.starts_at)} · {e.duration_minutes ?? 30} min
                {e.contact?.name && ` · ${e.contact.name}`}
                {e.company?.name && ` · ${e.company.name}`}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {e.meet_link && (
                <a href={e.meet_link} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="text-primary">
                  <Video className="h-4 w-4" />
                </a>
              )}
              <Button variant="ghost" size="icon" onClick={(ev) => { ev.stopPropagation(); doCancel(e); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <MeetingDetail event={detail} onClose={() => setDetail(null)} onCancel={doCancel} onReschedule={doReschedule} />
    </div>
  );
}

function MeetingDetail({ event, onClose, onCancel, onReschedule }: any) {
  const [newDate, setNewDate] = useState("");
  const { data: history = [] } = useQuery({
    queryKey: ["event-history", event?.contact_id],
    enabled: Boolean(event?.contact_id),
    queryFn: async () =>
      (
        await supabase
          .from("activities")
          .select("id, kind, title, content, created_at")
          .eq("contact_id", event.contact_id)
          .order("created_at", { ascending: false })
          .limit(30)
      ).data ?? [],
  });

  if (!event) return null;
  const c = event.contact ?? {};
  return (
    <Dialog open={Boolean(event)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{event.title}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid gap-1 sm:grid-cols-2">
            <Info label="Quando" value={`${formatDateTime(event.starts_at)} · ${event.duration_minutes ?? 30} min`} />
            <Info label="Status" value={STATUS_LABEL[event.status] ?? event.status} />
            <Info label="Nome" value={c.name ?? "—"} />
            <Info label="Empresa" value={event.company?.name ?? "—"} />
            <Info label="Telefone" value={c.whatsapp ?? c.phone ?? "—"} />
            <Info label="E-mail" value={c.email ?? event.attendee_email ?? "—"} />
            <Info label="Etapa do funil" value={c.funnel_stage ?? "—"} />
            <Info label="Local" value={event.location ?? "—"} />
          </div>
          {event.meet_link && (
            <a href={event.meet_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
              <Video className="h-4 w-4" /> Abrir Google Meet
            </a>
          )}
          {event.notes && <div className="rounded-md border p-2 text-muted-foreground whitespace-pre-wrap">{event.notes}</div>}
          {c.id && (
            <Link to="/crm/$id" params={{ id: c.id }} className="text-xs text-primary hover:underline">Abrir ficha no CRM →</Link>
          )}

          <div className="rounded-md border p-3">
            <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Remarcar</div>
            <div className="flex gap-2">
              <Input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              <Button size="sm" disabled={!newDate} onClick={() => onReschedule(event, newDate)}>Remarcar</Button>
              <Button size="sm" variant="outline" onClick={() => onCancel(event)}>Cancelar reunião</Button>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Histórico completo</div>
            <div className="space-y-1.5">
              {(history as any[]).length === 0 && <div className="text-xs text-muted-foreground">Sem registros.</div>}
              {(history as any[]).map((a) => (
                <div key={a.id} className="rounded border p-2">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{a.kind}</span><span>{formatDateTime(a.created_at)}</span>
                  </div>
                  <div className="text-xs font-medium">{a.title}</div>
                  {a.content && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{a.content}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div><span className="text-xs text-muted-foreground">{label}: </span><span>{value}</span></div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function F({ label, children }: any) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
