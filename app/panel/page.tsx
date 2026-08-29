"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { BookOpen, ChartNoAxesColumnIncreasing, CircleHelp, CreditCard, LayoutDashboard, LogOut, Settings as SettingsIcon, UserPlus, Users } from "lucide-react";
import { AccountMenuTrigger } from "@/components/account-menu-trigger";
import { BrandLogo } from "@/components/brand-logo";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { ParentPayments } from "@/components/parent-payments";
import { AdminPromoCodes } from "@/components/admin-promo-codes";
import { ParentProgress } from "@/components/parent-progress";
import { StudentPractice, type StudentView } from "@/components/student-practice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeSettings } from "@/components/theme-settings";
import { isUserRole, roleLabels, type UserRole } from "@/lib/roles";
import { normalizeWeeklyGoal, summarizeParentPreferences } from "@/lib/parent-preferences";
import { getSupabaseClient } from "@/lib/supabase-browser";
import { LEGAL_VERSION } from "@/lib/legal";
import { FEEDBACK_CATEGORIES, feedbackStatusLabels, type FeedbackStatus } from "@/lib/feedback";
import { resolveAccountRoute } from "@/lib/account-routing";

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  onboarding_completed: boolean;
  legal_version: string | null;
  guardian_email: string | null;
  guardian_consent_at: string | null;
  teacher_verification_status: "not_required" | "pending" | "verified" | "rejected";
  plan_tier: "free" | "plus";
  plan_valid_until: string | null;
};

type GuardianRequest = { request_id: string; student_id: string; student_display_name: string | null; student_email: string; requested_at: string; expires_at: string };
type LinkedChild = { student_id: string; student_display_name: string | null; student_email: string; linked_at: string; weekly_goal: number; summary_email_enabled: boolean; plan_tier: "free" | "plus"; plan_valid_until: string | null };
type ParentView = "start" | "progress" | "children" | "connect" | "payments" | "settings";

type RoleCounts = Record<UserRole, number>;
type AdminFeedback = {
  feedback_id: string;
  feedback_user_id: string;
  feedback_user_role: UserRole;
  feedback_category: string;
  feedback_rating: number | null;
  feedback_message: string;
  feedback_contact_email: string | null;
  feedback_question_id: string | null;
  feedback_exam_paper_id: string | null;
  feedback_page_path: string;
  feedback_screen_context: string;
  feedback_status: FeedbackStatus;
  feedback_created_at: string;
};

function AccountMenu({ displayName, email, className = "", triggerClassName = "dashboard-session", onSettings, onSignOut }: { displayName: string; email: string; className?: string; triggerClassName?: string; onSettings: () => void; onSignOut: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AccountMenuTrigger displayName={displayName} email={email} className={`${triggerClassName} ${className}`.trim()} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="dashboard-account-menu">
        <DropdownMenuLabel>{email}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onSettings}><SettingsIcon aria-hidden="true" /> Ustawienia</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="dashboard-signout-item" onSelect={onSignOut}><LogOut aria-hidden="true" /> Wyloguj się</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DashboardLegalNav() {
  return <nav className="dashboard-sidebar-legal" aria-label="Dokumenty i prywatność">
    <a href="/regulamin">Regulamin</a>
    <a href="/polityka-prywatnosci">Polityka prywatności</a>
    <a href="/polityka-cookies">Pliki cookie</a>
    <a href="/bezpieczenstwo-dzieci-ai">Dzieci i AI</a>
  </nav>;
}

const emptyCounts: RoleCounts = {
  student: 0,
  parent: 0,
  teacher: 0,
  admin: 0,
};

function ChildSettingsCard({ child, busy, onSave }: { child: LinkedChild; busy: boolean; onSave: (studentId: string, weeklyGoal: number) => void }) {
  const [weeklyGoal, setWeeklyGoal] = useState(child.weekly_goal);
  const childName = child.student_display_name || "Uczeń";
  const weeklyGoalOptions = Array.from(new Set([weeklyGoal, 3, 4, 5, 6, 7])).sort((left, right) => left - right);

  return (
    <Card className="child-settings-card">
      <CardHeader>
        <div className="child-card-title-row">
          <div className="guardian-avatar">{(child.student_display_name || child.student_email).slice(0, 2).toUpperCase()}</div>
          <div><CardTitle>{childName}</CardTitle><CardDescription>{child.student_email}</CardDescription></div>
          <Badge variant="outline">Zgoda aktywna</Badge>
        </div>
      </CardHeader>
      <CardContent className="child-settings-content">
        <div className="goal-overview"><div><b>Cel tygodniowy</b><span>{weeklyGoal} {weeklyGoal === 1 ? "sesja" : "sesji"} nauki</span></div></div>
        <div className="parent-weekly-setting">
          <Label htmlFor={`goal-${child.student_id}`}>Liczba sesji w tygodniu</Label>
          <Select value={String(weeklyGoal)} onValueChange={(value) => setWeeklyGoal(normalizeWeeklyGoal(value))}>
            <SelectTrigger id={`goal-${child.student_id}`}><SelectValue /></SelectTrigger>
            <SelectContent>{weeklyGoalOptions.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="child-settings-actions"><Button type="button" onClick={() => onSave(child.student_id, weeklyGoal)} disabled={busy}>{busy ? "Zapisuję…" : "Zapisz ustawienia"}</Button></div>
      </CardContent>
    </Card>
  );
}

function ParentPanel({ activeView, parentEmail, requests, linkedChildren, actionBusy, onNavigate, onApprove, onReject, onSavePreferences }: { activeView: ParentView; parentEmail: string; requests: GuardianRequest[]; linkedChildren: LinkedChild[]; actionBusy: string; onNavigate: (view: ParentView) => void; onApprove: (id: string) => void; onReject: (id: string) => void; onSavePreferences: (studentId: string, weeklyGoal: number) => void }) {
  const { totalWeeklyGoal } = summarizeParentPreferences(linkedChildren);
  const [inviteStatus, setInviteStatus] = useState("");
  const invitePath = "/logowanie?tryb=rejestracja&rola=uczen";
  const publicInviteUrl = `https://egzamin.io${invitePath}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${invitePath}`);
      setInviteStatus("Link skopiowany. Wyślij go dziecku.");
    } catch {
      setInviteStatus("Nie udało się skopiować. Skorzystaj z przycisku e-mail.");
    }
  }

  async function copyGuardianEmail() {
    try {
      await navigator.clipboard.writeText(parentEmail);
      setInviteStatus("E-mail opiekuna skopiowany.");
    } catch {
      setInviteStatus("Nie udało się skopiować. Skorzystaj z przycisku e-mail.");
    }
  }

  return (
    <>
      {activeView === "start" && <section className="parent-content-view parent-overview-view" aria-labelledby="parent-overview-title">
        <div className="dashboard-view-heading parent-overview-heading"><div><h2 id="parent-overview-title">Przegląd</h2><small>Połączone konta, zgody i najważniejsze informacje</small></div><Button variant="outline" type="button" onClick={() => onNavigate("progress")}>Zobacz pełny postęp</Button></div>
        {requests.length > 0 && <section className="guardian-requests parent-next-step" aria-labelledby="guardian-requests-title">
          <div className="guardian-section-heading"><div><span className="parent-next-step-label">Następny krok</span><h3 id="guardian-requests-title">Zatwierdź konto dziecka, żeby mogło zacząć naukę</h3></div><small>Sprawdź tożsamość dziecka poza serwisem.</small></div>
          {requests.map((request) => <article className="guardian-request-card" key={request.request_id}>
            <div className="guardian-avatar">{(request.student_display_name || request.student_email).slice(0, 2).toUpperCase()}</div>
            <div><b>{request.student_display_name || "Uczeń"}</b><span>{request.student_email}</span><small>Prośba z {new Date(request.requested_at).toLocaleDateString("pl-PL")}</small></div>
            <div className="guardian-request-actions"><Button size="sm" onClick={() => onApprove(request.request_id)} disabled={Boolean(actionBusy)}>Zatwierdź</Button><Button size="sm" variant="outline" onClick={() => onReject(request.request_id)} disabled={Boolean(actionBusy)}>Odrzuć</Button></div>
          </article>)}
        </section>}
        <section className="dashboard-grid three-columns parent-overview-metrics">
          <article className="metric-card"><span>Połączone konta</span><b>{linkedChildren.length}</b><small>Wyłącznie po zatwierdzonej prośbie.</small></article>
          <article className="metric-card"><span>Cel tygodniowy</span><b>{totalWeeklyGoal || "—"}</b><small>Łączna liczba zaplanowanych sesji.</small></article>
          <article className="metric-card"><span>Prośby o zgodę</span><b>{requests.length}</b><small>{requests.length ? "Czekają na Twoją decyzję." : "Brak oczekujących próśb."}</small></article>
        </section>
        <section className="dashboard-card parent-overview-children">
          <div className="guardian-section-heading"><div><h3>Podłączone dzieci</h3><small>Postęp, cel tygodniowy i dostęp Plus ustawiasz osobno.</small></div><Button variant="outline" size="sm" type="button" onClick={() => onNavigate("connect")}>Podłącz kolejne</Button></div>
          {linkedChildren.length ? <div className="parent-overview-child-list">{linkedChildren.map((child) => <button type="button" key={child.student_id} onClick={() => onNavigate("progress")}><span className="guardian-avatar">{(child.student_display_name || child.student_email).slice(0, 2).toUpperCase()}</span><span><b>{child.student_display_name || "Uczeń"}</b><small>{child.student_email}</small></span><Badge variant={child.plan_tier === "plus" ? "secondary" : "outline"}>{child.plan_tier === "plus" ? "Plus aktywny" : "Plan Free"}</Badge><em>Postęp</em></button>)}</div> : <div className="parent-overview-empty"><p>Nie ma jeszcze połączonych kont dzieci.</p><Button type="button" onClick={() => onNavigate("connect")}>Połącz konto dziecka</Button></div>}
        </section>
        <p className="parent-overview-privacy">Nie pokazujemy treści rozmów dziecka z tutorem AI. Widzisz liczby, tematy, wykorzystanie AI i regularność nauki.</p>
      </section>}

      {activeView === "children" && <section className="parent-content-view parent-children-view" aria-labelledby="parent-children-title">
        <div className="dashboard-view-heading"><div><h2 id="parent-children-title">Dzieci</h2><small>Połączone konta i indywidualne ustawienia nauki</small></div><Button type="button" onClick={() => onNavigate("connect")}>Dodaj dziecko</Button></div>
        {requests.length > 0 && <section className="guardian-requests" aria-labelledby="children-requests-title">
          <div className="guardian-section-heading"><div><Badge variant="secondary">Wymaga decyzji</Badge><h3 id="children-requests-title">Prośby o zgodę opiekuna</h3></div><small>Sprawdź tożsamość dziecka poza serwisem przed zatwierdzeniem.</small></div>
          {requests.map((request) => <article className="guardian-request-card" key={request.request_id}>
            <div className="guardian-avatar">{(request.student_display_name || request.student_email).slice(0, 2).toUpperCase()}</div>
            <div><b>{request.student_display_name || "Uczeń"}</b><span>{request.student_email}</span><small>Prośba z {new Date(request.requested_at).toLocaleDateString("pl-PL")}</small></div>
            <div className="guardian-request-actions"><Button size="sm" onClick={() => onApprove(request.request_id)} disabled={Boolean(actionBusy)}>Zatwierdź</Button><Button size="sm" variant="outline" onClick={() => onReject(request.request_id)} disabled={Boolean(actionBusy)}>Odrzuć</Button></div>
          </article>)}
        </section>}
        {linkedChildren.length > 0 ? <section className="linked-children"><div className="guardian-section-heading"><div><Badge variant="secondary">Ustawienia nauki</Badge><h3>Połączone konta dzieci</h3></div><small>Cel tygodniowy ustawiasz osobno dla każdego dziecka.</small></div>{linkedChildren.map((child) => <ChildSettingsCard key={child.student_id} child={child} busy={actionBusy === child.student_id} onSave={onSavePreferences} />)}</section> : <Card className="parent-empty-view"><CardHeader><CardTitle>Nie ma jeszcze połączonych kont</CardTitle><CardDescription>Wyślij dziecku link rejestracyjny. Po zatwierdzeniu prośby zobaczysz je tutaj.</CardDescription></CardHeader><CardContent><Button type="button" onClick={() => onNavigate("connect")}>Połącz konto dziecka</Button></CardContent></Card>}
      </section>}

      {activeView === "progress" && <ParentProgress linkedChildren={linkedChildren} pendingRequests={requests.length} onConnect={() => onNavigate(requests.length ? "children" : "connect")} />}

      {activeView === "payments" && <ParentPayments linkedChildren={linkedChildren} onConnect={() => onNavigate("connect")} />}

      {activeView === "connect" && <section className="parent-content-view parent-connect-view" aria-labelledby="parent-connect-title">
        <div className="dashboard-view-heading"><div><h2 id="parent-connect-title">Podłącz dziecko</h2><small>Zaproś ucznia i zatwierdź bezpieczne połączenie kont</small></div></div>
        <Card className="parent-connect-card">
          <CardHeader><Badge variant="secondary">Działa od razu</Badge><CardTitle>Połącz konto dziecka</CardTitle><CardDescription>Wyślij link i swój e-mail. Po rejestracji prośba o zgodę pojawi się w widoku „Dzieci”.</CardDescription></CardHeader>
          <CardContent><div className="parent-connect-steps"><span><b>1</b>Wyślij link</span><span><b>2</b>Dziecko wpisuje Twój e-mail</span><span><b>3</b>Zatwierdzasz prośbę</span></div><div className="parent-connect-actions"><Button type="button" onClick={() => void copyInvite()}>Kopiuj link dla dziecka</Button><Button variant="outline" type="button" onClick={() => void copyGuardianEmail()}>Kopiuj mój e-mail</Button><Button variant="outline" asChild><a href={`mailto:?subject=${encodeURIComponent("Zaproszenie do egzaminio")}&body=${encodeURIComponent(`Załóż konto ucznia przez ten link: ${publicInviteUrl}\nW polu opiekuna wpisz: ${parentEmail}`)}`}>Wyślij e-mailem</a></Button><Button variant="ghost" asChild><a href="/bezpieczenstwo-dzieci-ai">Jak chronimy dane?</a></Button></div>{inviteStatus && <p className="parent-invite-status" role="status">{inviteStatus}</p>}</CardContent>
        </Card>
      </section>}
    </>
  );
}

function TeacherPanel({ verificationStatus }: { verificationStatus: Profile["teacher_verification_status"] }) {
  const verified = verificationStatus === "verified";
  return (
    <>
      <section className="dashboard-hero teacher-hero" id="zadania">
        <div>
          <span className="dashboard-kicker">Panel nauczyciela</span>
          <h2>Przygotuj pierwszy zestaw.</h2>
          <p>Wybierz zadania CKE według tematu i udostępnij je uczniom jednym linkiem.</p>
          <Badge variant="secondary">Zestawy w przygotowaniu</Badge>
        </div>
        <div className="teacher-stack"><i>CKE</i><i>6 zadań</i><i>Link dla klasy</i></div>
      </section>
      {!verified && <Alert variant={verificationStatus === "rejected" ? "destructive" : "warning"} className="teacher-verification"><AlertTitle>{verificationStatus === "rejected" ? "Weryfikacja wymaga wyjaśnienia" : "Konto nauczyciela oczekuje na weryfikację"}</AlertTitle><AlertDescription>Możesz przeglądać panel i bibliotekę. Tworzenie grup, zapraszanie uczniów i dostęp do ich wyników są zablokowane do potwierdzenia roli nauczyciela przez administratora. Napisz na kontakt@egzamin.io z adresu szkolnego.</AlertDescription></Alert>}
      <section className="dashboard-grid three-columns" id="postep">
        <article className="metric-card"><span>Moje grupy</span><b>0</b><small>Utwórz grupę lub zaproś klasę.</small></article>
        <article className="metric-card"><span>Aktywne zestawy</span><b>0</b><small>Gotowe zadania pojawią się tutaj.</small></article>
        <article className="metric-card"><span>Uczniowie</span><b>0</b><small>Dołączają przez bezpieczny kod.</small></article>
      </section>
      <section className="dashboard-grid two-columns">
        <article className="dashboard-card"><span className="dashboard-kicker dark-kicker">Biblioteka CKE</span><h3>Wybieraj zadania według umiejętności</h3><p>Matematyka, język polski i angielski — z metadanymi i wyjaśnieniami AI.</p><Badge variant="outline">W przygotowaniu</Badge></article>
        <article className="dashboard-card"><span className="dashboard-kicker dark-kicker">Wyniki</span><h3>Zobacz, gdzie grupa naprawdę utknęła</h3><p>Skuteczność według tematu bez ujawniania prywatnych rozmów uczniów z AI. Dane pokazujemy tylko dla przypisanej grupy i w niezbędnym zakresie.</p><Badge variant="outline">{verified ? "W przygotowaniu" : "Dostęp po weryfikacji"}</Badge></article>
      </section>
    </>
  );
}

function AdminPanel({ counts, feedback, busy, feedbackBusyId, error, onGrantTeacher, onUpdateFeedback }: { counts: RoleCounts; feedback: AdminFeedback[]; busy: boolean; feedbackBusyId: string; error: string; onGrantTeacher: (email: string) => Promise<boolean>; onUpdateFeedback: (id: string, status: FeedbackStatus) => void }) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const [teacherEmail, setTeacherEmail] = useState("");

  async function grantTeacherRole() {
    const email = teacherEmail.trim().toLowerCase();
    if (!email) return;
    if (await onGrantTeacher(email)) setTeacherEmail("");
  }

  return (
    <>
      <section className="dashboard-hero admin-hero" id="zadania">
        <div><span className="dashboard-kicker">Administracja MVP</span><h2>Stan platformy w jednym miejscu.</h2><p>Kontroluj konta, treści CKE i gotowość produktu przed zaproszeniem kolejnej kohorty.</p><Button asChild><a href="#nadawanie-roli">Nadaj rolę nauczyciela <span>→</span></a></Button></div>
        <div className="admin-total"><b>{total}</b><span>wszystkich kont</span></div>
      </section>
      <section className="dashboard-grid four-columns" id="postep">
        {(["student", "parent", "teacher", "admin"] as UserRole[]).map((role) => (
          <article className="metric-card" key={role}><span>{roleLabels[role]}</span><b>{counts[role]}</b><small>aktywnych profili</small></article>
        ))}
      </section>
      <section className="dashboard-grid two-columns">
        <article className="dashboard-card"><span className="status-dot ready" /> <h3>Supabase Auth i RLS</h3><p>Role są odseparowane w bazie, a administratora nie można wybrać podczas rejestracji.</p></article>
        <article className="dashboard-card"><span className="status-dot pending" /> <h3>Treści do publikacji</h3><p>Dodaj workflow akceptacji zdigitalizowanych zadań przed uruchomieniem płatnego ruchu.</p></article>
      </section>
      <Card className="admin-teacher-card" id="nadawanie-roli">
        <CardHeader><CardTitle>Ręczne nadawanie roli nauczyciela</CardTitle><CardDescription>Użytkownik najpierw zakłada zwykłe konto. Po weryfikacji administrator zmienia jego rolę na nauczyciela.</CardDescription></CardHeader>
        <CardContent>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="admin-teacher-form"><Label htmlFor="teacher-email">Adres e-mail zweryfikowanego nauczyciela</Label><div><Input id="teacher-email" type="email" autoComplete="email" placeholder="nauczyciel@szkola.pl" value={teacherEmail} onChange={(event) => setTeacherEmail(event.target.value)} /><Button type="button" onClick={() => void grantTeacherRole()} disabled={busy || !teacherEmail.trim()}>{busy ? "Nadaję rolę…" : "Nadaj rolę"}</Button></div></div>
        </CardContent>
      </Card>
      <AdminPromoCodes />
      <Card className="admin-feedback-card" id="feedback">
        <CardHeader><div className="admin-feedback-heading"><div><CardTitle>Feedback użytkowników</CardTitle><CardDescription>Najnowsze zgłoszenia z aplikacji. Dane kontaktowe pojawiają się wyłącznie po zgodzie użytkownika.</CardDescription></div><Badge variant="secondary">{feedback.filter((item) => item.feedback_status === "new").length} nowych</Badge></div></CardHeader>
        <CardContent>
          {!feedback.length ? <p className="admin-feedback-empty">Brak zgłoszeń. Nowe opinie pojawią się tutaj automatycznie.</p> : <div className="admin-feedback-list">{feedback.map((item) => {
            const category = FEEDBACK_CATEGORIES.find((entry) => entry.value === item.feedback_category)?.label ?? item.feedback_category;
            return <article className="admin-feedback-item" key={item.feedback_id}>
              <div className="admin-feedback-meta"><Badge variant="outline">{category}</Badge><span>{roleLabels[item.feedback_user_role]}</span>{item.feedback_rating && <span aria-label={`Ocena ${item.feedback_rating} z 5`}>Ocena {item.feedback_rating}/5</span>}<time dateTime={item.feedback_created_at}>{new Date(item.feedback_created_at).toLocaleString("pl-PL")}</time></div>
              <p>{item.feedback_message}</p>
              <div className="admin-feedback-context"><span>{item.feedback_screen_context} · {item.feedback_page_path}</span>{item.feedback_question_id && <span>Zadanie: {item.feedback_question_id}</span>}{item.feedback_contact_email && <a href={`mailto:${item.feedback_contact_email}`}>{item.feedback_contact_email}</a>}</div>
              <Label htmlFor={`feedback-status-${item.feedback_id}`}>Status<Select value={item.feedback_status} onValueChange={(value) => onUpdateFeedback(item.feedback_id, value as FeedbackStatus)} disabled={feedbackBusyId === item.feedback_id}><SelectTrigger id={`feedback-status-${item.feedback_id}`}><SelectValue /></SelectTrigger><SelectContent>{(Object.entries(feedbackStatusLabels) as [FeedbackStatus, string][]).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Label>
            </article>;
          })}</div>}
        </CardContent>
      </Card>
    </>
  );
}

export default function DashboardPage() {
  const [renderedAt] = useState(() => Date.now());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState<RoleCounts>(emptyCounts);
  const [guardianRequests, setGuardianRequests] = useState<GuardianRequest[]>([]);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [parentView, setParentView] = useState<ParentView>("start");
  const [studentView, setStudentView] = useState<StudentView>("start");
  const [guardianActionBusy, setGuardianActionBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [adminActionBusy, setAdminActionBusy] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<AdminFeedback[]>([]);
  const [feedbackBusyId, setFeedbackBusyId] = useState("");
  const [adminActionError, setAdminActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshParentData = useCallback(async () => {
    const supabase = await getSupabaseClient();
    const [{ data: requests, error: requestsError }, { data: children, error: childrenError }] = await Promise.all([
      supabase.rpc("get_guardian_requests"),
      supabase.rpc("get_linked_children"),
    ]);
    if (requestsError || childrenError) throw requestsError ?? childrenError;
    setGuardianRequests((requests as GuardianRequest[] | null) ?? []);
    setLinkedChildren((children as LinkedChild[] | null) ?? []);
  }, []);

  const refreshAdminCounts = useCallback(async () => {
    const supabase = await getSupabaseClient();
    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("role");
    if (profilesError) throw profilesError;
    const nextCounts = { ...emptyCounts };
    profiles?.forEach((item) => {
      if (isUserRole(item.role)) nextCounts[item.role] += 1;
    });
    setCounts(nextCounts);
  }, []);

  const refreshAdminFeedback = useCallback(async () => {
    const supabase = await getSupabaseClient();
    const { data, error: feedbackError } = await supabase.rpc("get_admin_feedback", { requested_limit: 50 });
    if (feedbackError) throw feedbackError;
    setAdminFeedback((data as AdminFeedback[] | null) ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    getSupabaseClient()
      .then(async (supabase) => {
        const load = async (nextUser: User | null) => {
          if (!active) return;
          if (!nextUser) {
            window.location.replace("/logowanie");
            return;
          }
          setUser(nextUser);

          const { data, error: profileError } = await supabase
            .from("profiles")
            .select("id,email,display_name,role,onboarding_completed,legal_version,guardian_email,guardian_consent_at,teacher_verification_status,plan_tier,plan_valid_until")
            .eq("id", nextUser.id)
            .single();

          if (profileError || !data || !isUserRole(data.role)) {
            throw profileError ?? new Error("profile_not_found");
          }

          const nextProfile = data as Profile;
          const accountRoute = resolveAccountRoute(nextProfile, LEGAL_VERSION);
          if (accountRoute !== "/panel") {
            window.location.replace(accountRoute);
            return;
          }

          setProfile(nextProfile);
          if (nextProfile.role === "parent") {
            await refreshParentData();
            if (new URLSearchParams(window.location.search).get("widok") === "platnosci") setParentView("payments");
          } else if (nextProfile.role === "admin") {
            await Promise.all([refreshAdminCounts(), refreshAdminFeedback()]);
          }
          setLoading(false);
        };

        const { data } = await supabase.auth.getSession();
        await load(data.session?.user ?? null);
        const listener = supabase.auth.onAuthStateChange((_event, session) => {
          void load(session?.user ?? null);
        });
        unsubscribe = () => listener.data.subscription.unsubscribe();
      })
      .catch(() => {
        if (!active) return;
        setError("Nie udało się otworzyć panelu. Sprawdź konfigurację Supabase i migrację bazy.");
        setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [refreshAdminCounts, refreshAdminFeedback, refreshParentData]);

  async function decideGuardianRequest(requestId: string, decision: "approve" | "reject") {
    setGuardianActionBusy(requestId);
    setActionError("");
    setActionMessage("");
    try {
      const supabase = await getSupabaseClient();
      const functionName = decision === "approve" ? "approve_guardian_request" : "reject_guardian_request";
      const { error: decisionError } = await supabase.rpc(functionName, { target_request_id: requestId });
      if (decisionError) throw decisionError;
      await refreshParentData();
      setActionMessage(decision === "approve" ? "Konto dziecka zostało połączone." : "Prośba została odrzucona.");
    } catch {
      setActionError("Nie udało się zapisać decyzji opiekuna. Odśwież stronę i spróbuj ponownie.");
    } finally {
      setGuardianActionBusy("");
    }
  }

  async function saveGuardianPreferences(studentId: string, weeklyGoal: number) {
    setGuardianActionBusy(studentId);
    setActionError("");
    setActionMessage("");
    try {
      const supabase = await getSupabaseClient();
      const { error: settingsError } = await supabase.rpc("update_child_learning_settings", {
        target_student_id: studentId,
        next_weekly_goal: weeklyGoal,
        next_summary_email_enabled: false,
        next_accommodation_code: "100",
        confirms_sensitive_preference: false,
      });
      if (settingsError) throw settingsError;
      await refreshParentData();
      setActionMessage("Ustawienia dziecka zostały zapisane.");
    } catch {
      setActionError("Nie udało się zapisać ustawień dziecka. Spróbuj ponownie.");
    } finally {
      setGuardianActionBusy("");
    }
  }

  async function grantTeacherRole(email: string) {
    setAdminActionBusy(true);
    setAdminActionError("");
    try {
      const supabase = await getSupabaseClient();
      const { error: grantError } = await supabase.rpc("grant_teacher_role", { target_email: email });
      if (grantError) throw grantError;
      await refreshAdminCounts();
      return true;
    } catch {
      setAdminActionError("Nie udało się nadać roli. Sprawdź adres, status konta i uprawnienia administratora.");
      return false;
    } finally {
      setAdminActionBusy(false);
    }
  }

  async function updateFeedbackStatus(feedbackId: string, status: FeedbackStatus) {
    setFeedbackBusyId(feedbackId);
    setAdminActionError("");
    try {
      const supabase = await getSupabaseClient();
      const { error: updateError } = await supabase.rpc("update_feedback_status", { target_feedback_id: feedbackId, next_status: status });
      if (updateError) throw updateError;
      await refreshAdminFeedback();
    } catch {
      setAdminActionError("Nie udało się zmienić statusu zgłoszenia. Spróbuj ponownie.");
    } finally {
      setFeedbackBusyId("");
    }
  }

  const firstName = useMemo(() => {
    const source =
      profile?.display_name ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email ||
      "";
    return source.split(/[ @]/)[0] || "Cześć";
  }, [profile, user]);

  async function signOut() {
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  function openAccountSettings() {
    if (profile?.role === "parent") setParentView("settings");
    else if (profile?.role === "student") setStudentView("settings");
    window.setTimeout(() => document.getElementById("ustawienia")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  if (loading) {
    return <main className="dashboard-loading"><BrandLogo /><span>Przygotowujemy Twój panel…</span></main>;
  }

  if (error || !profile) {
    return (
      <main className="dashboard-loading error-state">
        <BrandLogo />
        <h1>Nie udało się otworzyć panelu</h1>
        <p>{error}</p>
        <a href="/logowanie">Wróć do logowania</a>
      </main>
    );
  }

  const displayName =
    profile.display_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    profile.email;
  const parentPlusChildren = profile.role === "parent" ? linkedChildren.filter((child) => child.plan_tier === "plus" && (!child.plan_valid_until || new Date(child.plan_valid_until).getTime() > renderedAt)).length : 0;
  const studentHasPlus = profile.role === "student" && profile.plan_tier === "plus" && (!profile.plan_valid_until || new Date(profile.plan_valid_until).getTime() > renderedAt);
  const parentViewLabels: Record<ParentView, string> = {
    start: "Przegląd",
    progress: "Postęp dziecka",
    children: "Dzieci",
    connect: "Podłącz dziecko",
    payments: "Płatności i faktury",
    settings: "Ustawienia",
  };
  const studentViewLabels: Record<StudentView, string> = {
    start: "Nauka",
    exercises: "Zadania",
    progress: "Postęp",
    settings: "Ustawienia",
  };
  const focusMode = profile.role === "student" && studentView === "exercises";
  const feedbackContext = profile.role === "parent"
    ? `parent:${parentView}`
    : profile.role === "student"
      ? `student:${studentView}`
      : `${profile.role}:start`;

  if (focusMode) {
    return <main className="task-route-shell"><StudentPractice activeView="exercises" onNavigate={setStudentView} hasPlusAccess={studentHasPlus} /></main>;
  }

  return (
    <main className={`dashboard-page dashboard-${profile.role}-page`}>
      <FeedbackDialog userEmail={profile.email} screenContext={feedbackContext} />
      {!focusMode && profile.role !== "parent" && profile.role !== "student" ? <AccountMenu displayName={displayName} email={profile.email} className="dashboard-session-floating" onSettings={openAccountSettings} onSignOut={() => void signOut()} /> : null}
      {!focusMode && profile.role !== "student" && <aside className="dashboard-sidebar">
        <a href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a>
        <span className="dashboard-nav-label">{profile.role === "parent" ? "Konto rodzica" : profile.role === "teacher" ? "Panel nauczyciela" : "Administracja"}</span>
        <nav aria-label="Panel">
          {profile.role === "parent" ? <>
            <button type="button" className={parentView === "start" ? "active" : ""} aria-current={parentView === "start" ? "page" : undefined} onClick={() => setParentView("start")}><LayoutDashboard className="parent-nav-icon" aria-hidden="true" /><span>Przegląd</span></button>
            <button type="button" className={parentView === "progress" ? "active" : ""} aria-current={parentView === "progress" ? "page" : undefined} onClick={() => setParentView("progress")}><ChartNoAxesColumnIncreasing className="parent-nav-icon" aria-hidden="true" /><span>Postęp dziecka</span></button>
            <button type="button" className={`${parentView === "children" ? "active " : ""}dashboard-nav-with-count`.trim()} aria-current={parentView === "children" ? "page" : undefined} onClick={() => setParentView("children")}><Users className="parent-nav-icon" aria-hidden="true" /><span>Dzieci</span>{guardianRequests.length > 0 && <b>{guardianRequests.length}</b>}</button>
            <button type="button" className={parentView === "connect" ? "active" : ""} aria-current={parentView === "connect" ? "page" : undefined} onClick={() => setParentView("connect")}><UserPlus className="parent-nav-icon" aria-hidden="true" /><span>Podłącz dziecko</span></button>
            <button type="button" className={parentView === "payments" ? "active" : ""} aria-current={parentView === "payments" ? "page" : undefined} onClick={() => setParentView("payments")}><CreditCard className="parent-nav-icon" aria-hidden="true" /><span>Płatności i faktury</span></button>
            <button type="button" className={parentView === "settings" ? "active" : ""} aria-current={parentView === "settings" ? "page" : undefined} onClick={() => setParentView("settings")}><SettingsIcon className="parent-nav-icon" aria-hidden="true" /><span>Ustawienia</span></button>
          </> : <>
            <a className="active" href="/panel">Start</a>
            <a href="#zadania">{profile.role === "teacher" ? "Zestawy" : "Użytkownicy"}</a>
            <a href="#postep">{profile.role === "admin" ? "Treści CKE" : "Postępy"}</a>
            <a href="#ustawienia">Ustawienia</a>
          </>}
        </nav>
        <div className="sidebar-plan"><b>{parentPlusChildren ? `Pakiet Plus · ${parentPlusChildren}` : "Wersja bezpłatna"}</b><span>{parentPlusChildren ? "Aktywny dla połączonych dzieci" : "15 interaktywnych pytań dziennie"}</span><i><em /></i>{profile.role === "parent" ? <button type="button" onClick={() => setParentView("payments")}>{parentPlusChildren ? "Płatności i dokumenty →" : "Poznaj pakiet Plus →"}</button> : <a href="/plan-plus">Poznaj pakiet Plus →</a>}</div>
        {profile.role === "parent" ? <DashboardLegalNav /> : null}
      </aside>}

      {!focusMode && profile.role === "student" && <aside className="dashboard-sidebar student-dashboard-sidebar">
        <a href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a>
        <span className="dashboard-nav-label">Konto ucznia</span>
        <nav aria-label="Panel ucznia">
          <button type="button" className={studentView === "start" ? "active" : ""} aria-current={studentView === "start" ? "page" : undefined} onClick={() => setStudentView("start")}><BookOpen className="student-nav-icon" aria-hidden="true" /><span>Nauka</span></button>
          <button type="button" className={studentView === "progress" ? "active" : ""} aria-current={studentView === "progress" ? "page" : undefined} onClick={() => setStudentView("progress")}><ChartNoAxesColumnIncreasing className="student-nav-icon" aria-hidden="true" /><span>Postęp</span></button>
          <button type="button" className={studentView === "settings" ? "active" : ""} aria-current={studentView === "settings" ? "page" : undefined} onClick={() => setStudentView("settings")}><SettingsIcon className="student-nav-icon" aria-hidden="true" /><span>Ustawienia</span></button>
        </nav>
        <button type="button" className="student-session-card" onClick={() => setStudentView("exercises")}>
          <span>Dzisiejsza sesja</span>
          <b>Gotowy do nauki <span aria-hidden="true">→</span></b>
          <i aria-hidden="true"><em /></i>
          <small>Cel tygodniowy ustawia rodzic.</small>
        </button>
        <DashboardLegalNav />
      </aside>}

      <div className="dashboard-main">
        {!focusMode && profile.role === "student" && <header className="student-dashboard-topbar">
          <span>Konto ucznia <i aria-hidden="true">/</i> <b>{studentViewLabels[studentView]}</b></span>
          <div className="student-topbar-actions">
            <a className="student-plan-pill" href="/plan-plus#dla-ucznia">{studentHasPlus ? "Pakiet Plus" : "Plan Free"}</a>
            <AccountMenu displayName={displayName} email={profile.email} triggerClassName="header-account-session" onSettings={openAccountSettings} onSignOut={() => void signOut()} />
          </div>
        </header>}
        {!focusMode && profile.role === "parent" && <header className="parent-dashboard-topbar">
          <span>Konto rodzica <i aria-hidden="true">/</i> <b>{parentViewLabels[parentView]}</b></span>
          <div className="parent-topbar-actions">
            <button type="button" className="parent-plan-pill" onClick={() => setParentView("payments")}>{parentPlusChildren ? `Pakiet Plus · ${parentPlusChildren} ${parentPlusChildren === 1 ? "dziecko" : "dzieci"}` : `Plan Free · ${linkedChildren.length} ${linkedChildren.length === 1 ? "dziecko" : "dzieci"}`}</button>
            <a className="parent-help-link" href="mailto:kontakt@egzamin.io"><CircleHelp aria-hidden="true" />Pomoc</a>
            <AccountMenu displayName={displayName} email={profile.email} triggerClassName="header-account-session" onSettings={openAccountSettings} onSignOut={() => void signOut()} />
          </div>
        </header>}
        {!focusMode && profile.role !== "student" && profile.role !== "parent" && <header className="dashboard-topbar">
          <div><span>{roleLabels[profile.role]}</span><h1>Cześć, {firstName}!</h1></div>
        </header>}
        <div className={focusMode ? "dashboard-content dashboard-focus-content" : "dashboard-content"}>
          {profile.role === "student" && <StudentPractice activeView={studentView} onNavigate={setStudentView} hasPlusAccess={studentHasPlus} />}
          {actionError && profile.role === "parent" && <Alert variant="destructive" className="dashboard-alert"><AlertDescription>{actionError}</AlertDescription></Alert>}
          {actionMessage && profile.role === "parent" && <Alert variant="success" className="dashboard-alert"><AlertDescription>{actionMessage}</AlertDescription></Alert>}
          {profile.role === "parent" && <ParentPanel activeView={parentView} parentEmail={profile.email} requests={guardianRequests} linkedChildren={linkedChildren} actionBusy={guardianActionBusy} onNavigate={setParentView} onApprove={(id) => void decideGuardianRequest(id, "approve")} onReject={(id) => void decideGuardianRequest(id, "reject")} onSavePreferences={(studentId, weeklyGoal) => void saveGuardianPreferences(studentId, weeklyGoal)} />}
          {profile.role === "teacher" && <TeacherPanel verificationStatus={profile.teacher_verification_status} />}
          {profile.role === "admin" && <AdminPanel counts={counts} feedback={adminFeedback} busy={adminActionBusy} feedbackBusyId={feedbackBusyId} error={adminActionError} onGrantTeacher={grantTeacherRole} onUpdateFeedback={(id, status) => void updateFeedbackStatus(id, status)} />}
          {profile.role === "parent" && parentView === "settings" && <section className="parent-content-view parent-settings-view" id="ustawienia" aria-labelledby="parent-settings-title">
            <Card className="account-settings-card parent-account-settings-card">
              <CardHeader><CardTitle id="parent-settings-title">Ustawienia konta</CardTitle><CardDescription>Motyw i zarządzanie kontem w jednym miejscu.</CardDescription></CardHeader>
              <CardContent className="parent-account-settings-content">
                <div className="account-theme-setting"><span>Wygląd aplikacji</span><ThemeSettings /></div>
                <div className="parent-account-links">
                  {parentPlusChildren
                    ? <Button variant="outline" type="button" onClick={() => setParentView("payments")}>Płatności i dokumenty</Button>
                    : <Button variant="outline" asChild><a href="/plan-plus#dla-rodzica">Poznaj pakiet Plus</a></Button>}
                  <Button variant="outline" className="parent-delete-account" asChild><a href="/usun-konto">Usuń konto i dane</a></Button>
                </div>
              </CardContent>
            </Card>
          </section>}
          {(profile.role !== "parent" && profile.role !== "student") && <Card className="account-settings-card" id="ustawienia">
            <CardHeader><CardTitle>Ustawienia konta</CardTitle><CardDescription>Motyw, prywatność i zarządzanie danymi w jednym miejscu.</CardDescription></CardHeader>
            <CardContent className="account-settings-actions"><div className="account-theme-setting"><span>Wygląd aplikacji</span><ThemeSettings /></div><Button variant="outline" asChild><a href="/polityka-prywatnosci">Polityka prywatności</a></Button><Button variant="outline" asChild><a href="/usun-konto">Usuń konto i dane</a></Button></CardContent>
          </Card>}
        </div>
      </div>
    </main>
  );
}
