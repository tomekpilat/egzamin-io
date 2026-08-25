"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FEEDBACK_CATEGORIES, validateFeedbackInput, type FeedbackCategory } from "@/lib/feedback";
import { getSupabaseClient } from "@/lib/supabase-browser";

export function FeedbackDialog({ userEmail, screenContext }: { userEmail: string; screenContext: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("other");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [contactConsent, setContactConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  function resetForm() {
    setCategory("other");
    setRating(null);
    setMessage("");
    setEmail(userEmail);
    setContactConsent(false);
    setError("");
    setReference("");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && reference) resetForm();
  }

  async function submitFeedback(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const validation = validateFeedbackInput({ category, rating, message, email, contactConsent });
    if (!validation.valid) {
      setError(Object.values(validation.errors)[0] ?? "Sprawdź formularz i spróbuj ponownie.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = await getSupabaseClient();
      const { data, error: submitError } = await supabase.rpc("submit_user_feedback", {
        feedback_category: category,
        feedback_rating: rating,
        feedback_message: message.trim(),
        feedback_contact_email: email.trim() || null,
        feedback_contact_consent: contactConsent,
        feedback_page_path: window.location.pathname,
        feedback_screen_context: screenContext,
        target_question_id: null,
      });
      if (submitError) throw submitError;
      const row = (data as { feedback_reference: string }[] | null)?.[0];
      if (!row?.feedback_reference) throw new Error("missing_feedback_reference");
      setReference(row.feedback_reference);
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : String(caught);
      setError(text.includes("rate limit") ? "Wysłano już 3 zgłoszenia w ciągu 10 minut. Spróbuj ponownie później." : "Nie udało się wysłać opinii. Treść pozostała w formularzu — spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild><Button type="button" variant="outline" className="dashboard-feedback-trigger"><MessageSquarePlus aria-hidden="true" /><span>Feedback</span></Button></DialogTrigger>
      <DialogContent className="feedback-dialog">
        {reference ? <div className="feedback-success" role="status">
          <span aria-hidden="true">✓</span>
          <DialogHeader><DialogTitle>Dziękujemy za opinię</DialogTitle><DialogDescription>Zgłoszenie zostało bezpiecznie zapisane. Numer: <code>{reference.slice(0, 8)}</code></DialogDescription></DialogHeader>
          <Button type="button" onClick={() => handleOpenChange(false)}>Gotowe</Button>
        </div> : <form onSubmit={(event) => void submitFeedback(event)}>
          <DialogHeader><DialogTitle>Powiedz nam, co poprawić</DialogTitle><DialogDescription>Krótka wiadomość wystarczy. Nie wysyłaj danych wrażliwych ani treści prywatnych rozmów z AI.</DialogDescription></DialogHeader>
          <div className="feedback-form-fields">
            <Label htmlFor="feedback-category">Rodzaj zgłoszenia</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as FeedbackCategory)}>
              <SelectTrigger id="feedback-category"><SelectValue /></SelectTrigger>
              <SelectContent>{FEEDBACK_CATEGORIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>

            <fieldset className="feedback-rating"><legend>Ocena aplikacji <span>(opcjonalnie)</span></legend><div>{[1, 2, 3, 4, 5].map((value) => <Button key={value} type="button" size="icon" variant={rating === value ? "default" : "outline"} aria-label={`Ocena ${value} z 5`} aria-pressed={rating === value} onClick={() => setRating(rating === value ? null : value)}>{value}</Button>)}</div></fieldset>

            <Label htmlFor="feedback-message">Wiadomość</Label>
            <Textarea id="feedback-message" required minLength={20} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Co zadziałało albo co powinniśmy poprawić?" />
            <small className="feedback-character-count">{message.length}/2000</small>

            <Label htmlFor="feedback-email">E-mail do odpowiedzi <span>(opcjonalnie)</span></Label>
            <Input id="feedback-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <div className="feedback-contact-consent"><Checkbox id="feedback-contact-consent" checked={contactConsent} onCheckedChange={(value) => setContactConsent(value === true)} /><Label htmlFor="feedback-contact-consent">Zgadzam się na kontakt w sprawie tego zgłoszenia.</Label></div>
            <p className="feedback-privacy-note">Do zgłoszenia dołączamy rolę konta i nazwę bieżącego ekranu. <a href="/polityka-prywatnosci#feedback">Jak przetwarzamy feedback?</a></p>
            {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
          </div>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Anuluj</Button><Button type="submit" disabled={submitting}>{submitting ? "Wysyłam…" : "Wyślij opinię"}</Button></DialogFooter>
        </form>}
      </DialogContent>
    </Dialog>
  );
}
