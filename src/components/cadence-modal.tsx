import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchDueCadence, type DueContact } from "@/lib/cadence";
import { sendWhatsappMessageFn } from "@/lib/whatsapp.functions";
import { Loader2, MessageCircle, CheckCircle2, AlertCircle, Clock } from "lucide-react";
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
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const sendFn = useServerFn(sendWhatsappMessageFn);

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
    let okCount = 0;
    let failCount = 0;
    for (const c of targets) {
      const to = c.whatsapp ?? c.phone;
      if (!to) {
        toast.warning(`${c.name} não possui WhatsApp cadastrado.`);
        failCount++;
        continue;
      }
      try {
        const res = await sendFn({
          data: {
            contactId: c.id,
            to,
            body: c.message,
            cadenceDay: c.nextDay,
          },
        });
        if (res.ok) {
          setSentIds((s) => new Set(s).add(c.id));
          okCount++;
        } else {
          setFailedIds((s) => new Set(s).add(c.id));
          failCount++;
          toast.error(`${c.name}: ${res.error}`);
        }
      } catch (err) {
        setFailedIds((s) => new Set(s).add(c.id));
        failCount++;
        toast.error(`${c.name}: ${err instanceof Error ? err.message : "erro"}`);
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    setSending(false);
    if (okCount) toast.success(`${okCount} enviado(s) via Meta Cloud API.`);
    if (failCount && !okCount) toast.error(`Falha em ${failCount} envio(s).`);
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
              const isFailed = failedIds.has(c.id);
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
                    ) : isFailed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" /> Falhou</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Pendente</span>
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
            Enviar via Meta Cloud API
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}