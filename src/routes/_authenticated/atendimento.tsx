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
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Headphones className="h-5 w-5 text-primary" /> Atendimento
        </h1>
        <p className="text-sm text-muted-foreground">
          Converse com o lead em tempo real: texto, áudio gravado (🎤) ou arquivo de áudio (📎). O envio manual pausa a EVA neste contato.
        </p>
      </div>
      <WhatsappConversations />
    </div>
  );
}
