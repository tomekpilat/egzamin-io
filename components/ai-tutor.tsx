"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Lightbulb, RotateCcw, Send, ShieldCheck, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AI_MESSAGE_MAX_LENGTH, normalizeUsage, validateTutorMessage, type AiChatMessage, type AiUsageStatus } from "@/lib/ai-tutor";
import { getSupabaseClient } from "@/lib/supabase-browser";

export type AiTutorFeedback = {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
};

type TutorPayload = {
  messages?: AiChatMessage[];
  message?: AiChatMessage;
  usage?: AiUsageStatus;
  available?: boolean;
  hints?: string[];
  error?: string;
};

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

async function readPayload(response: Response): Promise<TutorPayload> {
  try {
    return await response.json() as TutorPayload;
  } catch {
    return { error: "Serwer pomocy zwrócił nieprawidłową odpowiedź." };
  }
}

function AiTutorConversation({ questionId, feedback }: { questionId: string; feedback: AiTutorFeedback | null }) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [usage, setUsage] = useState<AiUsageStatus>(() => normalizeUsage(0, 3, "free"));
  const [hints, setHints] = useState<string[]>([]);
  const [visibleHintCount, setVisibleHintCount] = useState(0);
  const [available, setAvailable] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadTutor = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await accessToken();
      if (!token) throw new Error("Sesja wygasła. Zaloguj się ponownie.");
      const response = await fetch(`/api/ai/tutor?questionId=${encodeURIComponent(questionId)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      });
      const data = await readPayload(response);
      if (!response.ok) throw new Error(data.error || "Nie udało się uruchomić pomocy AI.");
      setMessages(data.messages ?? []);
      if (data.usage) setUsage(data.usage);
      setHints(data.hints ?? []);
      setAvailable(data.available === true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nie udało się uruchomić pomocy AI.");
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    queueMicrotask(() => void loadTutor());
  }, [loadTutor]);

  async function sendMessage(value = input) {
    if (sending || usage.remaining <= 0 || !available) return;
    const validation = validateTutorMessage(value);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    setSending(true);
    setError("");
    try {
      const token = await accessToken();
      if (!token) throw new Error("Sesja wygasła. Zaloguj się ponownie.");
      const response = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, message: validation.message }),
      });
      const data = await readPayload(response);
      if (data.usage) setUsage(data.usage);
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

  const quickQuestions = feedback
    ? ["Wytłumacz mi to prościej", "Daj mi tylko podpowiedź", "Dlaczego ta odpowiedź jest poprawna?"]
    : ["Daj mi tylko podpowiedź", "Co mam zrobić dalej?", "Wytłumacz mi to prościej"];

  return <Card className="ai-tutor-card" aria-labelledby="ai-tutor-title">
    <CardHeader>
      <div className="ai-tutor-heading"><div className="ai-tutor-icon"><Sparkles aria-hidden="true" /></div><div><CardTitle id="ai-tutor-title">Pomoc do zadania</CardTitle><CardDescription>Najpierw podpowiedzi, potem wyjaśnienie i rozmowa z AI.</CardDescription></div><Badge variant={usage.remaining ? "secondary" : "outline"}>{usage.remaining} z {usage.limit} pytań AI</Badge></div>
    </CardHeader>
    <CardContent className="ai-tutor-content">
      {!feedback && <section className="ai-assistance-section" aria-labelledby="hints-title">
        <div className="ai-assistance-title"><Lightbulb aria-hidden="true" /><b id="hints-title">Podpowiedzi</b></div>
        {loading ? <p className="ai-tutor-loading">Wczytujemy podpowiedzi…</p> : available ? <>
          {visibleHintCount > 0 ? <ol className="ai-hints-list">{hints.slice(0, visibleHintCount).map((hint, index) => <li key={`${index}-${hint}`}>{hint}</li>)}</ol> : <p className="ai-assistance-placeholder">Odkrywaj wskazówki pojedynczo — bez zdradzania całego rozwiązania.</p>}
          {visibleHintCount < hints.length ? <Button type="button" size="sm" variant="outline" onClick={() => setVisibleHintCount((count) => Math.min(count + 1, hints.length))}>{visibleHintCount ? "Pokaż kolejną" : "Pokaż podpowiedź"}</Button> : hints.length > 0 ? <small>To wszystkie podpowiedzi do tego zadania.</small> : null}
        </> : !error ? <p className="ai-assistance-placeholder">Podpowiedzi do tego zadania czekają na zatwierdzenie.</p> : null}
      </section>}

      {feedback && <section className="ai-assistance-section" aria-labelledby="answer-help-title">
        <div className="ai-assistance-title"><CheckCircle2 aria-hidden="true" /><b id="answer-help-title">Odpowiedź</b></div>
        <Alert variant={feedback.isCorrect ? "success" : "warning"} className={`practice-feedback ${feedback.isCorrect ? "is-correct" : "is-incorrect"}`}><AlertTitle>{feedback.isCorrect ? "Dobra odpowiedź!" : "Jeszcze nie tym razem"}</AlertTitle><AlertDescription><b>Poprawna odpowiedź: {feedback.correctAnswer}</b><span>{feedback.explanation}</span></AlertDescription></Alert>
      </section>}

      <section className="ai-assistance-section ai-conversation-section" aria-labelledby="conversation-title">
        <div className="ai-assistance-title"><Sparkles aria-hidden="true" /><div><b id="conversation-title">Zapytaj AI</b><span>Rozmowa dotyczy tylko tego zadania.</span></div></div>
        {loading ? <p className="ai-tutor-loading">Uruchamiamy nauczyciela AI…</p> : error ? <Alert variant="destructive"><AlertDescription><span>{error}</span><Button type="button" size="sm" variant="outline" onClick={() => void loadTutor()}><RotateCcw aria-hidden="true" /> Spróbuj ponownie</Button></AlertDescription></Alert> : !available ? <p className="ai-assistance-placeholder">Rozmowa będzie dostępna po zatwierdzeniu opracowania zadania.</p> : <>
          {messages.length > 0 && <div className="ai-tutor-conversation" aria-live="polite">{messages.map((message) => <TutorMessage key={message.id} message={message} />)}</div>}
          {!messages.length && usage.remaining > 0 && <div className="ai-tutor-quick">{quickQuestions.map((question) => <Button key={question} type="button" variant="outline" size="sm" onClick={() => void sendMessage(question)} disabled={sending}>{question}</Button>)}</div>}
          {usage.remaining > 0 ? <div className="ai-tutor-composer">
            <Textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} maxLength={AI_MESSAGE_MAX_LENGTH} rows={2} placeholder="Np. skąd wziął się ten krok?" aria-label="Pytanie do nauczyciela AI" disabled={sending} />
            <Button type="button" size="icon" aria-label="Wyślij pytanie" onClick={() => void sendMessage()} disabled={sending || input.trim().length < 2}><Send aria-hidden="true" /></Button>
          </div> : <div className="ai-tutor-limit"><div><b>Dzisiejszy limit został wykorzystany</b><span>Nowe pytania będą dostępne jutro.</span></div>{usage.plan === "free" && <Button variant="outline" asChild><a href="/plan-plus#porownanie">Poznaj pakiet Plus</a></Button>}</div>}
        </>}
      </section>
      <p className="ai-tutor-privacy"><ShieldCheck aria-hidden="true" /> Nie wpisuj danych osobowych. AI nie otrzymuje profilu, e-maila ani postępów ucznia.</p>
    </CardContent>
  </Card>;
}

export function AiTutor({ questionId, feedback }: { questionId: string; feedback: AiTutorFeedback | null }) {
  return <AiTutorConversation key={questionId} questionId={questionId} feedback={feedback} />;
}
