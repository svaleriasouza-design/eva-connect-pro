import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase, formatDateTime } from "@/lib/db";
import {
  scheduleMeetingFn,
  rescheduleMeetingFn,
  cancelMeetingFn,
  suggestSlotsFn,
  listAgendaEventsFn,
  saveAgendaEventFn,
  deleteAgendaEventFn,
} from "@/lib/calendar.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Plus, Video, Loader2, Clock, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda · EVA" },
      { name: "description", content: "Agenda da EVA sincronizada com o Google Agenda: visões de mês, semana e dia." },
      { property: "og:title", content: "Agenda · EVA" },
      { property: "og:description", content: "Agenda sincronizada com o Google Agenda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Agenda,
});

type Mode = "month" | "week" | "day";
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_PX = 48;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function rangeFor(mode: Mode, cursor: Date) {
  if (mode === "day") return { start: startOfDay(cursor), end: addDays(startOfDay(cursor), 1) };
  if (mode === "week") {
    const s = addDays(startOfDay(cursor), -cursor.getDay());
    return { start: s, end: addDays(s, 7) };
  }
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const s = addDays(first, -first.getDay());
  return { start: s, end: addDays(s, 42) };
}

function Agenda() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [detail, setDetail] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null); // {} = novo

  const listFn = useServerFn(listAgendaEventsFn);
  const { start, end } = rangeFor(mode, cursor);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["agenda-events", start.toISOString(), end.toISOString()],
    queryFn: () => listFn({ data: { timeMin: start.toISOString(), timeMax: end.toISOString() } }),
  });
  const events = ((data?.events ?? []) as any[]).map((e) => ({ ...e, _start: new Date(e.starts_at) }));
  const refresh = () => qc.invalidateQueries({ queryKey: ["agenda-events"] });

  function shift(dir: number) {
    if (mode === "day") setCursor(addDays(cursor, dir));
    else if (mode === "week") setCursor(addDays(cursor, 7 * dir));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
  }

  const title = useMemo(() => {
    if (mode === "day")
      return cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (mode === "week") {
      const e = addDays(start, 6);
      return `${start.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [mode, cursor, start]);

  const openNew = (d?: Date) => setEditing({ _new: true, starts_at: d ? d.toISOString() : undefined });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold mr-2">Agenda</h1>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Hoje</Button>
          <Button variant="ghost" size="icon" aria-label="Anterior" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" aria-label="Próximo" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-lg font-medium capitalize">{title}</span>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="day">Dia</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => openNew()}><Plus className="mr-2 h-4 w-4" /> Criar</Button>
        </div>
      </div>

      {data?.googleError && (
        <Card className="border-destructive/40 p-3 text-sm text-destructive">
          Não foi possível ler sua Google Agenda: {data.googleError} Mostrando apenas os eventos salvos na EVA.
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-muted-foreground">Carregando…</Card>
      ) : mode === "month" ? (
        <MonthGrid start={start} cursor={cursor} events={events} onPick={setDetail} onDay={(d: Date) => { setCursor(d); setMode("day"); }} />
      ) : (
        <TimeGrid days={mode === "day" ? [start] : Array.from({ length: 7 }, (_, i) => addDays(start, i))} events={events} onPick={setDetail} onSlot={openNew} />
      )}

      <EventDetail
        event={detail}
        onClose={() => setDetail(null)}
        onEdit={(e: any) => { setDetail(null); setEditing(e); }}
        onChanged={() => { setDetail(null); refresh(); }}
      />
      <EventForm event={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
    </div>
  );
}

function EventChip({ e, onPick }: any) {
  return (
    <button
      onClick={(ev) => { ev.stopPropagation(); onPick(e); }}
      className={cn(
        "w-full truncate rounded px-1.5 py-0.5 text-left text-[11px]",
        e.source === "google" ? "bg-secondary text-secondary-foreground" : "bg-primary/15 text-primary",
      )}
    >
      {!e.all_day && <span className="font-medium">{e._start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} </span>}
      {e.title}
    </button>
  );
}

function MonthGrid({ start, cursor, events, onPick, onDay }: any) {
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const today = new Date();
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((w) => <div key={w} className="py-2">{w}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const list = events.filter((e: any) => sameDay(e._start, d));
          return (
            <div key={d.toISOString()} className={cn("min-h-24 border-b border-r p-1 space-y-0.5", d.getMonth() !== cursor.getMonth() && "bg-muted/40")}>
              <button
                onClick={() => onDay(d)}
                className={cn("mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs hover:bg-accent", sameDay(d, today) && "bg-primary text-primary-foreground")}
              >
                {d.getDate()}
              </button>
              {list.slice(0, 3).map((e: any) => <EventChip key={e.id} e={e} onPick={onPick} />)}
              {list.length > 3 && (
                <button onClick={() => onDay(d)} className="px-1 text-[11px] text-muted-foreground hover:underline">+{list.length - 3} mais</button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TimeGrid({ days, events, onPick, onSlot }: any) {
  const today = new Date();
  return (
    <Card className="overflow-hidden">
      <div className="grid border-b" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
        <div />
        {days.map((d: Date) => (
          <div key={d.toISOString()} className="py-2 text-center">
            <div className="text-xs text-muted-foreground">{WEEKDAYS[d.getDay()]}</div>
            <div className={cn("mx-auto flex h-8 w-8 items-center justify-center rounded-full text-lg", sameDay(d, today) && "bg-primary text-primary-foreground")}>{d.getDate()}</div>
            {events.filter((e: any) => e.all_day && sameDay(e._start, d)).map((e: any) => <div key={e.id} className="px-1"><EventChip e={e} onPick={onPick} /></div>)}
          </div>
        ))}
      </div>
      <div className="max-h-[70vh] overflow-y-auto">
        <div className="grid relative" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div>
            {HOURS.map((h) => (
              <div key={h} style={{ height: HOUR_PX }} className="pr-1 text-right text-[10px] text-muted-foreground -translate-y-1.5">{h ? `${String(h).padStart(2, "0")}:00` : ""}</div>
            ))}
          </div>
          {days.map((d: Date) => (
            <div key={d.toISOString()} className="relative border-l">
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ height: HOUR_PX }}
                  className="border-b border-border/50 hover:bg-accent/40 cursor-pointer"
                  onClick={() => onSlot(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h))}
                />
              ))}
              {events
                .filter((e: any) => !e.all_day && sameDay(e._start, d))
                .map((e: any) => {
                  const top = (e._start.getHours() + e._start.getMinutes() / 60) * HOUR_PX;
                  const h = Math.max(20, ((e.duration_minutes ?? 30) / 60) * HOUR_PX - 2);
                  return (
                    <button
                      key={e.id}
                      onClick={() => onPick(e)}
                      style={{ top, height: h }}
                      className={cn(
                        "absolute left-0.5 right-0.5 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm",
                        e.source === "google" ? "bg-secondary text-secondary-foreground border" : "bg-primary text-primary-foreground",
                      )}
                    >
                      <div className="font-medium truncate">{e.title}</div>
                      <div className="opacity-80">{e._start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function EventDetail({ event, onClose, onEdit, onChanged }: any) {
  const delFn = useServerFn(deleteAgendaEventFn);
  const cancelFn = useServerFn(cancelMeetingFn);
  const [busy, setBusy] = useState(false);
  if (!event) return null;
  const c = event.contact ?? null;

  async function remove() {
    if (!confirm("Excluir este evento? Ele também será removido do Google Agenda.")) return;
    setBusy(true);
    try {
      const res = event.contact_id
        ? await cancelFn({ data: { contactId: event.contact_id } })
        : await delFn({ data: { id: event.id } });
      if (!res.ok) return toast.error((res as any).error ?? "Falha ao excluir");
      toast.success("Evento excluído");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{event.title}</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-1">
            {event.source === "google" ? <Badge variant="secondary">Google Agenda</Badge> : <Badge>EVA</Badge>}
          </div>
          <Info label="Quando" value={event.all_day ? event._start.toLocaleDateString("pt-BR") + " · dia inteiro" : `${formatDateTime(event.starts_at)} · ${event.duration_minutes ?? 30} min`} />
          {event.location && <Info label="Local" value={event.location} />}
          {c && <Info label="Contato" value={c.name} />}
          {c && (c.whatsapp || c.phone) && <Info label="Telefone" value={c.whatsapp ?? c.phone} />}
          {event.company?.name && <Info label="Empresa" value={event.company.name} />}
          {event.meet_link && (
            <a href={event.meet_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
              <Video className="h-4 w-4" /> Abrir Google Meet
            </a>
          )}
          {event.notes && <div className="rounded-md border p-2 text-muted-foreground whitespace-pre-wrap">{event.notes}</div>}
          {c?.id && <Link to="/crm/$id" params={{ id: c.id }} className="text-xs text-primary hover:underline">Abrir ficha no CRM →</Link>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={remove} disabled={busy}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
          <Button onClick={() => onEdit(event)}><Pencil className="mr-2 h-4 w-4" /> Editar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventForm({ event, onClose, onSaved }: any) {
  const saveFn = useServerFn(saveAgendaEventFn);
  const scheduleFn = useServerFn(scheduleMeetingFn);
  const rescheduleFn = useServerFn(rescheduleMeetingFn);
  const slotsFn = useServerFn(suggestSlotsFn);
  const isNew = Boolean(event?._new);
  const [form, setForm] = useState<any>({});
  const [key, setKey] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);

  if (event !== key) {
    setKey(event);
    setSlots([]);
    setForm(
      event
        ? {
            title: event.title ?? "",
            notes: event.notes ?? "",
            starts_at: event.starts_at ? toLocalInput(event.starts_at) : "",
            duration: event.duration_minutes ?? 30,
            online: true,
            contact_id: "",
          }
        : {},
    );
  }

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-min"],
    enabled: isNew,
    queryFn: async () => (await supabase.from("contacts").select("id, name").order("name").limit(500)).data ?? [],
  });

  if (!event) return null;
  const upd = (k: string) => (e: any) => setForm({ ...form, [k]: e?.target?.value ?? e });

  async function save() {
    if (!form.starts_at) return toast.error("Escolha data e hora");
    const startIso = new Date(form.starts_at).toISOString();
    const duration = Number(form.duration) || 30;
    setSaving(true);
    try {
      let res: any;
      if (isNew && form.contact_id) {
        res = await scheduleFn({ data: { contactId: form.contact_id, startIso, duration, online: form.online !== false, title: form.title || undefined } });
      } else {
        if (!form.title) return toast.error("Informe um título");
        if (!isNew && event.contact_id && startIso !== new Date(event.starts_at).toISOString()) {
          // Reunião com contato: usa a remarcação existente (avisa o cliente).
          const r = await rescheduleFn({ data: { contactId: event.contact_id, startIso } });
          if (!r.ok) return toast.error(r.error ?? "Falha ao remarcar");
        }
        res = await saveFn({
          data: { id: isNew ? undefined : event.id, title: form.title, notes: form.notes || null, startIso, duration, online: isNew ? form.online !== false : undefined },
        });
      }
      if (!res.ok) return toast.error(res.error ?? "Falha ao salvar");
      toast.success(isNew ? "Evento criado no Google Agenda" : "Evento atualizado no Google Agenda");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isNew ? "Novo evento" : "Editar evento"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          {isNew && (
            <F label="Contato do CRM (opcional)">
              <Select value={form.contact_id || "none"} onValueChange={(v) => setForm({ ...form, contact_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— sem contato —</SelectItem>
                  {(contacts as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
          )}
          <F label="Título"><Input value={form.title ?? ""} onChange={upd("title")} /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Data e hora *"><Input type="datetime-local" value={form.starts_at ?? ""} onChange={upd("starts_at")} /></F>
            <F label="Duração (min)"><Input type="number" value={form.duration ?? 30} onChange={upd("duration")} /></F>
          </div>
          {isNew && (
            <>
              <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>Online (gera Google Meet)</span>
                <Button type="button" size="sm" variant={form.online !== false ? "default" : "outline"} onClick={() => setForm({ ...form, online: form.online === false })}>
                  {form.online !== false ? "Sim" : "Não"}
                </Button>
              </div>
              <div className="space-y-1.5">
                <Button type="button" size="sm" variant="outline" onClick={async () => {
                  const r = await slotsFn({ data: { duration: Number(form.duration) || 30 } });
                  if (r.ok) setSlots(r.slots); else toast.error(r.error);
                }}><Clock className="mr-2 h-3 w-3" /> Ver horários livres</Button>
                {slots.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {slots.map((s) => (
                      <button key={s} type="button" onClick={() => setForm({ ...form, starts_at: toLocalInput(s) })} className="rounded-full border px-2 py-0.5 text-xs hover:border-primary hover:text-primary">
                        {formatDateTime(s)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {!(isNew && form.contact_id) && <F label="Descrição"><Textarea rows={3} value={form.notes ?? ""} onChange={upd("notes")} /></F>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><span className="text-xs text-muted-foreground">{label}: </span><span>{value}</span></div>;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function F({ label, children }: any) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
