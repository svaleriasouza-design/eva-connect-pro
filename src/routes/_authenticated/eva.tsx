import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askEva } from "@/lib/eva.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/eva")({ component: EvaPage });

type M = { role: "user" | "assistant"; content: string };

function EvaPage() {
  const [messages, setMessages] = useState<M[]>([
    { role: "assistant", content: "Olá, Valéria. Estou pronta para te ajudar. Posso resumir conversas, criar propostas, escrever e-mails, preparar reuniões e sugerir a próxima melhor ação. O que você precisa agora?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ask = useServerFn(askEva);

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(next); setInput(""); setLoading(true);
    try {
      const res = await ask({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.text }]);
    } catch { toast.error("EVA falhou"); }
    finally { setLoading(false); }
  }

  const suggestions = [
    "Resuma minha semana comercial",
    "Escreva um e-mail de follow-up após reunião",
    "Crie uma proposta para uma consultoria Bio Impact",
    "Quais clientes devo priorizar hoje?",
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--petrol)] text-[color:var(--gold)]"><Sparkles className="h-5 w-5" /></div>
        <div><h1 className="text-2xl font-semibold">EVA</h1><p className="text-sm text-muted-foreground">Sua assistente executiva com IA</p></div>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button key={s} onClick={() => setInput(s)} className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary">{s}</button>
        ))}
      </div>

      <Card className="p-4 space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>{m.content}</div>
        ))}
        {loading && <div className="text-xs text-muted-foreground">EVA está pensando…</div>}
      </Card>

      <div className="flex items-end gap-2">
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Escreva para EVA…" rows={2} />
        <Button onClick={send} disabled={loading}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}