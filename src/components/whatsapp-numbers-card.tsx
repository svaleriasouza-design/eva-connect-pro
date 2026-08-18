import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listWhatsappNumbersFn,
  saveWhatsappNumberFn,
  setPrimaryWhatsappNumberFn,
  toggleWhatsappNumberFn,
  deleteWhatsappNumberFn,
  testWhatsappNumberFn,
} from "@/lib/wa-numbers.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, PlugZap, Star, Trash2, Pencil, Shuffle, Copy } from "lucide-react";
import { toast } from "sonner";

type NumberRow = Awaited<ReturnType<typeof listWhatsappNumbersFn>>[number];

type Form = {
  id: string | null;
  label: string;
  display_phone: string;
  phone_number_id: string;
  waba_id: string;
  access_token: string;
  app_secret: string;
  verify_token: string;
  graph_version: string;
  default_template_name: string;
  default_template_lang: string;
  is_primary: boolean;
};

const EMPTY: Form = {
  id: null,
  label: "",
  display_phone: "",
  phone_number_id: "",
  waba_id: "",
  access_token: "",
  app_secret: "",
  verify_token: "",
  graph_version: "v21.0",
  default_template_name: "hello_world",
  default_template_lang: "en_US",
  is_primary: false,
};

function randomToken(len = 32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i]! % alphabet.length]!;
  return out;
}

export function WhatsappNumbersCard() {
  const qc = useQueryClient();
  const listFn = useServerFn(listWhatsappNumbersFn);
  const saveFn = useServerFn(saveWhatsappNumberFn);
  const primaryFn = useServerFn(setPrimaryWhatsappNumberFn);
  const toggleFn = useServerFn(toggleWhatsappNumberFn);
  const removeFn = useServerFn(deleteWhatsappNumberFn);
  const testFn = useServerFn(testWhatsappNumberFn);

  const { data: numbers = [], isLoading } = useQuery({
    queryKey: ["wa-numbers"],
    queryFn: () => listFn(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<NumberRow | null>(null);

  const webhookUrl = useMemo(() => {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const preview = !origin || origin.includes("id-preview") || origin.includes("localhost");
    return preview
      ? "https://eva-connect-pro.lovable.app/api/public/meta/webhook"
      : `${origin}/api/public/meta/webhook`;
  }, []);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openNew() {
    setForm({ ...EMPTY, verify_token: randomToken(32) });
    setOpen(true);
  }

  function openEdit(n: NumberRow) {
    setForm({
      id: n.id,
      label: n.label,
      display_phone: n.display_phone,
      phone_number_id: n.phone_number_id,
      waba_id: n.waba_id,
      access_token: "",
      app_secret: "",
      verify_token: "",
      graph_version: n.graph_version,
      default_template_name: n.default_template_name,
      default_template_lang: n.default_template_lang,
      is_primary: n.is_primary,
    });
    setOpen(true);
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ["wa-numbers"] });

  async function onSave() {
    if (!form.label.trim() || !form.phone_number_id.trim()) {
      toast.error("Informe o nome do número e o ID do número da Meta.");
      return;
    }
    setSaving(true);
    const res = await saveFn({ data: { ...form, id: form.id ?? undefined } });
    setSaving(false);
    if (res.ok) {
      toast.success("Número salvo");
      setOpen(false);
      refresh();
    } else toast.error(res.error || "Falha ao salvar");
  }

  async function onTest(n: NumberRow) {
    setBusy(n.id);
    const res = await testFn({ data: { id: n.id } });
    setBusy(null);
    if (res.ok) toast.success(`Conectado · ${res.name ?? ""} ${res.phone ? `(${res.phone})` : ""}`.trim());
    else toast.error(res.error || "Erro na conexão");
    refresh();
  }

  async function onToggle(n: NumberRow, active: boolean) {
    setBusy(n.id);
    await toggleFn({ data: { id: n.id, active } });
    setBusy(null);
    toast.success(active ? "Número ativado" : "Número desativado");
    refresh();
  }

  async function onPrimary(n: NumberRow) {
    setBusy(n.id);
    await primaryFn({ data: { id: n.id } });
    setBusy(null);
    toast.success(`${n.label} agora é o número principal`);
    refresh();
  }

  async function onRemove(n: NumberRow) {
    setBusy(n.id);
    const res: any = await removeFn({ data: { id: n.id } });
    setBusy(null);
    setConfirmRemove(null);
    if (res?.ok) {
      toast.success(
        res.deactivated
          ? "O número tem histórico e foi apenas desativado (nada foi apagado)."
          : "Número removido",
      );
      refresh();
    } else toast.error(res?.error || "Falha ao remover");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Números WhatsApp</CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar número
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-md border p-3 space-y-1">
          <div className="font-medium">URL do Webhook (a mesma para todos os números)</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all">{webhookUrl}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(webhookUrl);
                toast.success("Copiado");
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            No painel da Meta, cada número deve apontar para esta URL e assinar o campo <code>messages</code>. A EVA
            identifica automaticamente qual número recebeu cada mensagem.
          </p>
        </div>

        {isLoading && <div className="text-muted-foreground">Carregando números…</div>}
        {!isLoading && numbers.length === 0 && (
          <div className="rounded-md border border-dashed p-4 text-muted-foreground">
            Nenhum número cadastrado ainda. Clique em “Adicionar número”.
          </div>
        )}

        <div className="space-y-2">
          {numbers.map((n) => (
            <div key={n.id} className="rounded-md border p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{n.label}</span>
                {n.display_phone && <span className="text-muted-foreground">{n.display_phone}</span>}
                {n.is_primary && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3" /> Principal
                  </Badge>
                )}
                <Badge variant={n.active ? "default" : "outline"}>{n.active ? "Ativo" : "Inativo"}</Badge>
                <Badge
                  variant={n.connection_status === "connected" ? "secondary" : n.connection_status === "error" ? "destructive" : "outline"}
                >
                  {n.connection_status === "connected"
                    ? "🟢 Conectado"
                    : n.connection_status === "error"
                      ? "Erro na conexão"
                      : "Não verificado"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                ID do número: <code>{n.phone_number_id}</code> · Token {n.has_access_token ? "salvo ✅" : "faltando ⚠"} ·
                App Secret {n.has_app_secret ? "salvo ✅" : "faltando ⚠"} · Verify token{" "}
                {n.has_verify_token ? "salvo ✅" : "faltando ⚠"}
              </div>
              {n.connection_status === "error" && n.connection_error && (
                <div className="text-xs text-destructive">{n.connection_error}</div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(n)}>
                  <Pencil className="mr-1 h-3 w-3" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => onTest(n)} disabled={busy === n.id}>
                  {busy === n.id ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <PlugZap className="mr-1 h-3 w-3" />
                  )}
                  Testar conexão
                </Button>
                {!n.is_primary && (
                  <Button size="sm" variant="outline" onClick={() => onPrimary(n)} disabled={busy === n.id || !n.active}>
                    <Star className="mr-1 h-3 w-3" /> Tornar principal
                  </Button>
                )}
                <div className="flex items-center gap-2 pl-1">
                  <Switch checked={n.active} onCheckedChange={(v) => onToggle(n, v)} disabled={busy === n.id} />
                  <span className="text-xs text-muted-foreground">Ativo</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(n)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Tokens e segredos ficam guardados apenas no backend — nunca aparecem aqui, nos logs ou no navegador.
        </p>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar número" : "Adicionar número"}</DialogTitle>
            <DialogDescription>
              Pegue estes dados no painel da Meta (WhatsApp &rarr; Configuração da API). Deixe os campos de
              token/segredo em branco para manter o que já está salvo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label>Nome interno (como você identifica esse número)</Label>
              <Input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Ex.: Bio Impact 01" />
            </div>
            <div className="space-y-1">
              <Label>Número de telefone (só exibição)</Label>
              <Input value={form.display_phone} onChange={(e) => set("display_phone", e.target.value)} placeholder="+55 62 90000-0000" />
            </div>
            <div className="space-y-1">
              <Label>ID do número (phone_number_id)</Label>
              <Input value={form.phone_number_id} onChange={(e) => set("phone_number_id", e.target.value)} placeholder="Ex.: 1234567890" />
            </div>
            <div className="space-y-1">
              <Label>ID da conta WhatsApp Business (WABA) — opcional</Label>
              <Input value={form.waba_id} onChange={(e) => set("waba_id", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Token de acesso permanente</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.access_token}
                onChange={(e) => set("access_token", e.target.value)}
                placeholder={form.id ? "•••••• (mantém o atual)" : "EAAG..."}
              />
            </div>
            <div className="space-y-1">
              <Label>App Secret</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.app_secret}
                onChange={(e) => set("app_secret", e.target.value)}
                placeholder={form.id ? "•••••• (mantém o atual)" : "App Secret do app Meta"}
              />
            </div>
            <div className="space-y-1">
              <Label>Token de verificação do webhook</Label>
              <div className="flex gap-2">
                <Input value={form.verify_token} onChange={(e) => set("verify_token", e.target.value)} placeholder={form.id ? "•••••• (mantém o atual)" : ""} />
                <Button type="button" variant="outline" onClick={() => set("verify_token", randomToken(32))}>
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Template padrão</Label>
                <Input value={form.default_template_name} onChange={(e) => set("default_template_name", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Idioma do template</Label>
                <Input value={form.default_template_lang} onChange={(e) => set("default_template_lang", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Versão da Graph API</Label>
              <Input value={form.graph_version} onChange={(e) => set("graph_version", e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_primary} onCheckedChange={(v) => set("is_primary", v)} />
              <span className="text-xs text-muted-foreground">Definir como número principal</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={onSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar número
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmRemove)} onOpenChange={(v) => !v && setConfirmRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover “{confirmRemove?.label}”?</DialogTitle>
            <DialogDescription>
              Se esse número já tiver conversas, contatos ou disparos, ele será apenas desativado para preservar todo o
              histórico.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmRemove && onRemove(confirmRemove)}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}