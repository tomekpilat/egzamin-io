"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { BrandLogo } from "@/components/brand-logo";
import { MathFormula } from "@/components/math-formula";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isUserRole, roleLabels, type UserRole } from "@/lib/roles";
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
type LinkedChild = { student_id: string; student_display_name: string | null; student_email: string; linked_at: string };

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
      <section className="dashboard-hero student-hero">
        <div>
          <span className="dashboard-kicker">Plan na dziś · 24 min</span>
          <h2>Zacznij od jednego zadania.</h2>
          <p>Krótka seria z procentów, potem powtórka z geometrii.</p>
          <Button type="button">Rozpocznij ćwiczenie <span>→</span></Button>
        </div>
        <div className="daily-ring"><b>0/6</b><span>zadań dzisiaj</span></div>
      </section>
      <section className="dashboard-grid three-columns">
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
          <Button variant="outline" type="button" className="secondary-button">Otwórz zestaw</Button>
        </article>
        <article className="dashboard-card ai-card">
          <div className="card-heading"><div><span>Nauczyciel AI</span><h3>Możesz zapytać własnymi słowami</h3></div><b className="ai-badge">AI</b></div>
          <p>Wyjaśnię krok, podam prostszy przykład albo przypomnę potrzebny wzór.</p>
          <div className="ai-prompt-preview">„Nie rozumiem, dlaczego…” <b>↑</b></div>
        </article>
      </section>
    </>
  );
}

function ParentPanel({ requests, linkedChildren, actionBusy, onApprove, onReject }: { requests: GuardianRequest[]; linkedChildren: LinkedChild[]; actionBusy: string; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return (
    <>
      <section className="dashboard-hero parent-hero-dashboard">
        <div>
          <span className="dashboard-kicker">Panel rodzica</span>
          <h2>{requests.length ? "Dziecko czeka na Twoją zgodę." : linkedChildren.length ? "Wspieraj bez zaglądania przez ramię." : "Połącz konto dziecka."}</h2>
          <p>Zatwierdzasz konto we własnym panelu. Po połączeniu widzisz regularność i postęp, ale nie prywatną treść rozmów ucznia z AI.</p>
          <Button type="button" asChild><Link href="/bezpieczenstwo-dzieci-ai">Zasady ochrony dzieci <span>→</span></Link></Button>
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
      <section className="dashboard-grid three-columns">
        <article className="metric-card"><span>Połączone konta</span><b>{linkedChildren.length}</b><small>Wyłącznie po zatwierdzonej prośbie.</small></article>
        <article className="metric-card"><span>Aktywność w tygodniu</span><b>—</b><small>Pojawi się po pierwszych ćwiczeniach.</small></article>
        <article className="metric-card"><span>Czas nauki</span><b>—</b><small>Bez podglądu treści rozmów z AI.</small></article>
      </section>
      {linkedChildren.length > 0 && <section className="linked-children"><h3>Połączone konta dzieci</h3>{linkedChildren.map((child) => <article key={child.student_id}><div className="guardian-avatar">{(child.student_display_name || child.student_email).slice(0, 2).toUpperCase()}</div><div><b>{child.student_display_name || "Uczeń"}</b><span>{child.student_email}</span></div><Badge variant="outline">Zgoda aktywna</Badge></article>)}</section>}
      <section className="dashboard-card empty-dashboard-card">
        <span className="empty-icon">↗</span>
        <div><h3>Tygodniowy raport bez pilnowania każdego zadania</h3><p>Po połączeniu kont pokażemy regularność, postęp w tematach i jedną konkretną rekomendację na kolejny tydzień.</p></div>
      </section>
    </>
  );
}

function TeacherPanel({ verificationStatus }: { verificationStatus: Profile["teacher_verification_status"] }) {
  const verified = verificationStatus === "verified";
  return (
    <>
      <section className="dashboard-hero teacher-hero">
        <div>
          <span className="dashboard-kicker">Panel nauczyciela</span>
          <h2>Przygotuj pierwszy zestaw.</h2>
          <p>Wybierz zadania CKE według tematu i udostępnij je uczniom jednym linkiem.</p>
          <Button type="button" disabled={!verified}>Utwórz zestaw <span>→</span></Button>
        </div>
        <div className="teacher-stack"><i>CKE</i><i>6 zadań</i><i>Link dla klasy</i></div>
      </section>
      {!verified && <Alert variant={verificationStatus === "rejected" ? "destructive" : "warning"} className="teacher-verification"><AlertTitle>{verificationStatus === "rejected" ? "Weryfikacja wymaga wyjaśnienia" : "Konto nauczyciela oczekuje na weryfikację"}</AlertTitle><AlertDescription>Możesz przeglądać panel i bibliotekę. Tworzenie grup, zapraszanie uczniów i dostęp do ich wyników są zablokowane do potwierdzenia roli nauczyciela przez administratora. Napisz na kontakt@egzamin.io z adresu szkolnego.</AlertDescription></Alert>}
      <section className="dashboard-grid three-columns">
        <article className="metric-card"><span>Moje grupy</span><b>0</b><small>Utwórz grupę lub zaproś klasę.</small></article>
        <article className="metric-card"><span>Aktywne zestawy</span><b>0</b><small>Gotowe zadania pojawią się tutaj.</small></article>
        <article className="metric-card"><span>Uczniowie</span><b>0</b><small>Dołączają przez bezpieczny kod.</small></article>
      </section>
      <section className="dashboard-grid two-columns">
        <article className="dashboard-card"><span className="dashboard-kicker dark-kicker">Biblioteka CKE</span><h3>Wybieraj zadania według umiejętności</h3><p>Matematyka, język polski i angielski — z metadanymi i wyjaśnieniami AI.</p><Button variant="outline" className="secondary-button" type="button">Przeglądaj zadania</Button></article>
        <article className="dashboard-card"><span className="dashboard-kicker dark-kicker">Wyniki</span><h3>Zobacz, gdzie grupa naprawdę utknęła</h3><p>Skuteczność według tematu bez ujawniania prywatnych rozmów uczniów z AI. Dane pokazujemy tylko dla przypisanej grupy i w niezbędnym zakresie.</p><Button variant="outline" className="secondary-button" type="button" disabled={!verified}>Zobacz przykładowy raport</Button></article>
      </section>
    </>
  );
}

function AdminPanel({ counts }: { counts: RoleCounts }) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return (
    <>
      <section className="dashboard-hero admin-hero">
        <div><span className="dashboard-kicker">Administracja MVP</span><h2>Stan platformy w jednym miejscu.</h2><p>Kontroluj konta, treści CKE i gotowość produktu przed zaproszeniem kolejnej kohorty.</p><button type="button">Przejdź do użytkowników <span>→</span></button></div>
        <div className="admin-total"><b>{total}</b><span>wszystkich kont</span></div>
      </section>
      <section className="dashboard-grid four-columns">
        {(["student", "parent", "teacher", "admin"] as UserRole[]).map((role) => (
          <article className="metric-card" key={role}><span>{roleLabels[role]}</span><b>{counts[role]}</b><small>aktywnych profili</small></article>
        ))}
      </section>
      <section className="dashboard-grid two-columns">
        <article className="dashboard-card"><span className="status-dot ready" /> <h3>Supabase Auth i RLS</h3><p>Role są odseparowane w bazie, a administratora nie można wybrać podczas rejestracji.</p></article>
        <article className="dashboard-card"><span className="status-dot pending" /> <h3>Treści do publikacji</h3><p>Dodaj workflow akceptacji zdigitalizowanych zadań przed uruchomieniem płatnego ruchu.</p></article>
      </section>
    </>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState<RoleCounts>(emptyCounts);
  const [guardianRequests, setGuardianRequests] = useState<GuardianRequest[]>([]);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [guardianActionBusy, setGuardianActionBusy] = useState("");
  const [actionError, setActionError] = useState("");
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
            const { data: profiles } = await supabase.from("profiles").select("role");
            const nextCounts = { ...emptyCounts };
            profiles?.forEach((item) => {
              if (isUserRole(item.role)) nextCounts[item.role] += 1;
            });
            setCounts(nextCounts);
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
  }, [refreshParentData]);

  async function decideGuardianRequest(requestId: string, decision: "approve" | "reject") {
    setGuardianActionBusy(requestId);
    setActionError("");
    try {
      const supabase = await getSupabaseClient();
      const functionName = decision === "approve" ? "approve_guardian_request" : "reject_guardian_request";
      const { error: decisionError } = await supabase.rpc(functionName, { target_request_id: requestId });
      if (decisionError) throw decisionError;
      await refreshParentData();
    } catch {
      setActionError("Nie udało się zapisać decyzji opiekuna. Odśwież stronę i spróbuj ponownie.");
    } finally {
      setGuardianActionBusy("");
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
        <Link href="/" aria-label="egzaminio — strona główna"><BrandLogo /></Link>
        <nav aria-label="Panel">
          <a className="active" href="/panel"><span>⌂</span> Start</a>
          <a href="#zadania"><span>✎</span> {profile.role === "parent" ? "Dzieci" : profile.role === "teacher" ? "Zestawy" : profile.role === "admin" ? "Użytkownicy" : "Ćwiczenia"}</a>
          <a href="#postep"><span>↗</span> {profile.role === "admin" ? "Treści CKE" : "Postępy"}</a>
          <a href="#ustawienia"><span>⚙</span> Ustawienia</a>
        </nav>
        <div className="sidebar-plan"><b>Plan bezpłatny</b><span>3 pytania AI dziennie</span><i><em /></i><a href="#plan">Poznaj plan Plus →</a></div>
        <button className="sidebar-signout" type="button" onClick={signOut}>Wyloguj się</button>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div><span>{roleLabels[profile.role]}</span><h1>Cześć, {firstName}!</h1></div>
          <div className="dashboard-account"><span>{displayName.slice(0, 2).toUpperCase()}</span><div><b>{displayName}</b><small>{profile.email}</small></div></div>
        </header>
        <div className="dashboard-content">
          {profile.role === "student" && <StudentPanel />}
          {actionError && profile.role === "parent" && <Alert variant="destructive" className="dashboard-alert"><AlertDescription>{actionError}</AlertDescription></Alert>}
          {profile.role === "parent" && <ParentPanel requests={guardianRequests} linkedChildren={linkedChildren} actionBusy={guardianActionBusy} onApprove={(id) => void decideGuardianRequest(id, "approve")} onReject={(id) => void decideGuardianRequest(id, "reject")} />}
          {profile.role === "teacher" && <TeacherPanel verificationStatus={profile.teacher_verification_status} />}
          {profile.role === "admin" && <AdminPanel counts={counts} />}
        </div>
      </div>
    </main>
  );
}
