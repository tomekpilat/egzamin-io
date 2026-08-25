"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { BrandLogo } from "@/components/brand-logo";
import { MathFormula } from "@/components/math-formula";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { isUserRole, roleLabels, type UserRole } from "@/lib/roles";
import { normalizeWeeklyGoal, summarizeParentPreferences } from "@/lib/parent-preferences";
import { getSupabaseClient } from "@/lib/supabase-browser";
import { LEGAL_VERSION } from "@/lib/legal";

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
};

type GuardianRequest = { request_id: string; student_id: string; student_display_name: string | null; student_email: string; requested_at: string; expires_at: string };
type LinkedChild = { student_id: string; student_display_name: string | null; student_email: string; linked_at: string; weekly_goal: number; summary_email_enabled: boolean };
type ParentView = "start" | "children" | "connect" | "settings";

type RoleCounts = Record<UserRole, number>;

const emptyCounts: RoleCounts = {
  student: 0,
  parent: 0,
  teacher: 0,
  admin: 0,
};

function StudentPanel() {
  return (
    <>
      <section className="dashboard-hero student-hero" id="zadania">
        <div>
          <span className="dashboard-kicker">Plan na dziś · 24 min</span>
          <h2>Zacznij od jednego zadania.</h2>
          <p>Krótka seria z procentów, potem powtórka z geometrii.</p>
          <Badge variant="secondary">Ćwiczenia w przygotowaniu</Badge>
        </div>
        <div className="daily-ring"><b>0/6</b><span>zadań dzisiaj</span></div>
      </section>
      <section className="dashboard-grid three-columns" id="postep">
        <article className="metric-card"><span>Seria nauki</span><b>🔥 0 dni</b><small>Pierwszy krok możesz zrobić dziś.</small></article>
        <article className="metric-card"><span>Pytania do AI</span><b>3</b><small>Dostępne w planie bezpłatnym.</small></article>
        <article className="metric-card"><span>Opanowane tematy</span><b>0%</b><small>Postęp pojawi się po pierwszej serii.</small></article>
      </section>
      <section className="dashboard-grid two-columns">
        <article className="dashboard-card">
          <div className="card-heading"><div><span>Następne ćwiczenie</span><h3>Procenty w zadaniach tekstowych</h3></div><b className="subject-badge">∑</b></div>
          <p>6 zadań z arkuszy CKE · około 18 minut</p>
          <div className="progress-line"><i style={{ width: "0%" }} /></div>
          <MathFormula latex="x=\\sqrt{6^2+8^2}=10" display className="dashboard-formula" />
        </article>
        <article className="dashboard-card ai-card">
          <div className="card-heading"><div><span>Nauczyciel AI</span><h3>Możesz zapytać własnymi słowami</h3></div><b className="ai-badge">AI</b></div>
          <p>Wyjaśnię krok, podam prostszy przykład albo przypomnę potrzebny wzór.</p>
          <div className="ai-prompt-preview">Rozmowa AI pojawi się w kolejnym etapie MVP.</div>
        </article>
      </section>
    </>
  );
}

function ChildSettingsCard({ child, busy, onSave }: { child: LinkedChild; busy: boolean; onSave: (studentId: string, weeklyGoal: number, summaryEmailEnabled: boolean) => void }) {
  const [weeklyGoal, setWeeklyGoal] = useState(child.weekly_goal);
  const [summaryEnabled, setSummaryEnabled] = useState(child.summary_email_enabled);
  const childName = child.student_display_name || "Uczeń";

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
        <div className="child-preference-grid">
          <Label htmlFor={`goal-${child.student_id}`}>Liczba sesji w tygodniu<Input id={`goal-${child.student_id}`} type="number" min={1} max={30} value={weeklyGoal} onChange={(event) => setWeeklyGoal(normalizeWeeklyGoal(event.target.value))} /></Label>
          <div className="summary-preference"><div><Label htmlFor={`summary-${child.student_id}`}>Tygodniowe podsumowanie</Label><p>Powiadomienie e-mail bez treści rozmów z AI.</p></div><Switch id={`summary-${child.student_id}`} checked={summaryEnabled} onCheckedChange={setSummaryEnabled} /></div>
        </div>
        <div className="child-settings-actions"><Button type="button" onClick={() => onSave(child.student_id, weeklyGoal, summaryEnabled)} disabled={busy}>{busy ? "Zapisuję…" : "Zapisz ustawienia"}</Button><Button variant="outline" asChild><a href="/bezpieczenstwo-dzieci-ai">Zakres danych rodzica</a></Button></div>
      </CardContent>
    </Card>
  );
}

function ParentPanel({ activeView, parentEmail, requests, linkedChildren, actionBusy, onNavigate, onApprove, onReject, onSavePreferences }: { activeView: ParentView; parentEmail: string; requests: GuardianRequest[]; linkedChildren: LinkedChild[]; actionBusy: string; onNavigate: (view: ParentView) => void; onApprove: (id: string) => void; onReject: (id: string) => void; onSavePreferences: (studentId: string, weeklyGoal: number, summaryEmailEnabled: boolean) => void }) {
  const { totalWeeklyGoal, enabledReports } = summarizeParentPreferences(linkedChildren);
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
      {activeView === "start" && <>
        <section className="dashboard-hero parent-hero-dashboard">
          <div>
            <span className="dashboard-kicker">Panel rodzica</span>
            <h2>{requests.length ? "Dziecko czeka na Twoją zgodę." : linkedChildren.length ? "Wspieraj bez zaglądania przez ramię." : "Połącz konto dziecka."}</h2>
            <p>Zatwierdzasz konto we własnym panelu. Po połączeniu widzisz regularność i postęp, ale nie prywatną treść rozmów ucznia z AI.</p>
            <Button type="button" onClick={() => onNavigate(linkedChildren.length ? "children" : "connect")}>{linkedChildren.length ? "Zobacz dzieci" : "Połącz konto dziecka"} <span>→</span></Button>
          </div>
          <div className="parent-illustration"><span>R</span><i>+</i><span>U</span></div>
        </section>
        {requests.length > 0 && <section className="guardian-requests" aria-labelledby="guardian-requests-title">
          <div className="guardian-section-heading"><div><Badge variant="secondary">Wymaga decyzji</Badge><h3 id="guardian-requests-title">Prośby o zgodę opiekuna</h3></div><small>Sprawdź tożsamość dziecka poza serwisem przed zatwierdzeniem.</small></div>
          {requests.map((request) => <article className="guardian-request-card" key={request.request_id}>
            <div className="guardian-avatar">{(request.student_display_name || request.student_email).slice(0, 2).toUpperCase()}</div>
            <div><b>{request.student_display_name || "Uczeń"}</b><span>{request.student_email}</span><small>Prośba z {new Date(request.requested_at).toLocaleDateString("pl-PL")}</small></div>
            <div className="guardian-request-actions"><Button size="sm" onClick={() => onApprove(request.request_id)} disabled={Boolean(actionBusy)}>Zatwierdź</Button><Button size="sm" variant="outline" onClick={() => onReject(request.request_id)} disabled={Boolean(actionBusy)}>Odrzuć</Button></div>
          </article>)}
        </section>}
        {linkedChildren.length > 0 && <section className="dashboard-grid three-columns">
          <article className="metric-card"><span>Połączone konta</span><b>{linkedChildren.length}</b><small>Wyłącznie po zatwierdzonej prośbie.</small></article>
          <article className="metric-card"><span>Cel tygodniowy</span><b>{totalWeeklyGoal || "—"}</b><small>Łączna liczba zaplanowanych sesji.</small></article>
          <article className="metric-card"><span>Raporty e-mail</span><b>{enabledReports}</b><small>Bez podglądu treści rozmów z AI.</small></article>
        </section>}
        <section className="dashboard-card empty-dashboard-card">
          <span className="empty-icon">↗</span>
          <div><h3>Tygodniowy raport bez pilnowania każdego zadania</h3><p>Po połączeniu kont pokażemy regularność, postęp w tematach i jedną konkretną rekomendację na kolejny tydzień.</p></div>
        </section>
      </>}

      {activeView === "children" && <>
        <div className="dashboard-view-heading"><div><span className="dashboard-kicker dark-kicker">Dzieci</span><h2>Postępy i ustawienia nauki</h2></div><Button type="button" onClick={() => onNavigate("connect")}>Połącz kolejne konto</Button></div>
        {requests.length > 0 && <section className="guardian-requests" aria-labelledby="children-requests-title">
          <div className="guardian-section-heading"><div><Badge variant="secondary">Wymaga decyzji</Badge><h3 id="children-requests-title">Prośby o zgodę opiekuna</h3></div><small>Sprawdź tożsamość dziecka poza serwisem przed zatwierdzeniem.</small></div>
          {requests.map((request) => <article className="guardian-request-card" key={request.request_id}>
            <div className="guardian-avatar">{(request.student_display_name || request.student_email).slice(0, 2).toUpperCase()}</div>
            <div><b>{request.student_display_name || "Uczeń"}</b><span>{request.student_email}</span><small>Prośba z {new Date(request.requested_at).toLocaleDateString("pl-PL")}</small></div>
            <div className="guardian-request-actions"><Button size="sm" onClick={() => onApprove(request.request_id)} disabled={Boolean(actionBusy)}>Zatwierdź</Button><Button size="sm" variant="outline" onClick={() => onReject(request.request_id)} disabled={Boolean(actionBusy)}>Odrzuć</Button></div>
          </article>)}
        </section>}
        {linkedChildren.length > 0 ? <section className="linked-children"><div className="guardian-section-heading"><div><Badge variant="secondary">Ustawienia nauki</Badge><h3>Połączone konta dzieci</h3></div><small>Cel i podsumowania ustawiasz osobno dla każdego dziecka.</small></div>{linkedChildren.map((child) => <ChildSettingsCard key={child.student_id} child={child} busy={actionBusy === child.student_id} onSave={onSavePreferences} />)}</section> : <Card className="parent-empty-view"><CardHeader><CardTitle>Nie ma jeszcze połączonych kont</CardTitle><CardDescription>Wyślij dziecku link rejestracyjny. Po zatwierdzeniu prośby zobaczysz je tutaj.</CardDescription></CardHeader><CardContent><Button type="button" onClick={() => onNavigate("connect")}>Połącz konto dziecka</Button></CardContent></Card>}
      </>}

      {activeView === "connect" && <>
        <div className="dashboard-view-heading"><div><span className="dashboard-kicker dark-kicker">Połącz konto</span><h2>Zaproś dziecko w trzech krokach</h2></div></div>
        <Card className="parent-connect-card">
          <CardHeader><Badge variant="secondary">Działa od razu</Badge><CardTitle>Połącz konto dziecka</CardTitle><CardDescription>Wyślij link i swój e-mail. Po rejestracji prośba o zgodę pojawi się w widoku „Dzieci”.</CardDescription></CardHeader>
          <CardContent><div className="parent-connect-steps"><span><b>1</b>Wyślij link</span><span><b>2</b>Dziecko wpisuje Twój e-mail</span><span><b>3</b>Zatwierdzasz prośbę</span></div><div className="parent-connect-actions"><Button type="button" onClick={() => void copyInvite()}>Kopiuj link dla dziecka</Button><Button variant="outline" type="button" onClick={() => void copyGuardianEmail()}>Kopiuj mój e-mail</Button><Button variant="outline" asChild><a href={`mailto:?subject=${encodeURIComponent("Zaproszenie do egzaminio")}&body=${encodeURIComponent(`Załóż konto ucznia przez ten link: ${publicInviteUrl}\nW polu opiekuna wpisz: ${parentEmail}`)}`}>Wyślij e-mailem</a></Button><Button variant="ghost" asChild><a href="/bezpieczenstwo-dzieci-ai">Jak chronimy dane?</a></Button></div>{inviteStatus && <p className="parent-invite-status" role="status">{inviteStatus}</p>}</CardContent>
        </Card>
      </>}
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

function AdminPanel({ counts, busy, error, onGrantTeacher }: { counts: RoleCounts; busy: boolean; error: string; onGrantTeacher: (email: string) => Promise<boolean> }) {
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
    </>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState<RoleCounts>(emptyCounts);
  const [guardianRequests, setGuardianRequests] = useState<GuardianRequest[]>([]);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [parentView, setParentView] = useState<ParentView>("start");
  const [guardianActionBusy, setGuardianActionBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [adminActionBusy, setAdminActionBusy] = useState(false);
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
            .select("id,email,display_name,role,onboarding_completed,legal_version,guardian_email,guardian_consent_at,teacher_verification_status")
            .eq("id", nextUser.id)
            .single();

          if (profileError || !data || !isUserRole(data.role)) {
            throw profileError ?? new Error("profile_not_found");
          }

          const nextProfile = data as Profile;
          if (nextProfile.role === "student" && !nextProfile.guardian_consent_at) {
            window.location.replace(nextProfile.guardian_email ? "/oczekuje-na-zgode" : "/wybierz-role");
            return;
          }
          if ((!nextProfile.onboarding_completed || nextProfile.legal_version !== LEGAL_VERSION) && nextProfile.role !== "admin") {
            window.location.replace("/wybierz-role");
            return;
          }

          setProfile(nextProfile);
          if (nextProfile.role === "parent") {
            await refreshParentData();
          } else if (nextProfile.role === "admin") {
            await refreshAdminCounts();
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
  }, [refreshAdminCounts, refreshParentData]);

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

  async function saveGuardianPreferences(studentId: string, weeklyGoal: number, summaryEmailEnabled: boolean) {
    setGuardianActionBusy(studentId);
    setActionError("");
    setActionMessage("");
    try {
      const supabase = await getSupabaseClient();
      const { error: preferencesError } = await supabase.rpc("update_guardian_preferences", {
        target_student_id: studentId,
        next_weekly_goal: weeklyGoal,
        next_summary_email_enabled: summaryEmailEnabled,
      });
      if (preferencesError) throw preferencesError;
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

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <a href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a>
        <nav aria-label="Panel">
          {profile.role === "parent" ? <>
            <button type="button" className={parentView === "start" ? "active" : ""} aria-current={parentView === "start" ? "page" : undefined} onClick={() => setParentView("start")}><span>⌂</span> Start</button>
            <button type="button" className={parentView === "children" ? "active" : ""} aria-current={parentView === "children" ? "page" : undefined} onClick={() => setParentView("children")}><span>✎</span> Dzieci</button>
            <button type="button" className={parentView === "connect" ? "active" : ""} aria-current={parentView === "connect" ? "page" : undefined} onClick={() => setParentView("connect")}><span>↗</span> Połącz konto</button>
            <button type="button" className={parentView === "settings" ? "active" : ""} aria-current={parentView === "settings" ? "page" : undefined} onClick={() => setParentView("settings")}><span>⚙</span> Ustawienia</button>
          </> : <>
            <a className="active" href="/panel"><span>⌂</span> Start</a>
            <a href="#zadania"><span>✎</span> {profile.role === "teacher" ? "Zestawy" : profile.role === "admin" ? "Użytkownicy" : "Ćwiczenia"}</a>
            <a href="#postep"><span>↗</span> {profile.role === "admin" ? "Treści CKE" : "Postępy"}</a>
            <a href="#ustawienia"><span>⚙</span> Ustawienia</a>
          </>}
        </nav>
        <div className="sidebar-plan"><b>Plan bezpłatny</b><span>3 pytania AI dziennie</span><i><em /></i><a href="/#dostep">Poznaj plan Plus →</a></div>
        <Button variant="ghost" className="sidebar-signout" type="button" onClick={signOut}>Wyloguj się</Button>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div><span>{roleLabels[profile.role]}</span><h1>Cześć, {firstName}!</h1></div>
          <div className="dashboard-topbar-actions"><div className="dashboard-account"><span>{displayName.slice(0, 2).toUpperCase()}</span><div><b>{displayName}</b><small>{profile.email}</small></div></div></div>
        </header>
        <div className="dashboard-content">
          {profile.role === "student" && <StudentPanel />}
          {actionError && profile.role === "parent" && <Alert variant="destructive" className="dashboard-alert"><AlertDescription>{actionError}</AlertDescription></Alert>}
          {actionMessage && profile.role === "parent" && <Alert variant="success" className="dashboard-alert"><AlertDescription>{actionMessage}</AlertDescription></Alert>}
          {profile.role === "parent" && <ParentPanel activeView={parentView} parentEmail={profile.email} requests={guardianRequests} linkedChildren={linkedChildren} actionBusy={guardianActionBusy} onNavigate={setParentView} onApprove={(id) => void decideGuardianRequest(id, "approve")} onReject={(id) => void decideGuardianRequest(id, "reject")} onSavePreferences={(studentId, weeklyGoal, summaryEnabled) => void saveGuardianPreferences(studentId, weeklyGoal, summaryEnabled)} />}
          {profile.role === "teacher" && <TeacherPanel verificationStatus={profile.teacher_verification_status} />}
          {profile.role === "admin" && <AdminPanel counts={counts} busy={adminActionBusy} error={adminActionError} onGrantTeacher={grantTeacherRole} />}
          {(profile.role !== "parent" || parentView === "settings") && <Card className="account-settings-card" id="ustawienia">
            <CardHeader><CardTitle>Ustawienia konta</CardTitle><CardDescription>Motyw, prywatność i zarządzanie danymi w jednym miejscu.</CardDescription></CardHeader>
            <CardContent className="account-settings-actions"><div><span>Wygląd aplikacji</span><ThemeToggle /></div><Button variant="outline" asChild><a href="/polityka-prywatnosci">Polityka prywatności</a></Button><Button variant="outline" asChild><a href="/usun-konto">Usuń konto i dane</a></Button></CardContent>
          </Card>}
        </div>
      </div>
    </main>
  );
}
