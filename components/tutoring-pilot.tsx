"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseClient } from "@/lib/supabase-browser";
import type { UserRole } from "@/lib/roles";

type PilotApplication = {
  application_subject: string;
  application_lesson_format: string;
  application_city: string | null;
  application_description: string;
  application_status: "new" | "contacted" | "matched" | "closed";
  application_updated_at: string;
};

const statusLabels: Record<PilotApplication["application_status"], string> = {
  new: "Zgłoszenie otrzymane",
  contacted: "Skontaktowaliśmy się",
  matched: "Znaleźliśmy dopasowanie",
  closed: "Zgłoszenie zamknięte",
};

export function TutoringPilot({ role }: { role: UserRole }) {
  const [subject, setSubject] = useState("mathematics");
  const [lessonFormat, setLessonFormat] = useState("online");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [application, setApplication] = useState<PilotApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getSupabaseClient().then(async (supabase) => {
      const { data, error: loadError } = await supabase.rpc("get_my_tutoring_pilot_application");
      if (!active) return;
      if (loadError) {
        setError("Nie udało się pobrać zgłoszenia. Odśwież stronę i spróbuj ponownie.");
      } else {
        const existing = (data as PilotApplication[] | null)?.[0] ?? null;
        setApplication(existing);
        if (existing) {
          setSubject(existing.application_subject);
          setLessonFormat(existing.application_lesson_format);
          setCity(existing.application_city ?? "");
          setDescription(existing.application_description);
        }
      }
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setError("Nie udało się połączyć z modułem korepetycji.");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function saveApplication() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = await getSupabaseClient();
      const { error: saveError } = await supabase.rpc("upsert_tutoring_pilot_application", {
        requested_subject: subject,
        requested_lesson_format: lessonFormat,
        requested_city: city,
        requested_description: description,
      });
      if (saveError) throw saveError;
      const { data, error: reloadError } = await supabase.rpc("get_my_tutoring_pilot_application");
      if (reloadError) throw reloadError;
      setApplication((data as PilotApplication[] | null)?.[0] ?? null);
      setMessage("Zgłoszenie zapisane. Damy Ci znać, gdy znajdziemy właściwe dopasowanie.");
    } catch {
      setError("Nie udało się zapisać zgłoszenia. Sprawdź pola i spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  const providesLessons = role === "teacher";

  return (
    <section className="tutoring-pilot-content">
      <header className="tutoring-pilot-hero">
        <span>Pilotaż · dostęp na zaproszenie</span>
        <h1>Korepetycje dopasowane do ucznia.</h1>
        <p>{providesLessons ? "Opisz, czego uczysz i w jakiej formie prowadzisz zajęcia." : "Napisz, jakiego wsparcia szukasz. Na etapie pilotażu dopasowujemy zgłoszenia osobiście."}</p>
      </header>

      <div className="tutoring-pilot-grid">
        <form className="tutoring-pilot-form" onSubmit={(event) => { event.preventDefault(); void saveApplication(); }}>
          <div className="tutoring-form-heading">
            <div><h2>{application ? "Twoje zgłoszenie" : providesLessons ? "Zgłoś ofertę" : "Znajdź korepetytora"}</h2><p>Możesz wrócić i zmienić te informacje.</p></div>
            {application && <span><CheckCircle2 aria-hidden="true" />{statusLabels[application.application_status]}</span>}
          </div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {message && <Alert variant="success"><AlertDescription>{message}</AlertDescription></Alert>}

          <div className="tutoring-field-grid">
            <Label>Przedmiot
              <Select value={subject} onValueChange={setSubject} disabled={loading || busy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mathematics">Matematyka</SelectItem>
                  <SelectItem value="polish">Język polski</SelectItem>
                  <SelectItem value="english">Język angielski</SelectItem>
                  <SelectItem value="other">Inny przedmiot</SelectItem>
                </SelectContent>
              </Select>
            </Label>
            <Label>Forma zajęć
              <Select value={lessonFormat} onValueChange={setLessonFormat} disabled={loading || busy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="stationary">Stacjonarnie</SelectItem>
                  <SelectItem value="either">Bez preferencji</SelectItem>
                </SelectContent>
              </Select>
            </Label>
          </div>
          <Label>Miasto <small>opcjonalnie</small>
            <Input value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} placeholder="np. Warszawa" disabled={loading || busy} />
          </Label>
          <Label>{providesLessons ? "Opisz swoje doświadczenie i dostępność" : "Czego potrzebujesz?"}
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={20} maxLength={1000} required placeholder={providesLessons ? "Napisz krótko, kogo uczysz, jak pracujesz i kiedy masz wolne terminy." : "Napisz krótko, z czym uczeń ma trudność i kiedy może mieć zajęcia."} disabled={loading || busy} />
            <small>{description.length}/1000 · minimum 20 znaków</small>
          </Label>
          <Button type="submit" disabled={loading || busy || description.trim().length < 20}>{busy ? "Zapisuję…" : application ? "Zaktualizuj zgłoszenie" : "Wyślij zgłoszenie"}<ArrowRight aria-hidden="true" /></Button>
        </form>

        <aside className="tutoring-pilot-aside">
          <span>Jak działa pilotaż?</span>
          <ol>
            <li><b>1</b><div><strong>Opisujesz potrzebę</strong><p>Przedmiot, forma zajęć i najważniejsze informacje.</p></div></li>
            <li><b>2</b><div><strong>Sprawdzamy dopasowanie</strong><p>Na początku robimy to ręcznie, aby poznać realne potrzeby.</p></div></li>
            <li><b>3</b><div><strong>Dostajesz kontakt</strong><p>O kolejnych krokach napiszemy na adres przypisany do konta.</p></div></li>
          </ol>
          <p className="tutoring-pilot-note">To zamknięty test nowego modułu, a nie publiczna giełda ogłoszeń. Płatności i prowadzenie lekcji w egzaminio pojawią się po walidacji pilotażu.</p>
        </aside>
      </div>
    </section>
  );
}

