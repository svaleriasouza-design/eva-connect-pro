import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase, formatDateTime } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter } from "lucide-react";

export const Route = createFileRoute("/_authenticated/historico")({ component: Historico });

const KIND_LABEL: Record<string, string> = {
  whatsapp_out: "WhatsApp enviado",
  whatsapp_in: "WhatsApp recebido",
  cadence_stop: "Saiu da cadência",
  nota: "Nota",
  reuniao: "Reunião",
  ligacao: "Ligação",
  email: "E-mail",
  proposta: "Proposta",
};

function Historico() {
  const [contactId, setContactId] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");
  const [q, setQ] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["hist-contacts"],
    queryFn: async () => (await supabase.from("contacts").select("id, name").order("name")).data ?? [],
  });

  const { data: acts = [] } = useQuery({
    queryKey: ["all-activities", contactId, kind],
    queryFn: async () => {
      let query = supabase
        .from("activities")
        .select("*, contact:contacts(id, name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (contactId !== "all") query = query.eq("contact_id", contactId);
      if (kind !== "all") query = query.eq("kind", kind);
      const { data } = await query;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return acts;
    return acts.filter((a: any) =>
      (a.title ?? "").toLowerCase().includes(s) ||
      (a.content ?? "").toLowerCase().includes(s) ||
      (a.contact?.name ?? "").toLowerCase().includes(s),
    );
  }, [acts, q]);

  const kinds = Array.from(new Set(acts.map((a: any) => a.kind).filter(Boolean))) as string[];

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div><h1 className="text-2xl font-semibold">Histórico</h1><p className="text-sm text-muted-foreground">Todas as interações em ordem cronológica.</p></div>

      <div className="grid gap-2 md:grid-cols-[1fr_240px_200px]">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, conteúdo ou cliente…" className="pl-8" />
        </div>
        <Select value={contactId} onValueChange={setContactId}>
          <SelectTrigger><Filter className="mr-2 h-3.5 w-3.5" /><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {contacts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {kinds.map((k) => <SelectItem key={k} value={k}>{KIND_LABEL[k] ?? k}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} registro(s)</div>

      <div className="space-y-2">
        {filtered.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhum registro para os filtros escolhidos.</Card>}
        {filtered.map((a: any) => (
          <Card key={a.id} className="p-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{KIND_LABEL[a.kind] ?? a.kind}</Badge>
                {a.status && <span className="text-[10px] uppercase">{a.status}</span>}
              </span>
              <span>{formatDateTime(a.created_at)}</span>
            </div>
            <div className="font-medium mt-1">{a.title}</div>
            {a.content && <div className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</div>}
            {a.contact && <Link to="/crm/$id" params={{ id: a.contact.id }} className="mt-1 inline-block text-xs text-primary hover:underline">— {a.contact.name}</Link>}
          </Card>
        ))}
      </div>
    </div>
  );
}