import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { testMetaConfigFn } from "@/lib/whatsapp.functions";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({ component: Configs });

function Configs() {
  const testFn = useServerFn(testMetaConfigFn);
  const { data: meta, isLoading } = useQuery({
    queryKey: ["meta-config"],
    queryFn: () => testFn(),
  });
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const webhookUrl = `${origin}/api/public/meta/webhook`;

  function copy(v: string) {
    navigator.clipboard.writeText(v);
    toast.success("Copiado");
  }

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div><h1 className="text-2xl font-semibold">Configurações</h1><p className="text-sm text-muted-foreground">Perfis de acesso e preferências.</p></div>

      <Card>
        <CardHeader><CardTitle>WhatsApp — Meta Cloud API</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-md border p-3 space-y-2">
            <div className="font-medium">Status da integração</div>
            {isLoading ? (
              <div className="text-muted-foreground">Verificando…</div>
            ) : (
              <ul className="space-y-1">
                <StatusLine ok={!!meta?.configured} label="Credenciais de envio (Phone Number ID + Access Token)" />
                <StatusLine ok={!!meta?.hasVerifyToken} label="Verify Token do webhook" />
                <StatusLine ok={!!meta?.hasAppSecret} label="App Secret (validação de assinatura)" />
                <li className="text-xs text-muted-foreground pl-6">Graph API: {meta?.graphVersion}</li>
              </ul>
            )}
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <div className="font-medium">URL do Webhook (colar no painel Meta)</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all">{webhookUrl}</code>
              <Button size="sm" variant="outline" onClick={() => copy(webhookUrl)}><Copy className="h-3 w-3" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No painel da Meta &rarr; Configuração do WhatsApp &rarr; Webhook, use esta URL e o mesmo valor de <code>META_WA_VERIFY_TOKEN</code>. Assine os campos <code>messages</code>.
            </p>
          </div>

          <div className="rounded-md border p-3 space-y-1 text-xs text-muted-foreground">
            <div className="font-medium text-foreground text-sm">Variáveis a configurar no backend</div>
            <p>• <code>META_WA_PHONE_NUMBER_ID</code> — ID do número no WhatsApp Business.</p>
            <p>• <code>META_WA_ACCESS_TOKEN</code> — Access Token permanente (System User).</p>
            <p>• <code>META_WA_VERIFY_TOKEN</code> — string que você define, cola no painel Meta.</p>
            <p>• <code>META_WA_APP_SECRET</code> — App Secret (valida assinatura do webhook).</p>
            <p>• <code>META_WA_GRAPH_VERSION</code> (opcional) — default <code>v21.0</code>.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Perfis de acesso (v2)</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <b>Administrador</b> — acesso total.</p>
          <p>• <b>Secretária</b> — CRM, Agenda, WhatsApp, Histórico.</p>
          <p>• <b>Terapeuta</b> — apenas seus clientes, Agenda e Histórico.</p>
          <p className="pt-2">Nesta primeira versão o sistema opera sem login (usuária única: Valéria). A camada de perfis chega na v2.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Sobre a EVA</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>EVA responde em português, aprende com o contexto do CRM e sugere a Próxima Melhor Ação em cada ficha de cliente.</p>
          <p>Powered by Lovable AI · Gemini 2.5 Flash.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}