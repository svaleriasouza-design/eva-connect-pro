import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, Calendar as CalIcon } from "lucide-react";

type Row = { id: string; label: string; sub?: string; to: string; icon: any };

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<{ contacts: Row[]; companies: Row[]; events: Row[] }>({ contacts: [], companies: [], events: [] });
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    const t = setTimeout(async () => {
      if (term.length < 2) {
        setRows({ contacts: [], companies: [], events: [] });
        return;
      }
      const like = `%${term}%`;
      const [c, co, ev] = await Promise.all([
        supabase.from("contacts")
          .select("id, name, email, phone, whatsapp, instagram, city, company_name")
          .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like},whatsapp.ilike.${like},instagram.ilike.${like},city.ilike.${like},company_name.ilike.${like}`)
          .limit(8),
        supabase.from("companies")
          .select("id, name, email, phone, city, segment")
          .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like},city.ilike.${like},segment.ilike.${like}`)
          .limit(6),
        supabase.from("events")
          .select("id, title, starts_at, kind")
          .ilike("title", like)
          .limit(6),
      ]);
      setRows({
        contacts: (c.data ?? []).map((x): Row => ({ id: x.id, label: x.name, sub: x.company_name ?? x.email ?? x.phone ?? "", to: `/crm/${x.id}`, icon: Users })),
        companies: (co.data ?? []).map((x): Row => ({ id: x.id, label: x.name, sub: [x.segment, x.city].filter(Boolean).join(" · "), to: `/empresas`, icon: Building2 })),
        events: (ev.data ?? []).map((x): Row => ({ id: x.id, label: x.title, sub: new Date(x.starts_at).toLocaleString("pt-BR"), to: `/agenda`, icon: CalIcon })),
      });
    }, 220);
    return () => clearTimeout(t);
  }, [q, open]);

  function go(to: string) {
    onOpenChange(false);
    setQ("");
    navigate({ to });
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput value={q} onValueChange={setQ} placeholder="Buscar cliente, empresa, reunião, telefone, e-mail…" />
      <CommandList>
        <CommandEmpty>{q.length < 2 ? "Digite ao menos 2 caracteres." : "Nenhum resultado."}</CommandEmpty>
        {rows.contacts.length > 0 && (
          <CommandGroup heading="Clientes">
            {rows.contacts.map((r) => (
              <CommandItem key={r.id} value={`c-${r.id}-${r.label}`} onSelect={() => go(r.to)}>
                <r.icon className="mr-2 h-4 w-4" />
                <div className="flex flex-col"><span>{r.label}</span>{r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}</div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {rows.companies.length > 0 && (
          <CommandGroup heading="Empresas">
            {rows.companies.map((r) => (
              <CommandItem key={r.id} value={`co-${r.id}-${r.label}`} onSelect={() => go(r.to)}>
                <r.icon className="mr-2 h-4 w-4" />
                <div className="flex flex-col"><span>{r.label}</span>{r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}</div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {rows.events.length > 0 && (
          <CommandGroup heading="Agenda">
            {rows.events.map((r) => (
              <CommandItem key={r.id} value={`ev-${r.id}-${r.label}`} onSelect={() => go(r.to)}>
                <r.icon className="mr-2 h-4 w-4" />
                <div className="flex flex-col"><span>{r.label}</span>{r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}</div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}