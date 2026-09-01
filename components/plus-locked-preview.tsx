import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type PlusLockedFeature = {
  title: string;
  description: string;
};

export function PlusLockedPreview({
  title,
  description,
  features,
  href,
  actionLabel,
}: {
  title: string;
  description: string;
  features: PlusLockedFeature[];
  href: string;
  actionLabel: string;
}) {
  return <section className="plus-locked-preview" aria-label={title}>
    <header className="plus-locked-heading">
      <div><Badge variant="secondary">Pakiet Plus</Badge><h3>{title}</h3><p>{description}</p></div>
      <Button asChild><a href={href}>{actionLabel}</a></Button>
    </header>
    <div className="plus-locked-content" aria-label="Podgląd funkcji dostępnych w Pakiecie Plus" aria-disabled="true">
      {features.map((feature, index) => <article key={feature.title}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div><b>{feature.title}</b><p>{feature.description}</p><i aria-hidden="true"><em style={{ width: `${64 + (index % 3) * 11}%` }} /></i></div>
      </article>)}
    </div>
    <small>To podgląd — dane zostaną uzupełnione automatycznie po aktywacji Plus.</small>
  </section>;
}
