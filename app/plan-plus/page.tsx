/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { MarketingSignupForm } from "@/components/marketing-signup-form";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculatePlusPackageEconomics,
  PLAN_COMPARISON_ROWS,
  PLUS_PACKAGE_PRICE_PLN,
  resolvePlusCheckout,
} from "@/lib/plans";

const economics = calculatePlusPackageEconomics();

export default function PlanPlusPage() {
  const checkout = resolvePlusCheckout(process.env.NEXT_PUBLIC_PLUS_CHECKOUT_URL);

  return (
    <main className="plan-plus-page">
      <SiteHeader currentPath="/plan-plus" />

      <section className="plan-plus-shell">
        <div className="plan-plus-hero">
          <div>
            <Badge variant="secondary">Pakiet Plus · wkrótce</Badge>
            <h1>Regularna nauka bez dokładania presji.</h1>
            <p>Pełna baza ćwiczeń, więcej rozmów z AI oraz plan powtórek dla ucznia. Rodzic widzi trend i konkretny następny krok.</p>
          </div>
          <Card className="plan-plus-price-card">
            <CardHeader><CardTitle>Pakiet Plus</CardTitle></CardHeader>
            <CardContent>
              <b>{PLUS_PACKAGE_PRICE_PLN} zł</b>
              <span>jednorazowa płatność</span>
              <small>Bez abonamentu i automatycznego odnowienia.</small>
            </CardContent>
          </Card>
        </div>

        <div className="plan-plus-role-grid">
          <Card id="dla-ucznia">
            <CardHeader><Badge variant="outline">Dla ucznia</Badge><CardTitle>Wiesz, co ćwiczyć dalej.</CardTitle></CardHeader>
            <CardContent><p>Więcej pytań do AI, pełna baza zadań i powtórki dobrane do tematów, które wymagają uwagi.</p></CardContent>
          </Card>
          <Card id="dla-rodzica">
            <CardHeader><Badge variant="outline">Dla rodzica</Badge><CardTitle>Widzisz postęp, nie prywatne rozmowy.</CardTitle></CardHeader>
            <CardContent><p>Trend, regularność, raport i jedna rekomendacja na tydzień — bez zaglądania dziecku przez ramię.</p></CardContent>
          </Card>
        </div>

        <Card className="pricing-table-card plan-plus-comparison" id="porownanie">
          <div className="pricing-table-head"><span>Porównanie</span><div><b>Free</b><small>0 zł</small></div><div className="plus-heading"><b>Pakiet Plus</b><small>{PLUS_PACKAGE_PRICE_PLN} zł / pakiet</small></div></div>
          <div className="pricing-table" role="table" aria-label="Dokładne porównanie wersji Free i pakietu Plus">
            {PLAN_COMPARISON_ROWS.map(([feature, free, plus]) => <div className="pricing-row" role="row" key={feature}><b role="rowheader">{feature}</b><span role="cell">{free}</span><span role="cell">{plus}</span></div>)}
          </div>
          <div className="pricing-value"><b>Czy pakiet się opłaca?</b><span>Przy przykładowej stawce {economics.tutoringHourlyPrice} zł za godzinę dwie korepetycje kosztują {economics.twoTutoringHours} zł. Pakiet Plus kosztuje {PLUS_PACKAGE_PRICE_PLN} zł jednorazowo, czyli o {economics.differenceVsTwoHours} zł mniej. Wspiera codzienną naukę, ale nie zastępuje indywidualnego nauczyciela.</span></div>
          <div className="pricing-actions">{checkout.enabled ? <Button asChild><a href={checkout.url} data-analytics-event="plan_plus_cta_clicked">Zamawiam pakiet i płacę {PLUS_PACKAGE_PRICE_PLN} zł</a></Button> : <Button asChild><a href="#lista-plus" data-analytics-event="plan_plus_cta_clicked">Powiadom mnie o starcie</a></Button>}<Button variant="outline" asChild><a href="/panel">Zostań przy wersji Free</a></Button></div>
          {!checkout.enabled ? <div id="lista-plus"><MarketingSignupForm subscriptionType="plus_waitlist" sourcePath="/plan-plus" title="Lista oczekujących na pakiet Plus" description="Podaj e-mail. Powiadomimy Cię o starcie sprzedaży i cenie — bez pobierania płatności." submitLabel="Powiadom mnie o starcie" /></div> : null}
        </Card>

        <section className="plan-plus-terms" aria-labelledby="plan-plus-terms-title">
          <h2 id="plan-plus-terms-title">Najważniejsze zasady</h2>
          <p>{checkout.enabled ? "Pakiet nie odnawia się automatycznie. Przed zamówieniem sprawdź zakres, datę rozpoczęcia i zakończenia dostępu oraz zasady odstąpienia. Szczegóły są dostępne w dokumentach poniżej." : "Przed uruchomieniem sprzedaży pokażemy dokładny zakres pakietu oraz datę rozpoczęcia i zakończenia dostępu. Zakup zostanie uruchomiony dopiero po wdrożeniu bezpiecznych płatności."}</p>
          <nav aria-label="Informacje prawne pakietu Plus"><a href="/regulamin">Regulamin</a><a href="/polityka-prywatnosci">Polityka prywatności</a><a href="/odstapienie-od-umowy">Odstąpienie od umowy</a><a href="/informacje-prawne">Informacje o płatnościach</a></nav>
        </section>
      </section>
    </main>
  );
}
