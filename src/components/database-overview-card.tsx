import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Phone, Link2, Unlink } from "lucide-react";
import { listWhatsappNumbersFn } from "@/lib/wa-numbers.functions";

/**
 * Painel de base real do workspace: contagens exatas (head:true) de empresas,
 * contatos e números ativos + relação empresa ↔ contatos.
 * Todas as consultas são escopadas pelo workspace via RLS.
 */
export function DatabaseOverviewCard() {
  const listNumbers = useServerFn(listWhatsappNumbersFn);

  const { data, isLoading } = useQuery({
    queryKey: ["database-overview"],
    queryFn: async () => {
      const cnt = async (q: any) => (await q).count ?? 0;
      const contacts = () =>
        supabase.from("contacts").select("id", { count: "exact", head: true }).is("deleted_at", null);
      const companies = () =>
        supabase.from("companies").select("id", { count: "exact", head: true }).is("deleted_at", null);

      const [
        totalContatos,
        contatosComEmpresa,
        contatosAtivos,
        totalEmpresas,
        empresasComContatos,
        topEmpresas,
        numeros,
      ] = await Promise.all([
        cnt(contacts()),
        cnt(contacts().not("company_id", "is", null)),
        cnt(contacts().eq("do_not_contact", false)),
        cnt(companies()),
        cnt(companies().gt("contacts_count", 0)),
        supabase
          .from("companies")
          .select("id, name, contacts_count, funnel_stage")
          .is("deleted_at", null)
          .gt("contacts_count", 0)
          .order("contacts_count", { ascending: false })
          .limit(8),
        listNumbers({}).catch(() => [] as any[]),
      ]);

      const nums = (numeros ?? []) as any[];
      return {
        totalContatos,
        contatosComEmpresa,
        contatosSemEmpresa: totalContatos - contatosComEmpresa,
        contatosAtivos,
        totalEmpresas,
        empresasComContatos,
        empresasSemContatos: totalEmpresas - empresasComContatos,
        topEmpresas: (topEmpresas.data ?? []) as any[],
        numerosAtivos: nums.filter((n) => n.active).length,
        numerosTotal: nums.length,
      };
    },
    staleTime: 30_000,
  });

  const media =
    data && data.empresasComContatos > 0
      ? (data.contatosComEmpresa / data.empresasComContatos).toFixed(1)
      : "0";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> Base real do workspace
        </CardTitle>
        <Badge variant="secondary" className="text-[10px]">
          {isLoading ? "carregando..." : "contagem exata"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini icon={Building2} label="Empresas" value={data?.totalEmpresas ?? 0} hint="cadastradas hoje" />
          <Mini icon={Users} label="Contatos" value={data?.totalContatos ?? 0} hint={`${data?.contatosAtivos ?? 0} podem receber mensagem`} />
          <Mini icon={Link2} label="Empresas com contatos" value={data?.empresasComContatos ?? 0} hint={`média de ${media} contatos por empresa`} />
          <Mini icon={Phone} label="Números ativos" value={data?.numerosAtivos ?? 0} hint={`de ${data?.numerosTotal ?? 0} cadastrados`} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3 text-sm">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <Unlink className="h-3.5 w-3.5 text-orange-500" /> Sem vínculo
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• {data?.empresasSemContatos ?? 0} empresa(s) sem nenhum contato</li>
              <li>• {data?.contatosSemEmpresa ?? 0} contato(s) sem empresa vinculada</li>
            </ul>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide">Empresas com mais contatos</div>
            {(data?.topEmpresas ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma empresa com contatos vinculados.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {data?.topEmpresas.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2">
                    <Link to="/empresas" className="truncate text-primary hover:underline">
                      {e.name}
                    </Link>
                    <span className="shrink-0 text-muted-foreground">{e.contacts_count} contato(s)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Mini({ icon: Icon, label, value, hint }: { icon: any; label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-2xl font-semibold leading-tight">{value.toLocaleString("pt-BR")}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
