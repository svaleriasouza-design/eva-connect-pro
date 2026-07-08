import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchDueCadence, markCadenceSent, waUrl, type DueContact } from "@/lib/cadence";
import { Loader2, MessageCircle, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function CadenceModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { data: due = [], isLoading, refetch } = useQuery({
    queryKey: ["cadence-due"],
    queryFn: fetchDueCadence,
    enabled: open,
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const list = due as DueContact[];
  const activeIds = list.map((c) => c.id).filter((id) => !sentIds.has(id));
  const allSelected = activeIds.length > 0 && activeIds.every((id) => selected[id] ?? true);

  function toggleAll() {
    const next: Record<string, boolean> = {};
    activeIds.forEach((id) => (next[id] = !allSelected));
    setSelected(next);
  }

  async function startSending() {
    const targets = list.filter((c) => (selected[c.id] ?? true) && !sentIds.has(c.id));
    if (targets.length === 0) {
      toast.info("Selecione ao menos um contato.");
      return;
    }
    setSending(true);
    for (const c of targets) {
      if (!c.whatsapp && !c.phone) {
        toast.warning(`${c.name} não possui WhatsApp cadastrado.`);
        continue;
      }
      window.open(waUrl(c.whatsapp ?? c.phone, c.message), "_blank", "noopener");
      await markCadenceSent(c);
      setSentIds((s) => new Set(s).add(c.id));
      await new Promise((r) => setTimeout(r, 800));
    }
    setSending(false);
    toast.success(`${targets.length} envio(s) processado(s).`);
    qc.invalidateQueries();
    refetch();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Iniciar Cadência
          </DialogTitle>
          <DialogDescription>
            {isLoading
              ? "Analisando contatos…"
              : list.length === 0
                ? "Nenhum contato pendente para hoje. 🎉"
                : `Hoje existem ${list.length} contato(s) para receber mensagens. Deseja iniciar os envios?`}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!isLoading && list.length > 0 && (
          <div className="max-h-[50vh] overflow-y-auto rounded-md border">
            <div className="sticky top-0 flex items-center gap-3 border-b bg-muted/50 px-3 py-2 text-xs font-medium">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              <span className="flex-1">Contato</span>
              <span className="w-16">Dia</span>
              <span className="w-20 text-right">Status</span>
            </div>
            {list.map((c) => {
              const isSent = sentIds.has(c.id);
              return (
                <div key={c.id} className={`flex items-center gap-3 border-b px-3 py-2 text-sm ${isSent ? "opacity-60" : ""}`}>
                  <Checkbox
                    checked={!isSent && (selected[c.id] ?? true)}
                    disabled={isSent}
                    onCheckedChange={(v) => setSelected((s) => ({ ...s, [c.id]: !!v }))}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-md">{c.message}</div>
                  </div>
                  <div className="w-16 text-xs">Dia {c.nextDay}</div>
                  <div className="w-20 text-right">
                    {isSent ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" /> Enviado</span>
                    ) : (
                      <a href={waUrl(c.whatsapp ?? c.phone, c.message)} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        Abrir <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={startSending} disabled={sending || list.length === 0}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Iniciar envios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}