import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, X, Eye, EyeOff } from "lucide-react";
import { passwordChecks, isPasswordStrong, translateAuthError } from "@/lib/auth-messages";
import evaLogo from "@/assets/eva-logo.png";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta · EVA IA" },
      { name: "description", content: "Acesse a central comercial EVA IA ou crie sua conta para começar a prospectar com a assistente executiva." },
      { property: "og:title", content: "Entrar ou criar conta · EVA IA" },
      { property: "og:description", content: "Acesse a central comercial EVA IA ou crie sua conta em poucos segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const checks = passwordChecks(password);
  const strongEnough = isPasswordStrong(password);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && !strongEnough) {
      setPasswordTouched(true);
      toast.error("A senha ainda não atende a todos os requisitos abaixo.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!remember) sessionStorage.setItem("eva_no_persist", "1");
        toast.success("Bem-vinda, Valéria ✨");
        navigate({ to: "/" });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada. Bem-vinda ✨");
          navigate({ to: "/" });
        } else {
          toast.success("Conta criada. Você já pode entrar.");
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Enviamos um e-mail com o link para redefinir sua senha.");
        setMode("login");
      }
    } catch (err) {
      toast.error(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[color:var(--petrol)] to-[color:var(--petrol-dark,#0f2a35)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-white">
          <img src={evaLogo} alt="EVA IA" width={56} height={56} className="rounded-xl bg-white/10 p-2" />
          <div className="text-2xl font-semibold tracking-tight">EVA IA</div>
          <div className="text-xs uppercase tracking-[0.2em] text-white/60">Bio Impact · Assistente Executiva</div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[color:var(--gold)]" />
              {mode === "login" && "Entrar"}
              {mode === "signup" && "Criar conta"}
              {mode === "forgot" && "Recuperar senha"}
            </CardTitle>
            <CardDescription>
              {mode === "login" && "Acesse sua central comercial."}
              {mode === "signup" && "Cadastre-se para acessar. Novos usuários entram como Leitor até um administrador liberar o envio."}
              {mode === "forgot" && "Vamos enviar um link para o seu e-mail."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={120}
                    autoComplete="name"
                    placeholder="Como você quer ser chamada"
                    onInvalid={(e) => e.currentTarget.setCustomValidity("Informe seu nome completo.")}
                    onInput={(e) => e.currentTarget.setCustomValidity("")}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="voce@empresa.com.br"
                  onInvalid={(e) =>
                    e.currentTarget.setCustomValidity(
                      e.currentTarget.value ? "Digite um e-mail válido, como voce@empresa.com.br." : "Informe seu e-mail.",
                    )
                  }
                  onInput={(e) => e.currentTarget.setCustomValidity("")}
                />
              </div>
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="pr-10"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordTouched(true);
                      }}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      onInvalid={(e) => e.currentTarget.setCustomValidity("Informe sua senha.")}
                      onInput={(e) => e.currentTarget.setCustomValidity("")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {mode === "signup" && (
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="mb-2 text-xs font-medium">Sua senha deve conter:</div>
                      <ul className="space-y-1">
                        {checks.map((c) => {
                          const state = !passwordTouched ? "idle" : c.ok ? "ok" : "missing";
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
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Evite senhas comuns (como “senha123” ou seu nome) — elas são recusadas por segurança.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {mode === "login" && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                    <span>Permanecer conectado</span>
                  </label>
                  <button type="button" onClick={() => setMode("forgot")} className="text-primary hover:underline">
                    Esqueci minha senha
                  </button>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading || (mode === "signup" && !strongEnough)}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "login" && "Entrar"}
                {mode === "signup" && "Criar conta"}
                {mode === "forgot" && "Enviar link de recuperação"}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                {mode === "login" ? (
                  <>Ainda não tem conta? <button type="button" onClick={() => setMode("signup")} className="text-primary hover:underline">Criar conta</button></>
                ) : (
                  <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline">Voltar para o login</button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}