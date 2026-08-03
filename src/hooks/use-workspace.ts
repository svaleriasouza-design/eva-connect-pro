import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWorkspaceFn } from "@/lib/workspace.functions";

export type Workspace = { name: string; tagline: string; owner_name: string };

const FALLBACK: Workspace = { name: "EVA IA", tagline: "Assistente Executiva", owner_name: "" };

export function useWorkspace() {
  const fn = useServerFn(getWorkspaceFn);
  const q = useQuery<Workspace>({
    queryKey: ["workspace"],
    queryFn: () => fn() as Promise<Workspace>,
    staleTime: 5 * 60_000,
  });
  const workspace = q.data ?? FALLBACK;

  useEffect(() => {
    if (typeof document !== "undefined" && q.data?.name) {
      document.title = `${q.data.name} — ${q.data.tagline || "Assistente Executiva"}`;
    }
  }, [q.data?.name, q.data?.tagline]);

  return { workspace, loading: q.isLoading };
}
