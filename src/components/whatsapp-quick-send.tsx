import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { sendWhatsappMessageFn } from "@/lib/whatsapp.functions";

type Props = {
  contactId: string;
  to: string | null | undefined;
  contactName?: string;
  defaultBody?: string;
  size?: "sm" | "default";
  variant?: "ghost" | "outline" | "default";
  label?: string;
};

export function WhatsAppQuickSend({ contactId, to, contactName, defaultBody, size = "sm", variant = "outline", label }: Props) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(defaultBody ?? "");
  const [sending, setSending] = useState(false);
  const send = useServerFn(sendWhatsappMessageFn);
  const qc = useQueryClient();

  const cleaned = (to ?? "").replace(/\D/g, "");

  async function submit() {
    if (!cleaned) {
      toast.error("Contato sem WhatsApp cadastrado.");
      return;
    }
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await send({ data: { contactId, to: cleaned, body: body.trim() } });
      if (res.ok) {
        toast.success("Enviado via Meta Cloud API.");
        setOpen(false);
        qc.invalidateQueries();
      } else {
        toast.error(res.error ?? "Falha no envio");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no envio");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        size={size}
        variant={variant}
        disabled={!cleaned}
        onClick={(e) => {
          e.stopPropagation();
          setBody(defaultBody ?? "");
          setOpen(true);
        }}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {label && <span className="ml-1">{label}</span>}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Enviar WhatsApp</DialogTitle>
            <DialogDescription>
              Envio pelo servidor (Meta Cloud API){contactName ? ` — ${contactName}` : ""}.
              {cleaned && <span className="ml-1 text-xs">Nº: {cleaned}</span>}
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Digite a mensagem…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>Cancelar</Button>
            <Button onClick={submit} disabled={sending || !body.trim()}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}