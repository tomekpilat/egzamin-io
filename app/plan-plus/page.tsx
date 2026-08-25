/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { BrandLogo } from "@/components/brand-logo";
import { MarketingSignupForm } from "@/components/marketing-signup-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculatePlusEconomics,
  formatPln,
  PLAN_COMPARISON_ROWS,
  PLUS_ANNUAL_PRICE_PLN,
  resolvePlusCheckout,
} from "@/lib/plans";

const economics = calculatePlusEconomics();

export default function PlanPlusPage() {
  const checkout = resolvePlusCheckout(process.env.NEXT_PUBLIC_PLUS_CHECKOUT_URL);

  return (
    <main className="plan-plus-page">
      <header className="plan-plus-header">
        <a href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a>
        <Button variant="ghost" asChild><a href="/panel">← Wróć do panelu</a></Button>
      </header>

      <section className="plan-plus-shell">
        <div className="plan-plus-hero">
          <div>
            <Badge variant="secondary">Plan Plus · wkrótce</Badge>
            <h1>Regularna nauka bez dokładania presji.</h1>
            <p>Pełna baza ćwiczeń, więcej rozmów z AI oraz plan powtórek dla ucznia. Rodzic widzi trend i konkretny następny krok.</p>
          </div>
          <Card className="plan-plus-price-card">
            <CardHeader><CardTitle>Plus na 12 miesięcy</CardTitle></CardHeader>
            <CardContent>
              <b>{PLUS_ANNUAL_PRICE_PLN} zł</b>
              <span>łączna cena za 12 miesięcy</span>
              <small>{formatPln(economics.monthly)} zł miesięcznie to wyłącznie przeliczenie pomocnicze.</small>
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

        <Card className="pricing-table-card plan-plus-comparison">
          <div className="pricing-table-head"><span>Porównanie</span><div><b>Free</b><small>0 zł</small></div><div className="plus-heading"><b>Plus</b><small>{PLUS_ANNUAL_PRICE_PLN} zł / 12 miesięcy</small></div></div>
          <div className="pricing-table" role="table" aria-label="Dokładne porównanie planu Free i Plus">
            {PLAN_COMPARISON_ROWS.map(([feature, free, plus]) => <div className="pricing-row" role="row" key={feature}><b role="rowheader">{feature}</b><span role="cell">{free}</span><span role="cell">{plus}</span></div>)}
          </div>
          <div className="pricing-value"><b>{checkout.enabled ? "Roczny dostęp z możliwością anulowania" : "Sprzedaż jeszcze nie wystartowała"}</b><span>{checkout.enabled ? "Plan odnawia się co 12 miesięcy. Możesz anulować przed datą kolejnego odnowienia, zachowując dostęp do końca opłaconego okresu." : "Nie pobieramy teraz płatności i nie przekierowujemy do nieaktywnego checkoutu."}</span></div>
          <div className="pricing-actions">{checkout.enabled ? <Button asChild><a href={checkout.url}>Zamawiam i płacę {PLUS_ANNUAL_PRICE_PLN} zł</a></Button> : <Button asChild><a href="#lista-plus">Powiadom mnie o starcie</a></Button>}<Button variant="outline" asChild><a href="/panel">Zostań przy planie Free</a></Button></div>
          {!checkout.enabled ? <div id="lista-plus"><MarketingSignupForm subscriptionType="plus_waitlist" sourcePath="/plan-plus" title="Lista oczekujących Plus" description="Podaj e-mail. Powiadomimy Cię o starcie sprzedaży i cenie — bez pobierania płatności." submitLabel="Powiadom mnie o starcie" /></div> : null}
        </Card>

        <section className="plan-plus-terms" aria-labelledby="plan-plus-terms-title">
          <h2 id="plan-plus-terms-title">Najważniejsze zasady</h2>
          <p>{checkout.enabled ? "Przed zamówieniem sprawdź datę rozpoczęcia dostępu, zasady odnowienia, anulowania i odstąpienia. Szczegóły są dostępne w dokumentach poniżej." : "Przed uruchomieniem sprzedaży pokażemy datę rozpoczęcia dostępu, zasady odnowienia i sposób anulowania. Zakup zostanie uruchomiony dopiero po wdrożeniu bezpiecznych płatności."}</p>
          <nav aria-label="Informacje prawne planu Plus"><a href="/regulamin">Regulamin</a><a href="/polityka-prywatnosci">Polityka prywatności</a><a href="/odstapienie-od-umowy">Odstąpienie od umowy</a><a href="/informacje-prawne">Informacje o płatnościach</a></nav>
        </section>
      </section>
    </main>
  );
}
