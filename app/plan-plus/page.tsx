/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculatePlusPackageEconomics,
  FREE_AI_QUESTIONS_PER_DAY,
  PLAN_COMPARISON_ROWS,
  PLUS_AI_QUESTIONS_PER_DAY,
  PLUS_PACKAGE_PRICE_PLN,
} from "@/lib/plans";

const economics = calculatePlusPackageEconomics();

export default function PlanPlusPage() {
  return (
    <main className="plan-plus-page">
      <SiteHeader currentPath="/plan-plus" />

      <section className="plan-plus-shell">
        <div className="plan-plus-hero">
          <div>
            <Badge variant="secondary">Pakiet Plus · dostępny</Badge>
            <h1>Regularna nauka bez dokładania presji.</h1>
            <p>Free obejmuje wszystkie arkusze, {FREE_AI_QUESTIONS_PER_DAY} pytania do AI dziennie i podstawowy postęp. Plus daje ćwiczenia bez limitu, {PLUS_AI_QUESTIONS_PER_DAY} pytań do AI oraz szczegółowe wyniki i powtórki.</p>
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
            <CardContent><p>Interaktywne rozwiązywanie bez limitu, nauczyciel AI i powtórki dobrane do tematów, które wymagają uwagi.</p></CardContent>
          </Card>
          <Card id="dla-rodzica">
            <CardHeader><Badge variant="outline">Dla rodzica</Badge><CardTitle>Widzisz postęp i wiesz, jak wspierać.</CardTitle></CardHeader>
            <CardContent><p>Trend, regularność, wykorzystanie AI i czytelna rekomendacja pomagają spokojnie zaplanować kolejny krok w nauce.</p></CardContent>
          </Card>
        </div>

        <Card className="pricing-table-card plan-plus-comparison" id="porownanie">
          <div className="pricing-table-head"><span>Porównanie</span><div><b>Free</b><small>0 zł</small></div><div className="plus-heading"><b>Pakiet Plus</b><small>{PLUS_PACKAGE_PRICE_PLN} zł / pakiet</small></div></div>
          <div className="pricing-table" role="table" aria-label="Dokładne porównanie wersji Free i pakietu Plus">
            {PLAN_COMPARISON_ROWS.map(([feature, free, plus]) => <div className="pricing-row" role="row" key={feature}><b role="rowheader">{feature}</b><span role="cell">{free}</span><span role="cell">{plus}</span></div>)}
          </div>
          <div className="pricing-value"><b>Czy pakiet się opłaca?</b><span>Przy przykładowej stawce {economics.tutoringHourlyPrice} zł za godzinę dwie korepetycje kosztują {economics.twoTutoringHours} zł. Pakiet Plus kosztuje {PLUS_PACKAGE_PRICE_PLN} zł jednorazowo, czyli o {economics.differenceVsTwoHours} zł mniej. Wspiera codzienną naukę, ale nie zastępuje indywidualnego nauczyciela.</span></div>
          <div className="pricing-actions"><Button asChild><a href="/panel?widok=platnosci" data-analytics-event="plan_plus_cta_clicked">Zamawiam pakiet i płacę {PLUS_PACKAGE_PRICE_PLN} zł</a></Button><Button variant="outline" asChild><a href="/panel">Zostań przy wersji Free</a></Button></div>
        </Card>

        <section className="plan-plus-terms" aria-labelledby="plan-plus-terms-title">
          <h2 id="plan-plus-terms-title">Najważniejsze zasady</h2>
          <p>Pakiet nie odnawia się automatycznie. Jest dostępny od razu po skutecznej płatności. Dokładną datę zakończenia dostępu zobaczysz przed zamówieniem. Sprawdź także zakres pakietu i zasady odstąpienia.</p>
          <nav aria-label="Informacje prawne pakietu Plus"><a href="/regulamin">Regulamin</a><a href="/polityka-prywatnosci">Polityka prywatności</a><a href="/odstapienie-od-umowy">Odstąpienie od umowy</a><a href="/informacje-prawne">Informacje o płatnościach</a></nav>
        </section>
      </section>
    </main>
  );
}
