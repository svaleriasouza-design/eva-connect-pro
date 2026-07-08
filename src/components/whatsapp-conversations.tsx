import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { supabase, formatDateTime, FUNNEL_STAGES } from "@/lib/db";
import { sendWhatsappMessageFn } from "@/lib/whatsapp.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send, Loader2, MessageCircle, Calendar, User as UserIcon, ArrowRight, CircleDot, Check, CheckCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

type ActivityRow = {
  id: string;
  contact_id: string | null;
  kind: string;
  title: string;
  content: string | null;
  external_id: string | null;
  status: string | null;
  status_updated_at: string | null;
  created_at: string;
};

type ContactRow = {
  id: string;
  name: string;
  company_name: string | null;
  whatsapp: string | null;
  phone: string | null;
  funnel_stage: string;
  cadence_day: number | null;
  cadence_active: boolean | null;
  do_not_contact: boolean | null;
  main_pain: string | null;
  goal: string | null;
  next_action: string | null;
  last_contact_at: string | null;
};

function StatusIcon({ status }: { status: string | null }) {
  const s = (status ?? "").toUpperCase();
  if (s === "READ") return <CheckCheck className="h-3 w-3 text-primary" />;
  if (s === "DELIVERED") return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
  if (s === "SENT") return <Check className="h-3 w-3 text-muted-foreground" />;
  if (s === "FAILED") return <XCircle className="h-3 w-3 text-destructive" />;
  return null;
}

export function WhatsappConversations() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const sendFn = useServerFn(sendWhatsappMessageFn);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const { data: contacts = [] } = useQuery<ContactRow[]>({
    queryKey: ["wa-contacts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, name, company_name, whatsapp, phone, funnel_stage, cadence_day, cadence_active, do_not_contact, main_pain, goal, next_action, last_contact_at")
        .order("last_contact_at", { ascending: false, nullsFirst: false })
        .limit(300);
      return (data as ContactRow[] | null) ?? [];
    },
    refetchInterval: 15000,
  });

  const { data: recentActs = [] } = useQuery<ActivityRow[]>({
    queryKey: ["wa-recent-acts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, contact_id, kind, title, content, external_id, status, status_updated_at, created_at")
        .in("kind", ["whatsapp_out", "whatsapp_in"])
        .order("created_at", { ascending: false })
        .limit(500);
      return (data as ActivityRow[] | null) ?? [];
    },
    refetchInterval: 10000,
  });

  // Metadata por contato: última msg e se última é entrada não respondida
  const meta = useMemo(() => {
    const m = new Map<string, { last?: ActivityRow; unread: boolean }>();
    for (const a of recentActs) {
      if (!a.contact_id) continue;
      const cur = m.get(a.contact_id);
      if (!cur) m.set(a.contact_id, { last: a, unread: a.kind === "whatsapp_in" });
      // como está em desc, o primeiro visto é o mais recente
    }
    return m;
  }, [recentActs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = contacts;
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company_name ?? "").toLowerCase().includes(q) ||
          (c.whatsapp ?? "").includes(q) ||
          (c.phone ?? "").includes(q),
      );
    }
    // Ordena: com msg recente primeiro, depois por last_contact_at
    return [...list].sort((a, b) => {
      const la = meta.get(a.id)?.last?.created_at ?? a.last_contact_at ?? "";
      const lb = meta.get(b.id)?.last?.created_at ?? b.last_contact_at ?? "";
      return lb.localeCompare(la);
    });
  }, [contacts, search, meta]);

  useEffect(() => {
    if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  const { data: thread = [] } = useQuery<ActivityRow[]>({
    queryKey: ["wa-thread", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, contact_id, kind, title, content, external_id, status, status_updated_at, created_at")
        .eq("contact_id", selectedId)
        .in("kind", ["whatsapp_out", "whatsapp_in", "cadence_stop", "nota"])
        .order("created_at", { ascending: true })
        .limit(200);
      return (data as ActivityRow[] | null) ?? [];
    },
    refetchInterval: 8000,
  });

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length, selectedId]);

  async function send() {
    if (!selected || !draft.trim()) return;
    const to = selected.whatsapp ?? selected.phone;
    if (!to) {
      toast.error("Contato sem WhatsApp/telefone.");
      return;
    }
    setSending(true);
    try {
      const res = await sendFn({
        data: { contactId: selected.id, to, body: draft.trim() },
      });
      if (res.ok) {
        toast.success("Mensagem enviada");
        setDraft("");
        qc.invalidateQueries({ queryKey: ["wa-thread", selected.id] });
        qc.invalidateQueries({ queryKey: ["wa-recent-acts"] });
      } else {
        toast.error(res.error ?? "Falha no envio");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-0 rounded-lg border overflow-hidden h-[calc(100vh-14rem)] min-h-[500px] md:grid-cols-[280px_1fr_320px]">
      {/* Coluna 1: Conversas */}
      <div className="flex min-w-0 flex-col border-r bg-card">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contato…" className="pl-8" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhum contato.</div>
          )}
          {filtered.map((c) => {
            const m = meta.get(c.id);
            const last = m?.last;
            const preview = last?.content ?? last?.title ?? "Sem mensagens";
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${active ? "bg-muted" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {c.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      {last && <span className="shrink-0 text-[10px] text-muted-foreground">{formatShort(last.created_at)}</span>}
                    </div>
                    <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      {last?.kind === "whatsapp_out" && <StatusIcon status={last?.status ?? null} />}
                      <span className="truncate">{preview}</span>
                    </div>
                  </div>
                  {m?.unread && <CircleDot className="h-3 w-3 shrink-0 text-primary" />}
                </div>
              </button>
            );
          })}
        </ScrollArea>
      </div>

      {/* Coluna 2: Thread */}
      <div className="flex min-w-0 flex-col bg-background">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Selecione uma conversa
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b px-4 py-2.5">
              <MessageCircle className="h-4 w-4 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{selected.name}</div>
                <div className="truncate text-xs text-muted-foreground">{selected.whatsapp ?? selected.phone ?? "—"}</div>
              </div>
              <Link to="/crm/$id" params={{ id: selected.id }}>
                <Button variant="ghost" size="sm">Abrir ficha <ArrowRight className="ml-1 h-3 w-3" /></Button>
              </Link>
            </div>

            <div ref={threadRef} className="flex-1 overflow-y-auto space-y-2 bg-muted/30 p-4">
              {thread.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">Sem histórico ainda. Envie a primeira mensagem.</div>
              )}
              {thread.map((a) => {
                if (a.kind === "cadence_stop" || a.kind === "nota") {
                  return (
                    <div key={a.id} className="mx-auto max-w-md rounded-md bg-background/60 px-3 py-1 text-center text-[11px] text-muted-foreground">
                      {a.title} · {formatDateTime(a.created_at)}
                    </div>
                  );
                }
                const outgoing = a.kind === "whatsapp_out";
                return (
                  <div key={a.id} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${outgoing ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                      <div className="whitespace-pre-wrap break-words">{a.content ?? a.title}</div>
                      <div className={`mt-1 flex items-center gap-1 text-[10px] ${outgoing ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"}`}>
                        <span>{formatShort(a.created_at)}</span>
                        {outgoing && <StatusIcon status={a.status} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t bg-card p-3">
              <div className="flex items-end gap-2">
                <Textarea
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escreva sua mensagem…"
                  className="resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
                  }}
                />
                <Button onClick={send} disabled={sending || !draft.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">Envio real via Meta Cloud API · ⌘/Ctrl + Enter</div>
            </div>
          </>
        )}
      </div>

      {/* Coluna 3: Ficha rápida */}
      <div className="hidden min-w-0 flex-col border-l bg-card md:flex">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-muted-foreground">Selecione um contato para ver a ficha.</div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {selected.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{selected.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{selected.company_name ?? "Sem empresa"}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-[10px]">{FUNNEL_STAGES.find(s => s.key === selected.funnel_stage)?.label ?? selected.funnel_stage}</Badge>
                {selected.cadence_active ? (
                  <Badge className="text-[10px]">Cadência Dia {selected.cadence_day ?? 0}/5</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Fora da cadência</Badge>
                )}
                {selected.do_not_contact && <Badge variant="destructive" className="text-[10px]">Não contatar</Badge>}
              </div>

              <InfoBlock label="Objetivo" value={selected.goal} />
              <InfoBlock label="Dor principal" value={selected.main_pain} />
              <InfoBlock label="Próxima ação" value={selected.next_action} />
              <InfoBlock label="Último contato" value={selected.last_contact_at ? formatDateTime(selected.last_contact_at) : "—"} />

              <div className="space-y-2 pt-2">
                <Link to="/crm/$id" params={{ id: selected.id }} className="block">
                  <Button variant="outline" className="w-full justify-start"><UserIcon className="mr-2 h-4 w-4" /> Abrir ficha completa</Button>
                </Link>
                <Link to="/agenda" className="block">
                  <Button variant="outline" className="w-full justify-start"><Calendar className="mr-2 h-4 w-4" /> Agendar reunião</Button>
                </Link>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value?.trim() ? value : <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function formatShort(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return same
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}