import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccessFn } from "@/lib/users.functions";

export type Access = {
  userId: string;
  email: string;
  name: string;
  roles: ("admin" | "operador" | "leitor")[];
  isAdmin: boolean;
  canSend: boolean;
};

export function useAccess() {
  const fn = useServerFn(getMyAccessFn);
  const q = useQuery<Access>({
    queryKey: ["my-access"],
    queryFn: () => fn() as Promise<Access>,
    staleTime: 60_000,
  });
  return {
    access: q.data ?? null,
    loading: q.isLoading,
    isAdmin: q.data?.isAdmin ?? false,
    canSend: q.data?.canSend ?? false,
  };
}
