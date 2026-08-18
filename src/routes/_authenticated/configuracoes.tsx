import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerFn } from "@tanstack/react-start";
import { sendTestMessageFn } from "@/lib/settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { normalizePhoneNumber } from "@/lib/phone";
import { GoogleCalendarCard } from "@/components/google-calendar-card";
import { WorkspaceCard } from "@/components/workspace-card";
import { WhatsappNumbersCard } from "@/components/whatsapp-numbers-card";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Configs,
  head: () => ({
    meta: [
      { title: "Configurações · EVA IA" },
      {
        name: "description",
        content: "Configure os números de WhatsApp da EVA, a agenda do Google e a identidade do seu workspace.",
      },
      { property: "og:title", content: "Configurações · EVA IA" },
      { property: "og:description", content: "Números de WhatsApp, agenda e identidade da sua operação na EVA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Configs() {
  const sendTestFn = useServerFn(sendTestMessageFn);
  const [testTo, setTestTo] = useState("");
  const [testBody, setTestBody] = useState("Mensagem de teste da EVA · Meta Cloud API ✅");
  const [sendingTest, setSendingTest] = useState(false);
  const [lastTest, setLastTest] = useState<null | { ok: boolean; info: string }>(null);

  const testToNormalized = useMemo(() => normalizePhoneNumber(testTo), [testTo]);

  async function onSendTest() {
    setSendingTest(true);
    try {
      const res: any = await sendTestFn({ data: { to: testTo, body: testBody } });
      if (res?.ok) {
        setLastTest({ ok: true, info: `Enviado para ${res?.to ?? "—"} · ID ${res?.messageId ?? "—"}` });
        toast.success("Mensagem de teste enviada");
      } else {
        const info = res?.error || "Falha no envio";
        setLastTest({ ok: false, info });
        toast.error(info);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastTest({ ok: false, info: `Erro de rede/servidor: ${msg}` });
      toast.error(`Erro de rede/servidor: ${msg}`);
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Credenciais e integrações.</p>
      </div>

      <WorkspaceCard />

      <GoogleCalendarCard />

      <WhatsappNumbersCard />

      <Card>
        <CardHeader><CardTitle>Diagnóstico · Enviar mensagem de teste</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">
            Envia uma mensagem real pelo número principal para validar credenciais, DDI 55 automático e roteamento.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="test-to">Número (com DDD)</Label>
              <Input id="test-to" placeholder="11 99999-9999" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
              <div className="text-[11px] text-muted-foreground">
                Enviaremos para: <code>{testToNormalized || "—"}</code>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="test-body">Mensagem</Label>
              <Input id="test-body" value={testBody} onChange={(e) => setTestBody(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onSendTest} disabled={sendingTest || !testToNormalized || !testBody.trim()}>
              {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar mensagem de teste
            </Button>
            {lastTest && (
              <span className={`text-xs ${lastTest.ok ? "text-green-600" : "text-destructive"}`}>
                {lastTest.ok ? "✅ " : "⚠ "}{lastTest.info}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sobre a EVA</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>EVA responde em português, aprende com o contexto do CRM e sugere a Próxima Melhor Ação em cada ficha de cliente.</p>
          <p>Powered by Lovable AI.</p>
        </CardContent>
      </Card>
    </div>
  );
}
