import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, FUNNEL_STAGES, formatDate, formatDateTime } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Building2, Mail, Trash2, Loader as Loader2 } from "lucide-react";
import { WhatsAppQuickSend } from "@/components/whatsapp-quick-send";
import { useServerFn } from "@tanstack/react-start";
import { deleteCompaniesFn } from "@/lib/imports.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresas")({ component: Empresas });

const PAGE_SIZE = 100;

function stageLabel(k?: string | null) {
  return FUNNEL_STAGES.find((s) => s.key === k)?.label ?? k ?? "—";
}

function Empresas() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const deleteCompanies = useServerFn(deleteCompaniesFn);

  const { data: total = 0 } = useQuery({
    queryKey: ["companies-count", q],
    queryFn: async () => {
      let query: any = supabase.from("companies").select("id", { count: "exact", head: true }).is("deleted_at", null);
      if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
      const { count } = await query;
      return count ?? 0;
    },
  });

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies-page", q, page],
    queryFn: async () => {
      let query: any = supabase
        .from("companies")
        .select("id, name, responsible, whatsapp, phone, email, city, segment, employees, funnel_stage, status, last_contact_at, next_action, next_action_at, contacts_count")
        .is("deleted_at", null)
        .order("last_contact_at", { ascending: false, nullsFirst: false })
        .order("name", { ascending: true })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: (prev) => prev,
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allOnPageSelected = companies.length > 0 && companies.every((c: any) => selected.includes(c.id));

  function toggleOne(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleAllOnPage() {
    const ids = companies.map((c: any) => c.id as string);
    setSelected((s) => (allOnPageSelected ? s.filter((x) => !ids.includes(x)) : Array.from(new Set([...s, ...ids]))));
  }

  async function removeSelected() {
    setDeleting(true);
    try {
      const res: any = await deleteCompanies({ data: { ids: selected } });
      setSelected([]);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["companies"] }),
        qc.invalidateQueries({ queryKey: ["companies-page"] }),
        qc.invalidateQueries({ queryKey: ["companies-count"] }),
        qc.invalidateQueries({ queryKey: ["company-detail"] }),
        qc.invalidateQueries({ queryKey: ["company-contacts"] }),
        qc.invalidateQueries({ queryKey: ["contacts"] }),
        qc.invalidateQueries({ queryKey: ["contacts-page"] }),
        qc.invalidateQueries({ queryKey: ["contacts-count"] }),
        qc.invalidateQueries({ queryKey: ["contacts-min"] }),
        qc.invalidateQueries({ queryKey: ["funil-por-etapa"] }),
        qc.invalidateQueries({ queryKey: ["funnel"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-central"] }),
        qc.invalidateQueries({ queryKey: ["activities"] }),
        qc.invalidateQueries({ queryKey: ["all-activities"] }),
        qc.invalidateQueries({ queryKey: ["events"] }),
        qc.invalidateQueries({ queryKey: ["hist-contacts"] }),
      ]);
      toast.success(`${(res?.removed ?? 0).toLocaleString("pt-BR")} empresa(s) excluída(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir as empresas.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" /> Empresas</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString("pt-BR")} empresas · atualizadas automaticamente pelo CRM</p>
        </div>
        <NewCompanyDialog open={openNew} onOpenChange={setOpenNew} onSaved={() => qc.invalidateQueries({ queryKey: ["companies-page"] })} />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => { setPage(0); setQ(e.target.value); }} placeholder="Buscar por nome…" className="pl-9" />
      </div>

      {selected.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="text-sm">
            <strong>{selected.length.toLocaleString("pt-BR")}</strong> empresa(s) selecionada(s)
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Limpar seleção</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting} className="gap-2">
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Excluir selecionadas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir {selected.length} empresa(s)?</AlertDialogTitle>
                  <AlertDialogDescription>
                    As empresas selecionadas serão excluídas permanentemente. Os contatos vinculados a elas
                    permanecerão no CRM, mas serão desvinculados (sem empresa). Atividades relacionadas serão
                    removidas. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={removeSelected}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 w-8">
                  <Checkbox checked={allOnPageSelected} onCheckedChange={toggleAllOnPage} aria-label="Selecionar todas" />
                </th>
                <th className="p-3">Empresa</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">WhatsApp</th>
                <th className="p-3">E-mail</th>
                <th className="p-3">Cidade</th>
                <th className="p-3">Segmento</th>
                <th className="p-3 text-center">Colab.</th>
                <th className="p-3">Status</th>
                <th className="p-3">Último contato</th>
                <th className="p-3">Próxima ação</th>
              </tr>
          </thead>
            <tbody>
              {isLoading && companies.length === 0 &&
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    {Array.from({ length: 11 }).map((__, j) => (
                      <td key={j} className="p-3"><Skeleton className="h-4 w-24" /></td>
                    ))}
                  </tr>
                ))}
              {companies.map((c: any) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Checkbox
                      checked={selected.includes(c.id)}
                      onCheckedChange={() => toggleOne(c.id)}
                      aria-label={`Selecionar ${c.name}`}
                    />
                  </td>
                  <td className="p-3 cursor-pointer" onClick={() => setOpenId(c.id)}>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.contacts_count ?? 0} contato(s)</div>
                  </td>
                  <td className="p-3 text-muted-foreground cursor-pointer" onClick={() => setOpenId(c.id)}>{c.responsible ?? "—"}</td>
                  <td className="p-3 text-muted-foreground cursor-pointer" onClick={() => setOpenId(c.id)}>{c.whatsapp ?? "—"}</td>
                  <td className="p-3 text-muted-foreground cursor-pointer" onClick={() => setOpenId(c.id)}>
                    {c.email ? <a onClick={(e) => e.stopPropagation()} href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail className="h-3 w-3" /> {c.email}</a> : "—"}
                  </td>
                  <td className="p-3 text-muted-foreground cursor-pointer" onClick={() => setOpenId(c.id)}>{c.city ?? "—"}</td>
                  <td className="p-3 text-muted-foreground cursor-pointer" onClick={() => setOpenId(c.id)}>{c.segment ?? "—"}</td>
                  <td className="p-3 text-center text-muted-foreground cursor-pointer" onClick={() => setOpenId(c.id)}>{c.employees ?? "—"}</td>
                  <td className="p-3 cursor-pointer" onClick={() => setOpenId(c.id)}><Badge variant="secondary">{stageLabel(c.funnel_stage)}</Badge></td>
                  <td className="p-3 text-xs text-muted-foreground cursor-pointer" onClick={() => setOpenId(c.id)}>{formatDateTime(c.last_contact_at)}</td>
                  <td className="p-3 text-xs text-muted-foreground cursor-pointer" onClick={() => setOpenId(c.id)}>{c.next_action ?? "—"}</td>
                </tr>
              ))}
              {!isLoading && companies.length === 0 && (
                <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Nenhuma empresa encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">Página {page + 1} de {pages}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      <CompanyDetailDialog id={openId} onOpenChange={(v) => !v && setOpenId(null)} />
    </div>
  );
}

function CompanyDetailDialog({ id, onOpenChange }: { id: string | null; onOpenChange: (v: boolean) => void }) {
  const { data: company } = useQuery({
    queryKey: ["company-detail", id],
    queryFn: async () => (await supabase.from("companies").select("*").eq("id", id!).maybeSingle()).data,
    enabled: !!id,
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["company-contacts", id],
    queryFn: async () => (await supabase.from("contacts").select("id, name, whatsapp, email, funnel_stage, last_contact_at, next_action").eq("company_id", id!).is("deleted_at", null).order("created_at")).data ?? [],
    enabled: !!id,
  });

  return (
    <Dialog open={!!id} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{company?.name ?? "…"}</DialogTitle></DialogHeader>
        {!company ? (
          <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <Info label="Responsável" value={company.responsible} />
              <Info label="Status / Etapa" value={stageLabel(company.funnel_stage)} />
              <Info label="WhatsApp" value={company.whatsapp ?? company.phone} />
              <Info label="E-mail" value={company.email} />
              <Info label="Cidade" value={company.city} />
              <Info label="Segmento" value={company.segment} />
              <Info label="Colaboradores" value={company.employees} />
              <Info label="Último contato" value={formatDateTime(company.last_contact_at)} />
              <Info label="Próxima ação" value={company.next_action} />
              <Info label="Próx. reunião" value={formatDate(company.next_meeting)} />
              <Info label="Renovação" value={formatDate(company.renewal)} />
              <Info label="Contatos vinculados" value={company.contacts_count} />
            </div>
            {company.diagnosis && <Info label="Diagnóstico" value={company.diagnosis} block />}
            {company.notes && <Info label="Observações" value={company.notes} block />}

            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Contatos vinculados ({contacts.length})</div>
              <div className="rounded-md border divide-y">
                {contacts.length === 0 && <div className="p-3 text-xs text-muted-foreground">Nenhum contato vinculado.</div>}
                {contacts.map((c: any) => (
                  <Link key={c.id} to="/crm/$id" params={{ id: c.id }} className="flex items-center justify-between p-3 text-sm hover:bg-muted/30">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.whatsapp ?? "—"} · {c.email ?? "—"}</div>
                    </div>
                    <Badge variant="secondary">{stageLabel(c.funnel_stage)}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value, block }: { label: string; value: any; block?: boolean }) {
  return (
    <div className={block ? "" : ""}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={block ? "text-sm whitespace-pre-wrap" : "text-sm"}>{value == null || value === "" ? "—" : String(value)}</div>
    </div>
  );
}

function NewCompanyDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({});
  const upd = (k: string) => (e: any) => setForm({ ...form, [k]: e?.target?.value ?? e });
  async function save() {
    if (!form.name) return toast.error("Nome é obrigatório");
    const { error } = await supabase.from("companies").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Empresa criada");
    onOpenChange(false); setForm({}); onSaved();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova Empresa</Button></DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova empresa</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Fld label="Nome *"><Input value={form.name ?? ""} onChange={upd("name")} /></Fld>
          <Fld label="Responsável"><Input value={form.responsible ?? ""} onChange={upd("responsible")} /></Fld>
          <Fld label="WhatsApp"><Input value={form.whatsapp ?? ""} onChange={upd("whatsapp")} /></Fld>
          <Fld label="E-mail"><Input value={form.email ?? ""} onChange={upd("email")} /></Fld>
          <Fld label="Segmento"><Input value={form.segment ?? ""} onChange={upd("segment")} /></Fld>
          <Fld label="Cidade"><Input value={form.city ?? ""} onChange={upd("city")} /></Fld>
          <Fld label="Nº colaboradores"><Input type="number" value={form.employees ?? ""} onChange={upd("employees")} /></Fld>
          <Fld label="Renovação"><Input type="date" value={form.renewal ?? ""} onChange={upd("renewal")} /></Fld>
          <Fld label="Diagnóstico" className="md:col-span-2"><Textarea rows={2} value={form.diagnosis ?? ""} onChange={upd("diagnosis")} /></Fld>
          <Fld label="Observações" className="md:col-span-2"><Textarea rows={2} value={form.notes ?? ""} onChange={upd("notes")} /></Fld>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fld({ label, children, className = "" }: any) {
  return <div className={`space-y-1.5 ${className}`}><Label className="text-xs">{label}</Label>{children}</div>;
}
