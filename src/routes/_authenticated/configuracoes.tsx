import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMetaSettingsFn,
  saveMetaSettingsFn,
  testMetaConnectionFn,
  sendTestMessageFn,
} from "@/lib/settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle2, XCircle, Eye, EyeOff, Shuffle, Save, PlugZap, Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { normalizePhoneNumber } from "@/lib/phone";

export const Route = createFileRoute("/_authenticated/configuracoes")({ component: Configs });

type FormState = {
  phone_number_id: string;
  access_token: string;
  app_secret: string;
  verify_token: string;
  graph_version: string;
};

const EMPTY: FormState = {
  phone_number_id: "",
  access_token: "",
  app_secret: "",
  verify_token: "",
  graph_version: "v21.0",
};

function randomToken(len = 32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function Configs() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMetaSettingsFn);
  const saveFn = useServerFn(saveMetaSettingsFn);
  const testFn = useServerFn(testMetaConnectionFn);
  const sendTestFn = useServerFn(sendTestMessageFn);

  const { data, isLoading } = useQuery({
    queryKey: ["meta-settings"],
    queryFn: () => getFn(),
  });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [show, setShow] = useState({ access: false, secret: false });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testBody, setTestBody] = useState("Mensagem de teste da EVA · Meta Cloud API ✅");
  const [sendingTest, setSendingTest] = useState(false);
  const [lastTest, setLastTest] = useState<null | { ok: boolean; info: string }>(null);

  useEffect(() => {
    if (data) {
      setForm({
        phone_number_id: data.phone_number_id || "",
        access_token: data.access_token || "",
        app_secret: data.app_secret || "",
        verify_token: data.verify_token || "",
        graph_version: data.graph_version || "v21.0",
      });
    }
  }, [data]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const isPreviewOrLocal =
    !origin ||
    origin.includes("id-preview") ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1");
  const webhookUrl = isPreviewOrLocal
    ? "https://eva-connect-pro.lovable.app/api/public/meta/webhook"
    : `${origin}/api/public/meta/webhook`;

  const status = useMemo(
    () => ({
      phone: form.phone_number_id.trim().length > 0,
      access: form.access_token.trim().length > 0,
      secret: form.app_secret.trim().length > 0,
      verify: form.verify_token.trim().length > 0,
    }),
    [form],
  );

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function copy(v: string) {
    await navigator.clipboard.writeText(v);
    toast.success("Copiado");
  }

  async function onSave() {
    setSaving(true);
    const res = await saveFn({ data: form });
    setSaving(false);
    if (res.ok) {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["meta-settings"] });
      qc.invalidateQueries({ queryKey: ["meta-config"] });
    } else {
      toast.error(res.error || "Falha ao salvar");
    }
  }

  async function onTest() {
    setTesting(true);
    const res = await testFn();
    setTesting(false);
    if (res.ok) {
      toast.success(`Conexão OK · ${res.name ?? ""} ${res.phone ? `(${res.phone})` : ""}`.trim());
    } else {
      toast.error(res.error || "Falha no teste");
    }
  }

  async function onSendTest() {
    setSendingTest(true);
    try {
      let res: any = null;
      try {
        res = await sendTestFn({ data: { to: testTo, body: testBody } });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setLastTest({ ok: false, info: `Erro de rede/servidor: ${msg}` });
        toast.error(`Erro de rede/servidor: ${msg}`);
        return;
      }
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
      setLastTest({ ok: false, info: `Exceção: ${msg}` });
      toast.error(`Exceção: ${msg}`);
    } finally {
      setSendingTest(false);
    }
  }

  const testToNormalized = useMemo(() => normalizePhoneNumber(testTo), [testTo]);

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Credenciais e integrações.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>WhatsApp — Meta Cloud API</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-md border p-3 space-y-2">
            <div className="font-medium">Status da integração</div>
            <ul className="space-y-1">
              <StatusLine ok={status.phone} label="ID do Número de Telefone" />
              <StatusLine ok={status.access} label="Token de Acesso Permanente" />
              <StatusLine ok={status.secret} label="App Secret (validação de assinatura)" />
              <StatusLine ok={status.verify} label="Token de Verificação do Webhook" />
              <li className="text-xs text-muted-foreground pl-6">Graph API: {form.graph_version || "v21.0"}</li>
            </ul>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <div className="font-medium">URL do Webhook (colar no painel Meta)</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all">{webhookUrl}</code>
              <Button size="sm" variant="outline" onClick={() => copy(webhookUrl)}><Copy className="h-3 w-3" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No painel Meta &rarr; Configuração do WhatsApp &rarr; Webhook, use esta URL e o mesmo Token de Verificação abaixo. Assine o campo <code>messages</code>.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="phone">ID do Número de Telefone</Label>
              <Input
                id="phone"
                placeholder="Ex.: 1234567890"
                value={form.phone_number_id}
                onChange={(e) => set("phone_number_id", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="access">Token de Acesso Permanente</Label>
              <div className="flex gap-2">
                <Input
                  id="access"
                  type={show.access ? "text" : "password"}
                  placeholder="EAAG..."
                  value={form.access_token}
                  onChange={(e) => set("access_token", e.target.value)}
                  disabled={isLoading}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShow((s) => ({ ...s, access: !s.access }))}>
                  {show.access ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="secret">App Secret</Label>
              <div className="flex gap-2">
                <Input
                  id="secret"
                  type={show.secret ? "text" : "password"}
                  placeholder="App Secret do app Meta"
                  value={form.app_secret}
                  onChange={(e) => set("app_secret", e.target.value)}
                  disabled={isLoading}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShow((s) => ({ ...s, secret: !s.secret }))}>
                  {show.secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="verify">Token de Verificação do Webhook</Label>
              <div className="flex gap-2">
                <Input
                  id="verify"
                  placeholder="String que você define"
                  value={form.verify_token}
                  onChange={(e) => set("verify_token", e.target.value)}
                  disabled={isLoading}
                />
                <Button type="button" variant="outline" onClick={() => set("verify_token", randomToken(32))}>
                  <Shuffle className="mr-1 h-4 w-4" /> Gerar
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={() => copy(form.verify_token)} disabled={!form.verify_token}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ver">Versão da Graph API</Label>
              <Input
                id="ver"
                placeholder="v21.0"
                value={form.graph_version}
                onChange={(e) => set("graph_version", e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onSave} disabled={saving || isLoading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar configurações
            </Button>
            <Button variant="outline" onClick={onTest} disabled={testing || isLoading || !status.phone || !status.access}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
              Testar conexão
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Salve primeiro para que o teste use os valores atualizados. As credenciais ficam armazenadas no backend do app e nunca são expostas no frontend.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Diagnóstico Meta · Enviar mensagem de teste</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">
            Envia uma mensagem real via Meta Cloud API para validar credenciais, normalização de número (DDI 55 automático) e roteamento. Nenhum navegador é aberto.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="test-to">Número (com DDD)</Label>
              <Input
                id="test-to"
                placeholder="11 99999-9999"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
              <div className="text-[11px] text-muted-foreground">
                Enviaremos para: <code>{testToNormalized || "—"}</code>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="test-body">Mensagem</Label>
              <Input
                id="test-body"
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
              />
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