import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  MessageCircle,
  Calendar,
  History,
  KanbanSquare,
  Sparkles,
  CheckSquare,
  Settings,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import evaLogo from "@/assets/eva-logo.png";
import { useAccess } from "@/hooks/use-access";
import { Megaphone } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlatformStatusFn } from "@/lib/platform.functions";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "CRM", url: "/crm", icon: Users },
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Atendimento", url: "/atendimento", icon: Headphones },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle },
  { title: "Cadências", url: "/cadencias", icon: KanbanSquare },
  { title: "Disparos", url: "/disparos", icon: Megaphone },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Histórico", url: "/historico", icon: History },
  { title: "Funil", url: "/funil", icon: KanbanSquare },
  { title: "EVA IA", url: "/eva", icon: Sparkles },
  { title: "Tarefas", url: "/tarefas", icon: CheckSquare },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
] as const;

const adminItems = [
  { title: "Usuários", url: "/usuarios", icon: ShieldCheck },
] as const;

const platformItems = [
  { title: "Painel Admin", url: "/admin", icon: ShieldCheck },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (u: string) => (u === "/" ? path === "/" : path.startsWith(u));
  const { isAdmin, access } = useAccess();
  const statusFn = useServerFn(getPlatformStatusFn);
  const platform = useQuery({
    queryKey: ["platform-status"],
    queryFn: () => statusFn() as Promise<{ isPlatformAdmin: boolean }>,
    staleTime: 60_000,
  });
  const visible = [
    ...items,
    ...(isAdmin ? adminItems : []),
    ...(platform.data?.isPlatformAdmin ? platformItems : []),
  ];
  const { workspace } = useWorkspace();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <img src={evaLogo} alt="EVA IA" width={36} height={36} className="rounded-md bg-white/10 p-1" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">{workspace.name}</span>
              <span className="text-[10px] uppercase text-sidebar-foreground/60">{workspace.tagline}</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {!collapsed && access && (
          <div className="px-3 pb-3 text-[10px] text-sidebar-foreground/60">
            {access.name} · {access.isAdmin ? "Administrador" : access.canSend ? "Operador" : "Leitor"}
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}