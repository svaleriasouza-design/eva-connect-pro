import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { beginEmbeddedFn, cancelEmbeddedFn, embeddedConfigFn, finishEmbeddedFn } from "@/lib/meta-embedded.functions";
import { parseEmbeddedMessage } from "@/lib/meta-embedded-contract";
import { loadMetaSDK } from "@/lib/meta-embedded-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, PlugZap } from "lucide-react";
import { toast } from "sonner";

export function MetaEmbeddedConnect() {
  const configFn = useServerFn(embeddedConfigFn);
  const beginFn = useServerFn(beginEmbeddedFn);
  const finishFn = useServerFn(finishEmbeddedFn);
  const cancelFn = useServerFn(cancelEmbeddedFn);
  const qc = useQueryClient();
  const { data: config, isError } = useQuery({ queryKey: ["meta-embedded-config"], queryFn: () => configFn() });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"prepare" | "meta" | "saving">("prepare");
  const [attempt, setAttempt] = useState<{ attemptId: string; expiresAt: string } | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  async function prepare() {
    if (!config?.ready || !config.canConnect) return;
    setBusy(true);
    try {
      await loadMetaSDK(config.appId, config.graphVersion);
      const next = await beginFn();
      setAttempt(next); setPin(""); setStep("prepare"); setOpen(true);
    } catch { toast.error("Não foi possível preparar a conexão Meta. Tente novamente."); }
    finally { setBusy(false); }
  }

  function launch() {
    if (!config || !attempt || !/^\d{6}$/.test(pin)) return;
    if (Date.parse(attempt.expiresAt) <= Date.now()) { toast.error("A tentativa expirou. Inicie novamente."); setOpen(false); return; }
    setStep("meta");
    let code: string | undefined;
    let assets: { wabaId: string; phoneNumberId: string } | undefined;
    let submitted = false;
    let closed = false;
    const stop = () => { closed = true; window.removeEventListener("message", listener); window.clearTimeout(timer); cleanup.current = null; };
    const fail = (message: string) => { if (closed || submitted) return; stop(); void cancelFn({ data: { attemptId: attempt.attemptId } }).catch(() => {}); setOpen(false); toast.error(message); };
    const finalize = async () => {
      if (!code || !assets || submitted || closed) return;
      submitted = true; stop(); setStep("saving");
      try {
        const result = await finishFn({ data: { attemptId: attempt.attemptId, code, ...assets, pin } });
        if (result.ok) { toast.success(`WhatsApp conectado${result.phone ? `: ${result.phone}` : ""}`); await qc.invalidateQueries({ queryKey: ["wa-numbers"] }); }
        else toast.error(result.error);
      } catch { toast.error("A conexão não foi concluída. Atualize a lista antes de tentar novamente."); }
      finally { setOpen(false); setPin(""); setAttempt(null); }
    };
    const listener = (event: MessageEvent) => {
      const parsed = parseEmbeddedMessage(event.origin, event.data);
      if (!parsed || closed) return;
      if (parsed.event === "CANCEL") { fail("Conexão cancelada. Seus números atuais foram preservados."); return; }
      if (parsed.event === "ERROR") { fail("A Meta informou um erro. Tente conectar novamente."); return; }
      assets = { wabaId: parsed.wabaId, phoneNumberId: parsed.phoneNumberId }; void finalize();
    };
    const timer = window.setTimeout(() => fail("A conexão expirou. Conclua a janela Meta clicando em Finalizar."), Math.max(1, Date.parse(attempt.expiresAt) - Date.now()));
    window.addEventListener("message", listener); cleanup.current = stop;
    // SDK is already loaded by prepare(): FB.login stays in the direct user click to avoid popup blocking.
    const win = window as Window & { FB?: { login: (cb: (result: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>) => void } };
    if (!win.FB) { fail("A conexão Meta não carregou. Tente novamente."); return; }
    win.FB.login(result => {
      if (closed) return;
      code = result.authResponse?.code;
      if (!code) { fail("A autorização não foi concluída. Clique em Finalizar na janela Meta."); return; }
      void finalize();
    }, { config_id: config.configId, response_type: "code", override_default_response_type: true, extras: { setup: {} } });
  }

  async function dismiss() {
    cleanup.current?.();
    if (attempt) await cancelFn({ data: { attemptId: attempt.attemptId } }).catch(() => {});
    setOpen(false); setPin(""); setAttempt(null);
  }

  return <section className="space-y-3 border-b pb-4">
    <h3 className="text-base font-semibold">Conecte seu WhatsApp à EVA</h3>
    <Button onClick={prepare} disabled={busy || !config?.ready || !config?.canConnect}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />} Conectar meu WhatsApp
    </Button>
    {isError ? <p className="text-sm text-destructive">Não foi possível consultar a conexão Meta.</p> : config && !config.canConnect ? <p className="text-sm text-muted-foreground">Conexão disponível para administradores da empresa.</p> : config && !config.ready ? <p className="text-sm text-muted-foreground">Aguardando configuração do aplicativo Meta.</p> : null}
    <Dialog open={open} onOpenChange={value => { if (!value && step !== "saving") void dismiss(); }}>
      <DialogContent><DialogHeader><DialogTitle>Conectar WhatsApp</DialogTitle><DialogDescription>
        {step === "prepare" ? "Autorize a EVA na Meta. Os números atuais serão preservados. Nesta etapa, a conexão é exclusiva para WhatsApp Cloud API, sem coexistência com o aplicativo WhatsApp Business." : step === "meta" ? "Conclua a autorização na janela da Meta e clique em Finalizar." : "Validando a autorização e concluindo o registro do número…"}
      </DialogDescription></DialogHeader>
      {step === "prepare" ? <div className="space-y-2"><Label htmlFor="meta-pin">PIN de verificação em duas etapas do WhatsApp</Label><Input id="meta-pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} /><p className="text-xs text-muted-foreground">Informe ou defina um PIN de 6 dígitos e guarde-o. Ele será usado caso o número precise de registro.</p></div> : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      <DialogFooter><Button variant="outline" onClick={() => void dismiss()} disabled={step === "saving"}>Cancelar</Button>{step === "prepare" && <Button onClick={launch} disabled={!/^\d{6}$/.test(pin)}>Continuar na Meta</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}