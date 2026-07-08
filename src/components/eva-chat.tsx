import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askEva } from "@/lib/eva.functions";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

export function EvaChat({ context, initialOpen = false }: { context?: string; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Olá, Valéria 👋 Sou a EVA. Como posso te ajudar agora?" },
  ]);
  const ask = useServerFn(askEva);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({ data: { messages: next, context } });
      setMessages([...next, { role: "assistant", content: res.text }]);
    } catch (e) {
      toast.error("EVA não conseguiu responder. Verifique a conexão.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-[0_10px_30px_-12px_rgba(31,78,95,0.4)] hover:brightness-110 transition"
      >
        <Sparkles className="h-4 w-4 text-[color:var(--gold)]" />
        <span className="text-sm font-medium">Pergunte à EVA</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[540px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b bg-[color:var(--petrol)] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[color:var(--gold)]" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">EVA</div>
            <div className="text-[11px] opacity-70">Assistente executiva</div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground">EVA está pensando…</div>}
      </div>
      <div className="border-t bg-background p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Pergunte algo à EVA…"
            className="min-h-[44px] resize-none"
          />
          <Button size="icon" onClick={send} disabled={loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}