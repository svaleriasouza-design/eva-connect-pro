import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/db";
import { listSaturdayRequestsFn, decideSaturdayRequestFn } from "@/lib/saturday.functions";

/** Pedidos de reunião no sábado que a EVA encaminhou para o responsável decidir. */
export function SaturdayRequestsCard() {
  const qc = useQueryClient();
  const list = useServerFn(listSaturdayRequestsFn);
  const decide = useServerFn(decideSaturdayRequestFn);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: requests = [] } = useQuery({
    queryKey: ["saturday-requests"],
    queryFn: () => list({}) as any,
    refetchInterval: 60_000,
  });

  async function act(id: string, approve: boolean) {
    setBusy(id);
    try {
      const res: any = await decide({ data: { requestId: id, approve } });
      if (res?.ok === false && res?.error) toast.error(res.error);
      else toast.success(approve ? "Sábado autorizado — a EVA já confirmou com o lead." : "Recusado — a EVA ofereceu horários de segunda a sexta.");
      qc.invalidateQueries({ queryKey: ["saturday-requests"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["dashboard-central"] });
    } catch {
      toast.error("Não consegui registrar sua decisão agora.");
    } finally {
      setBusy(null);
    }
  }

  if ((requests as any[]).length === 0) return null;

  return (
    <Card className="border-[color:var(--gold)]/40">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-[color:var(--gold)]" /> Pedidos de reunião no sábado
        </CardTitle>
        <Badge variant="secondary" className="text-[10px]">{(requests as any[]).length} aguardando você</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          A EVA não confirma sábado sozinha. Autorize para ela fechar com o lead ou recuse para ela oferecer dias úteis.
        </p>
        {(requests as any[]).map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
            <div className="min-w-0">
              <Link to="/crm/$id" params={{ id: r.contact_id }} className="font-medium hover:text-primary">
                {r.contact_name || "Lead"}
              </Link>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(r.start_at)} · {r.duration_minutes ?? 30} min · {r.online === false ? "Presencial" : "Google Meet"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={busy === r.id} onClick={() => act(r.id, true)}>
                {busy === r.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />} Autorizar
              </Button>
              <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => act(r.id, false)}>
                <X className="mr-1 h-3 w-3" /> Recusar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
