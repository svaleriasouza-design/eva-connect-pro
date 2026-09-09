import { createFileRoute } from "@tanstack/react-router";
import { Headphones } from "lucide-react";
import { WhatsappConversations } from "@/components/whatsapp-conversations";

export const Route = createFileRoute("/_authenticated/atendimento")({
  component: Atendimento,
  head: () => ({
    meta: [
      { title: "Atendimento · EVA IA" },
      { name: "description", content: "Converse com seus leads no WhatsApp: texto, áudio gravado ou anexado, com histórico completo." },
      { property: "og:title", content: "Atendimento · EVA IA" },
      { property: "og:description", content: "Central de atendimento da EVA: conversas de WhatsApp com envio de texto e áudio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Atendimento() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Headphones className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">Atendimento · Conversas</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Texto, áudio gravado (🎤) ou arquivo (📎). O envio manual pausa a EVA neste contato.
            </p>
          </div>
        </div>
      </header>
      <WhatsappConversations />
    </div>
  );
}
