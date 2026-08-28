"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getSupabaseClient } from "@/lib/supabase-browser";

const navigation = [
  { key: "how", label: "Jak to działa", href: "/#zadania" },
  { key: "parent", label: "Dla rodziców", href: "/#rodzice" },
  { key: "calculator", label: "Kalkulator punktów", href: "/kalkulator-punktow" },
  { key: "pricing", label: "Cennik", href: "/#cennik" },
] as const;

type HeaderAccount = {
  displayName: string;
  email: string;
};

function accountFromUser(user: User | null): HeaderAccount | null {
  if (!user?.email) return null;
  const displayName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email.split("@")[0] ||
    "Konto";
  return { displayName, email: user.email };
}

function activeNavigationKey(currentPath?: string) {
  if (currentPath?.startsWith("/kalkulator-punktow")) return "calculator";
  if (currentPath === "/plan-plus") return "pricing";
  return null;
}

export function SiteHeader({ currentPath }: { currentPath?: string }) {
  const activeKey = activeNavigationKey(currentPath);
  const [account, setAccount] = useState<HeaderAccount | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    getSupabaseClient()
      .then(async (supabase) => {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (active) {
          setAccount(accountFromUser(data.session?.user ?? null));
          setSessionReady(true);
        }
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (active) {
            setAccount(accountFromUser(session?.user ?? null));
            setSessionReady(true);
          }
        });
        unsubscribe = () => authListener.subscription.unsubscribe();
      })
      .catch(() => {
        if (active) setSessionReady(true);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  async function signOut() {
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
    setAccount(null);
    window.location.assign("/");
  }

  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a>
      <nav className="desktop-nav" aria-label="Główna nawigacja">
        {navigation.map((item) => (
          <a href={item.href} key={item.key} aria-current={activeKey === item.key ? "page" : undefined}>{item.label}</a>
        ))}
      </nav>
      <div className="header-actions">
        {!sessionReady ? <div className="header-session-placeholder" aria-hidden="true" /> : account ? <DropdownMenu>
          <DropdownMenuTrigger asChild><button type="button" className="header-account-session" aria-label={`Menu konta: ${account.displayName}`}><span className="dashboard-account"><span className="dashboard-account-avatar">{account.displayName.slice(0, 2).toUpperCase()}</span><span className="dashboard-account-copy"><b>{account.displayName}</b><small>{account.email}</small></span></span><ChevronDown className="dashboard-session-chevron" aria-hidden="true" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="dashboard-account-menu">
            <DropdownMenuLabel>{account.email}</DropdownMenuLabel>
            <DropdownMenuItem asChild><a href="/panel"><LayoutDashboard aria-hidden="true" /> Przejdź do panelu</a></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="dashboard-signout-item" onSelect={() => void signOut()}><LogOut aria-hidden="true" /> Wyloguj się</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> : <>
          <a className="header-login" href="/logowanie">Zaloguj się</a>
          <Button variant="outline" className="header-cta" asChild><a href="/logowanie?tryb=rejestracja">Załóż konto</a></Button>
        </>}
      </div>
    </header>
  );
}
