"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

  return <div className={`task-chat-message ${message.role}`}><span>{message.role === "assistant" ? "Tutor" : "Ty"}</span><p ref={ref} className="mathjax_process">{message.content}</p></div>;
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
}: {
  questionId: string;
  feedback: AiTutorFeedback | null;
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
  const hasFeedback = Boolean(feedback);

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

  useEffect(() => {
    if (hasFeedback) queueMicrotask(() => setActiveTab("solution"));
  }, [hasFeedback]);

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

  const displayedTab: TutorTab = !feedback && activeTab === "solution"
      ? "hints"
      : activeTab;
  const solutionSteps = feedback?.explanation
    .split(/(?<=[.!?])\s+/)
    .map((step) => step.trim())
    .filter(Boolean) ?? [];

  return <section className="task-help-panel" aria-label="Pomoc do zadania" data-conversation-active={messages.length > 0 ? "true" : "false"}>
    <div className="task-help-tabs" role="tablist" aria-label="Rodzaj pomocy">
      <button type="button" role="tab" aria-selected={displayedTab === "hints"} onClick={() => setActiveTab("hints")}>Wskazówki</button>
      <button type="button" role="tab" aria-selected={displayedTab === "solution"} onClick={() => setActiveTab("solution")} disabled={!feedback}>Rozwiązanie</button>
      <button type="button" role="tab" aria-selected={displayedTab === "ai"} onClick={() => setActiveTab("ai")}>Tutor AI</button>
    </div>
    <div className="task-help-content">
      {displayedTab === "hints" && !feedback && <section className="task-help-view task-hints" aria-labelledby="hints-title">
        <p className="task-help-intro">Pomoc otwiera się po kolei. Rozwiązanie zobaczysz po sprawdzeniu odpowiedzi.</p>
        <b id="hints-title" className="sr-only">Podpowiedzi</b>
        {loading ? <div className="task-help-loading" aria-label="Wczytujemy podpowiedzi"><span /><span /><span /></div> : error ? <Alert variant="destructive"><AlertDescription><span>{error}</span><Button type="button" size="sm" variant="outline" onClick={() => void loadTutor()}><RotateCcw aria-hidden="true" /> Spróbuj ponownie</Button></AlertDescription></Alert> : available ? <>
          {visibleHintCount > 0 ? <ol className="task-hint-list">{hints.slice(0, visibleHintCount).map((hint, index) => <li key={`${index}-${hint}`}><div><span>{index + 1}</span><b>{index === 0 ? "Mała wskazówka" : index === 1 ? "Kolejny krok" : "Prostszy przykład"}</b></div><p>{hint}</p></li>)}</ol> : <p className="task-help-placeholder">Odkrywaj wskazówki pojedynczo — bez zdradzania całego rozwiązania.</p>}
          {visibleHintCount < hints.length ? <div className="task-hint-buttons" aria-label="Pokaż podpowiedź">{hints.slice(visibleHintCount).map((_hint, offset) => {
            const index = visibleHintCount + offset;
            const isNext = offset === 0;
            return <Button key={index} type="button" variant="outline" onClick={() => setVisibleHintCount(index + 1)} disabled={!isNext}><span><b>{index + 1}</b>{index === 1 ? "Wyjaśnij kolejny krok" : "Prostszy przykład"}</span><em>{isNext ? "Pokaż" : "Po kolei"}</em></Button>;
          })}</div> : hints.length > 0 ? <small>To wszystkie podpowiedzi do tego zadania.</small> : <p className="task-help-placeholder">Nie ma jeszcze podpowiedzi do tego zadania.</p>}
        </> : <p className="task-help-placeholder">Podpowiedzi do tego zadania czekają na zatwierdzenie.</p>}
        {!loading && available && <button type="button" className="task-tutor-launch" onClick={() => setActiveTab("ai")}><span><b>Zapytaj tutora AI</b><small>Zostały {usage.remaining} z {usage.limit} pytań dziś</small></span><span>Napisz, czego nie rozumiesz w tym zadaniu… <b>↑</b></span><small>Tutor odpowiada tylko na pytania o to zadanie. Rodzic nie widzi treści rozmowy.</small></button>}
      </section>}

      {displayedTab === "solution" && feedback && <section className="task-help-view task-solution" aria-labelledby="answer-help-title">
        <div className="task-solution-heading"><b id="answer-help-title">Rozwiązanie krok po kroku</b><span>{Math.max(solutionSteps.length, 1)} {solutionSteps.length === 1 ? "krok" : "kroki"}</span></div>
        <ol>{(solutionSteps.length ? solutionSteps : [feedback.explanation]).map((step, index) => <li key={`${index}-${step}`}><span>{index + 1}</span><div><b>{index === 0 ? "Zobacz sposób rozwiązania" : "Kolejny krok"}</b><p className="mathjax_process">{step}</p></div></li>)}</ol>
        <div className="task-solution-answer"><span>ODPOWIEDŹ</span><b>{feedback.correctAnswer}</b></div>
        <button type="button" className="task-solution-tutor" onClick={() => setActiveTab("ai")}>Zapytaj tutora o to rozwiązanie →</button>
      </section>}

      {displayedTab === "ai" && <section className="task-help-view task-conversation" aria-labelledby="conversation-title">
        <div className="task-conversation-heading"><b id="conversation-title">Tutor AI</b><small>Zostały {usage.remaining} z {usage.limit} pytań dziś</small></div>
        {loading ? <p className="task-help-loading">Uruchamiamy nauczyciela AI…</p> : error ? <Alert variant="destructive"><AlertDescription><span>{error}</span><Button type="button" size="sm" variant="outline" onClick={() => void loadTutor()}><RotateCcw aria-hidden="true" /> Spróbuj ponownie</Button></AlertDescription></Alert> : !available ? <p className="task-help-placeholder">Rozmowa będzie dostępna po zatwierdzeniu opracowania zadania.</p> : <>
          {messages.length > 0 && <div ref={conversationRef} className="task-chat" role="log" aria-label="Rozmowa z nauczycielem AI" aria-live="polite">{messages.map((message) => <TutorMessage key={message.id} message={message} />)}</div>}
          {usage.remaining > 0 ? <div className="task-chat-entry"><div className="task-chat-composer">
            <Textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} maxLength={AI_MESSAGE_MAX_LENGTH} rows={1} placeholder="Napisz, czego nie rozumiesz w tym zadaniu…" aria-label="Pytanie do nauczyciela AI" disabled={sending} />
            <button type="button" aria-label="Wyślij pytanie" onClick={() => void sendMessage()} disabled={sending || input.trim().length < 2}>↑</button>
          </div><p className="task-tutor-privacy">Tutor odpowiada tylko na pytania o to zadanie. Rodzic nie widzi treści rozmowy.<span className="sr-only"> Nie wpisuj danych osobowych.</span></p></div> : <div className="task-tutor-limit"><div><b>Dzisiejszy limit został wykorzystany</b><span>Nowe pytania będą dostępne jutro.</span></div>{usage.plan === "free" && <Button variant="outline" asChild><a href="/plan-plus#porownanie">Poznaj pakiet Plus</a></Button>}</div>}
        </>}
      </section>}
    </div>
  </section>;
}

export function AiTutor({
  questionId,
  feedback,
}: {
  questionId: string;
  feedback: AiTutorFeedback | null;
}) {
  return <AiTutorConversation key={questionId} questionId={questionId} feedback={feedback} />;
}
