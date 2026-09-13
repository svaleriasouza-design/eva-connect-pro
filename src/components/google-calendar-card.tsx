import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCalendarStatusFn, suggestSlotsFn } from "@/lib/calendar.functions";
import {
  startGoogleCalendarConnectFn,
  completeGoogleCalendarConnectFn,
  disconnectGoogleCalendarFn,
} from "@/lib/google-oauth.functions";
import { CalendarCheck, CheckCircle2, XCircle, Loader2, Link2, Unlink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CONNECTOR_ID = "google_calendar";

function waitForOAuth(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.data?.connectorId !== CONNECTOR_ID ||
        (type !== "googleCalendarOAuthComplete" && type !== "googleCalendarOAuthFailed")
      ) {
        return;
      }
      cleanup();
      if (type === "googleCalendarOAuthComplete") {
        resolve(typeof event.data?.code === "string" ? event.data.code : null);
        return;
      }
      popup.close();
      reject(new Error("A autorização do Google não foi concluída."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("A janela do Google foi fechada antes de concluir."));
    }, 500);
  });
}

export function GoogleCalendarCard() {
  const statusFn = useServerFn(getCalendarStatusFn);
  const slotsFn = useServerFn(suggestSlotsFn);
  const startFn = useServerFn(startGoogleCalendarConnectFn);
  const completeFn = useServerFn(completeGoogleCalendarConnectFn);
  const disconnectFn = useServerFn(disconnectGoogleCalendarFn);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["calendar-status"],
    queryFn: () => statusFn(),
  });

  const status = data as any;
  const connected = Boolean(status?.connected);
  const reconnect = Boolean(status?.reconnectRequired);

  async function connect() {
    setConnecting(true);
    const popup = window.open("", "eva-google-oauth", "width=600,height=720");
    if (!popup) {
      setConnecting(false);
      toast.error("Libere as janelas pop-up do navegador e tente novamente.");
      return;
    }
    try {
      const { authorizationUrl } = await startFn();
      const completion = waitForOAuth(popup);
      popup.location.href = authorizationUrl;
      const code = await completion;
      if (code) {
        const res = await completeFn({ data: { code } });
        if (!(res as any).ok) throw new Error((res as any).error ?? "Não foi possível concluir a conexão.");
      }
      await refetch();
      toast.success("Google Agenda conectada à sua conta.");
    } catch (err) {
      popup.close();
      toast.error(err instanceof Error ? err.message : "Não foi possível conectar sua Google Agenda.");
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    setConnecting(true);
    try {
      await disconnectFn();
      setSlots(null);
      await refetch();
      toast.success("Sua Google Agenda foi desconectada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível desconectar.");
    } finally {
      setConnecting(false);
    }
  }

  async function testSlots() {
    setLoading(true);
    try {
      const res = await slotsFn({ data: { duration: 30 } });
      if (res.ok) {
        setSlots(res.slots);
        toast.success(`${res.slots.length} horário(s) livre(s) encontrados`);
      } else {
        toast.error(res.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" /> Minha Google Agenda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : connected ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          <span>
            {isLoading
              ? "Verificando conexão…"
              : connected
                ? `Conectada${status?.email ? ` · ${status.email}` : ""} · agenda "${status?.calendar}"`
                : (status?.error ?? "Não conectada")}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Cada usuária conecta a própria conta Google. A EVA consulta a disponibilidade, cria eventos com Google Meet,
          envia o convite por e-mail e mantém Agenda, CRM e Histórico sincronizados — sempre na agenda de quem conectou.
          Ninguém vê a agenda de outra pessoa.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={connect} disabled={connecting}>
            {connecting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Link2 className="mr-2 h-3 w-3" />}
            {connected ? "Reconectar" : reconnect ? "Reconectar minha Google Agenda" : "Conectar minha Google Agenda"}
          </Button>
          {(connected || reconnect) && (
            <Button size="sm" variant="outline" onClick={disconnect} disabled={connecting}>
              <Unlink className="mr-2 h-3 w-3" /> Desconectar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => refetch()}>Revalidar conexão</Button>
          <Button size="sm" variant="secondary" onClick={testSlots} disabled={loading || !connected}>
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Testar disponibilidade
          </Button>
        </div>

        {slots && (
          <div className="rounded-md border p-3 text-xs">
            <div className="font-medium mb-1">Próximos horários livres (30 min)</div>
            {slots.length === 0 ? (
              <div className="text-muted-foreground">Nenhum horário livre nos próximos 7 dias úteis.</div>
            ) : (
              <ul className="space-y-0.5">
                {slots.map((s) => (
                  <li key={s}>
                    {new Intl.DateTimeFormat("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(s))}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
