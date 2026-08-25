import type { UserRole } from "@/lib/roles";

export type AccountRoutingProfile = {
  role: UserRole;
  onboarding_completed: boolean;
  legal_version: string | null;
  guardian_email: string | null;
  guardian_consent_at: string | null;
};

export type AccountRoute = "/panel" | "/wybierz-role" | "/oczekuje-na-zgode" | "/zaakceptuj-zmiany";

export function resolveAccountRoute(profile: AccountRoutingProfile, currentLegalVersion: string): AccountRoute {
  if (profile.role === "admin") return "/panel";
  if (profile.role === "student" && !profile.guardian_consent_at) {
    return profile.guardian_email ? "/oczekuje-na-zgode" : "/wybierz-role";
  }
  if (!profile.onboarding_completed) return "/wybierz-role";
  if (profile.legal_version !== currentLegalVersion) return "/zaakceptuj-zmiany";
  return "/panel";
}
