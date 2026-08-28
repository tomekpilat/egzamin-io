"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type TutorTab = "hints" | "solution" | "ai";

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

function AiTutorConversation({
  questionId,
  feedback,
  onNext,
  canGoNext,
}: {
  questionId: string;
  feedback: AiTutorFeedback | null;
  onNext?: () => void;
  canGoNext: boolean;
}) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [usage, setUsage] = useState<AiUsageStatus>(() => normalizeUsage(0, 3, "free"));
  const [hints, setHints] = useState<string[]>([]);
  const [visibleHintCount, setVisibleHintCount] = useState(0);
  const [available, setAvailable] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TutorTab>(feedback ? "solution" : "hints");
  const conversationRef = useRef<HTMLDivElement>(null);

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
      const nextHints = data.hints ?? [];
      setHints(nextHints);
      setVisibleHintCount(nextHints.length ? 1 : 0);
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

  useEffect(() => {
    if (!conversationRef.current) return;
    conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
  }, [messages]);

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
  const displayedTab: TutorTab = feedback && activeTab === "hints"
    ? "solution"
    : !feedback && activeTab === "solution"
      ? "hints"
      : activeTab;

  return <Card className="ai-tutor-card" aria-label="Pomoc do zadania" data-conversation-active={messages.length > 0 ? "true" : "false"}>
    <div className="ai-tutor-tabs" role="tablist" aria-label="Rodzaj pomocy" data-has-feedback={feedback ? "true" : "false"}>
      {!feedback && <button type="button" role="tab" aria-selected={displayedTab === "hints"} onClick={() => setActiveTab("hints")}>Wskazówki</button>}
      <button type="button" role="tab" aria-selected={displayedTab === "solution"} onClick={() => setActiveTab("solution")} disabled={!feedback}>Rozwiązanie</button>
      <button type="button" role="tab" aria-selected={displayedTab === "ai"} onClick={() => setActiveTab("ai")}>Tutor AI</button>
    </div>
    <CardContent className="ai-tutor-content">
      {displayedTab === "hints" && !feedback && <section className="ai-assistance-section" aria-labelledby="hints-title">
        <p className="ai-panel-intro">Pomoc otwiera się po kolei. Rozwiązanie zobaczysz po sprawdzeniu odpowiedzi.</p>
        <b id="hints-title" className="sr-only">Podpowiedzi</b>
        {loading ? <div className="ai-tutor-loading" aria-label="Wczytujemy podpowiedzi"><span /><span /><span /></div> : error ? <Alert variant="destructive"><AlertDescription><span>{error}</span><Button type="button" size="sm" variant="outline" onClick={() => void loadTutor()}><RotateCcw aria-hidden="true" /> Spróbuj ponownie</Button></AlertDescription></Alert> : available ? <>
          {visibleHintCount > 0 ? <ol className="ai-hints-list">{hints.slice(0, visibleHintCount).map((hint, index) => <li key={`${index}-${hint}`}><span>{index + 1}</span><div><b>{index === 0 ? "Mała wskazówka" : index === 1 ? "Kolejny krok" : "Prostszy przykład"}</b><p>{hint}</p></div></li>)}</ol> : <p className="ai-assistance-placeholder">Odkrywaj wskazówki pojedynczo — bez zdradzania całego rozwiązania.</p>}
          {visibleHintCount < hints.length ? <div className="ai-hint-steps" aria-label="Pokaż podpowiedź">{hints.slice(visibleHintCount).map((_hint, offset) => {
            const index = visibleHintCount + offset;
            const isNext = offset === 0;
            return <Button key={index} type="button" variant="outline" onClick={() => setVisibleHintCount(index + 1)} disabled={!isNext}><span><b>{index + 1}</b>{index === 1 ? "Wyjaśnij kolejny krok" : "Prostszy przykład"}</span><em>{isNext ? "Pokaż" : "Po kolei"}</em></Button>;
          })}</div> : hints.length > 0 ? <small>To wszystkie podpowiedzi do tego zadania.</small> : <p className="ai-assistance-placeholder">Nie ma jeszcze podpowiedzi do tego zadania.</p>}
        </> : <p className="ai-assistance-placeholder">Podpowiedzi do tego zadania czekają na zatwierdzenie.</p>}
        {!loading && available && <button type="button" className="ai-tutor-launch" onClick={() => setActiveTab("ai")}><span><b>Zapytaj tutora AI</b><small>{usage.remaining} z {usage.limit} pytań AI</small></span><span>Napisz, czego nie rozumiesz w tym zadaniu… <b>↑</b></span><small>Tutor odpowiada tylko na pytania o to zadanie. Rodzic nie widzi treści rozmowy.</small></button>}
      </section>}

      {displayedTab === "solution" && feedback && <section className="ai-assistance-section" aria-labelledby="answer-help-title">
        <b id="answer-help-title" className="sr-only">Rozwiązanie</b>
        <Alert variant={feedback.isCorrect ? "success" : "warning"} className={`practice-feedback ${feedback.isCorrect ? "is-correct" : "is-incorrect"}`}><AlertTitle>{feedback.isCorrect ? "Dobra odpowiedź!" : "Jeszcze nie tym razem"}</AlertTitle><AlertDescription><b>Poprawna odpowiedź: {feedback.correctAnswer}</b><span>{feedback.explanation}</span></AlertDescription></Alert>
        <div className="ai-solution-actions">
          <Button type="button" variant="outline" onClick={() => setActiveTab("ai")}>Zapytaj tutora</Button>
          <Button type="button" onClick={onNext} disabled={!canGoNext}>Następne zadanie</Button>
        </div>
      </section>}

      {displayedTab === "ai" && <section className="ai-assistance-section ai-conversation-section" aria-labelledby="conversation-title">
        <div className="ai-conversation-heading"><div><b id="conversation-title">Zapytaj tutora AI</b><span>Rozmowa dotyczy tylko tego zadania.</span></div><small>{usage.remaining} z {usage.limit} pytań AI</small></div>
        {loading ? <p className="ai-tutor-loading">Uruchamiamy nauczyciela AI…</p> : error ? <Alert variant="destructive"><AlertDescription><span>{error}</span><Button type="button" size="sm" variant="outline" onClick={() => void loadTutor()}><RotateCcw aria-hidden="true" /> Spróbuj ponownie</Button></AlertDescription></Alert> : !available ? <p className="ai-assistance-placeholder">Rozmowa będzie dostępna po zatwierdzeniu opracowania zadania.</p> : <>
          {messages.length > 0 && <div ref={conversationRef} className="ai-tutor-conversation" role="log" aria-label="Rozmowa z nauczycielem AI" aria-live="polite">{messages.map((message) => <TutorMessage key={message.id} message={message} />)}</div>}
          {!messages.length && usage.remaining > 0 && <div className="ai-tutor-quick">{quickQuestions.map((question) => <Button key={question} type="button" variant="outline" size="sm" onClick={() => void sendMessage(question)} disabled={sending}>{question}</Button>)}</div>}
          {usage.remaining > 0 ? <div className="ai-tutor-composer">
            <Textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} maxLength={AI_MESSAGE_MAX_LENGTH} rows={3} placeholder="Napisz, czego nie rozumiesz w tym zadaniu…" aria-label="Pytanie do nauczyciela AI" disabled={sending} />
            <Button type="button" size="icon" aria-label="Wyślij pytanie" onClick={() => void sendMessage()} disabled={sending || input.trim().length < 2}><Send aria-hidden="true" /></Button>
          </div> : <div className="ai-tutor-limit"><div><b>Dzisiejszy limit został wykorzystany</b><span>Nowe pytania będą dostępne jutro.</span></div>{usage.plan === "free" && <Button variant="outline" asChild><a href="/plan-plus#porownanie">Poznaj pakiet Plus</a></Button>}</div>}
        </>}
        <p className="ai-tutor-privacy">Nie wpisuj danych osobowych. Rodzic nie widzi treści rozmowy.</p>
      </section>}
    </CardContent>
  </Card>;
}

export function AiTutor({
  questionId,
  feedback,
  onNext,
  canGoNext = false,
}: {
  questionId: string;
  feedback: AiTutorFeedback | null;
  onNext?: () => void;
  canGoNext?: boolean;
}) {
  return <AiTutorConversation key={questionId} questionId={questionId} feedback={feedback} onNext={onNext} canGoNext={canGoNext} />;
}
