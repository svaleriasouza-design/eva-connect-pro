import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCalendarStatusFn, suggestSlotsFn } from "@/lib/calendar.functions";
import { CalendarCheck, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function GoogleCalendarCard() {
  const statusFn = useServerFn(getCalendarStatusFn);
  const slotsFn = useServerFn(suggestSlotsFn);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["calendar-status"],
    queryFn: () => statusFn(),
  });

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

  const connected = Boolean(data && (data as any).connected);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" /> Google Calendar
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
                ? `Conectado · agenda "${(data as any).calendar}"`
                : ((data as any)?.error ?? "Não conectado")}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Com a agenda conectada, a EVA consulta a disponibilidade em tempo real, cria eventos com Google Meet,
          envia o convite por e-mail e mantém Agenda, CRM e Histórico sincronizados.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}>Revalidar conexão</Button>
          <Button size="sm" onClick={testSlots} disabled={loading || !connected}>
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
