import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { EvaChat } from "@/components/eva-chat";
import { GlobalSearch } from "@/components/global-search";
import { Button } from "@/components/ui/button";
import { LogOut, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/use-workspace";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { workspace } = useWorkspace();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="hidden text-sm font-medium tracking-wide text-muted-foreground md:block">
              {workspace.name} · {workspace.tagline}
            </div>
            <button
              onClick={() => setSearchOpen(true)}
              className="ml-2 flex flex-1 max-w-xl items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted transition"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1">Buscar em tudo — cliente, empresa, agenda…</span>
              <kbd className="hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium md:inline">⌘K</kbd>
            </button>
            <div className="hidden text-xs text-muted-foreground lg:block">{user.email}</div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </header>
          <main className="flex-1" key={path}>
            <Outlet />
          </main>
        </div>
        <EvaChat />
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </SidebarProvider>
  );
}