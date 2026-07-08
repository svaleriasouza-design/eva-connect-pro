import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/configuracoes")({ component: Configs });

function Configs() {
  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div><h1 className="text-2xl font-semibold">Configurações</h1><p className="text-sm text-muted-foreground">Perfis de acesso e preferências.</p></div>
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