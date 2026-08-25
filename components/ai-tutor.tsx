"use client";

import { useEffect, useRef, useState } from "react";
import { Send, ShieldCheck, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AI_MESSAGE_MAX_LENGTH, normalizeUsage, validateTutorMessage, type AiChatMessage, type AiUsageStatus } from "@/lib/ai-tutor";
import { getSupabaseClient } from "@/lib/supabase-browser";

const quickQuestions = ["Wytłumacz mi to prościej", "Daj mi tylko podpowiedź", "Dlaczego ta odpowiedź jest poprawna?"];

function TutorMessage({ message }: { message: AiChatMessage }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const typeset = () => {
      if (!ref.current || !window.MathJax?.typesetPromise) return;
      window.MathJax.typesetClear?.([ref.current]);
      void window.MathJax.typesetPromise([ref.current]);
    };
    typeset();
    window.addEventListener("mathjax-ready", typeset);
    return () => window.removeEventListener("mathjax-ready", typeset);
  }, [message.content]);

  return <div className={`ai-tutor-message ${message.role}`}><span>{message.role === "assistant" ? "AI" : "Ty"}</span><p ref={ref} className="mathjax_process">{message.content}</p></div>;
}

async function accessToken() {
  const supabase = await getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

function AiTutorConversation({ questionId }: { questionId: string }) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [usage, setUsage] = useState<AiUsageStatus>(() => normalizeUsage(0, 3, "free"));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    accessToken()
      .then(async (token) => {
        if (!token) throw new Error("missing_session");
        const response = await fetch(`/api/ai/tutor?questionId=${encodeURIComponent(questionId)}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
        });
        const data = await response.json() as { messages?: AiChatMessage[]; usage?: AiUsageStatus; error?: string };
        if (!response.ok) throw new Error(data.error || "chat_unavailable");
        if (active) {
          setMessages(data.messages ?? []);
          if (data.usage) setUsage(data.usage);
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error && loadError.message !== "chat_unavailable" ? loadError.message : "Nie udało się pobrać rozmowy.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [questionId]);

  async function sendMessage(value = input) {
    if (sending || usage.remaining <= 0) return;
    const validation = validateTutorMessage(value);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    setSending(true);
    setError("");
    try {
      const token = await accessToken();
      if (!token) throw new Error("Zaloguj się ponownie.");
      const response = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, message: validation.message }),
      });
      const data = await response.json() as { message?: AiChatMessage; messages?: AiChatMessage[]; usage?: AiUsageStatus; error?: string };
      if (data.usage) setUsage(data.usage);
      if (data.messages) setMessages(data.messages);
      if (!response.ok || !data.message) throw new Error(data.error || "AI nie odpowiedziało. Spróbuj ponownie.");
      const userMessage: AiChatMessage = { id: `${data.message.id}-user`, role: "user", content: validation.message, created_at: data.message.created_at };
      setMessages((current) => [...current, userMessage, data.message!]);
      setInput("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "AI nie odpowiedziało. Spróbuj ponownie.");
    } finally {
      setSending(false);
    }
  }

  return <Card className="ai-tutor-card" aria-labelledby="ai-tutor-title">
    <CardHeader>
      <div className="ai-tutor-heading"><div className="ai-tutor-icon"><Sparkles aria-hidden="true" /></div><div><CardTitle id="ai-tutor-title">Dopytaj nauczyciela AI</CardTitle><CardDescription>Podpowie kolejny krok i wyjaśni to inaczej — w kontekście tego zadania.</CardDescription></div><Badge variant={usage.remaining ? "secondary" : "outline"}>{usage.remaining} z {usage.limit} pytań</Badge></div>
    </CardHeader>
    <CardContent className="ai-tutor-content">
      {loading ? <p className="ai-tutor-loading">Wczytujemy rozmowę…</p> : <>
        {messages.length > 0 && <div className="ai-tutor-conversation" aria-live="polite">{messages.map((message) => <TutorMessage key={message.id} message={message} />)}</div>}
        {!messages.length && usage.remaining > 0 && <div className="ai-tutor-quick">{quickQuestions.map((question) => <Button key={question} type="button" variant="outline" size="sm" onClick={() => void sendMessage(question)} disabled={sending}>{question}</Button>)}</div>}
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {usage.remaining > 0 ? <div className="ai-tutor-composer">
          <Textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} maxLength={AI_MESSAGE_MAX_LENGTH} rows={2} placeholder="Np. skąd wziął się ten krok?" aria-label="Pytanie do nauczyciela AI" disabled={sending} />
          <Button type="button" size="icon" aria-label="Wyślij pytanie" onClick={() => void sendMessage()} disabled={sending || input.trim().length < 2}><Send aria-hidden="true" /></Button>
        </div> : <div className="ai-tutor-limit"><div><b>Dzisiejszy limit został wykorzystany</b><span>Nowe pytania będą dostępne jutro.</span></div>{usage.plan === "free" && <Button variant="outline" asChild><a href="/plan-plus#porownanie">Poznaj plan Plus</a></Button>}</div>}
        <p className="ai-tutor-privacy"><ShieldCheck aria-hidden="true" /> Nie wpisuj danych osobowych. Do modelu nie wysyłamy profilu, e-maila ani postępów ucznia.</p>
      </>}
    </CardContent>
  </Card>;
}

export function AiTutor({ questionId }: { questionId: string }) {
  return <AiTutorConversation key={questionId} questionId={questionId} />;
}
