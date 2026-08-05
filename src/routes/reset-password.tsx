import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { passwordChecks, isPasswordStrong, translateAuthError } from "@/lib/auth-messages";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPage,
  head: () => ({
    meta: [
      { title: "Definir nova senha · EVA IA" },
      { name: "description", content: "Crie uma nova senha segura para voltar a acessar sua central comercial EVA IA." },
      { property: "og:title", content: "Definir nova senha · EVA IA" },
      { property: "og:description", content: "Redefina sua senha de acesso à EVA IA em poucos segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const checks = passwordChecks(password);
  const strongEnough = isPasswordStrong(password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!strongEnough) {
      setTouched(true);
      toast.error("A senha ainda não atende a todos os requisitos abaixo.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada!");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(translateAuthError(err, "Não foi possível atualizar a senha. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Definir nova senha</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pwd">Nova senha</Label>
              <Input
                id="pwd"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setTouched(true);
                }}
                onInvalid={(e) => e.currentTarget.setCustomValidity("Informe a nova senha.")}
                onInput={(e) => e.currentTarget.setCustomValidity("")}
              />
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="mb-2 text-xs font-medium">Sua senha deve conter:</div>
                <ul className="space-y-1">
                  {checks.map((c) => {
                    const state = !touched ? "idle" : c.ok ? "ok" : "missing";
                    return (
                      <li
                        key={c.id}
                        className={
                          "flex items-center gap-2 text-xs " +
                          (state === "ok" ? "text-emerald-600" : state === "missing" ? "text-destructive" : "text-muted-foreground")
                        }
                      >
                        {state === "ok" ? (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        ) : state === "missing" ? (
                          <X className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                        )}
                        <span>{c.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !strongEnough}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar nova senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}