"use client";

import { useEffect, useId, useState } from "react";
import { CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeSchoolSearch, schoolThresholdLabel, type RecruitmentThresholdRecord } from "@/lib/recruitment-schools";

export function SchoolThresholdSearch({
  query,
  onQueryChange,
  onSelect,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (record: RecruitmentThresholdRecord) => void;
}) {
  const id = useId();
  const [results, setResults] = useState<RecruitmentThresholdRecord[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const normalized = normalizeSchoolSearch(query);
    if (normalized.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/api/recruitment-schools?q=${encodeURIComponent(normalized)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("unavailable");
        const payload = await response.json() as { results?: RecruitmentThresholdRecord[] };
        const nextResults = payload.results ?? [];
        setResults(nextResults);
        setStatus(nextResults.length ? "idle" : "empty");
        setOpen(true);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setResults([]);
        setStatus("error");
        setOpen(true);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="school-threshold-search">
      <Label htmlFor={`${id}-school`}>Wyszukaj szkołę lub klasę</Label>
      <div className="school-threshold-input"><Search aria-hidden="true" /><Input id={`${id}-school`} role="combobox" aria-expanded={open} aria-controls={`${id}-results`} autoComplete="off" value={query} onChange={(event) => { const next = event.target.value; onQueryChange(next); if (normalizeSchoolSearch(next).length < 2) { setResults([]); setStatus("idle"); setOpen(false); } else setOpen(true); }} onFocus={() => query.length >= 2 && setOpen(true)} placeholder="np. XIV LO Warszawa, mat-fiz" /></div>
      {open && (results.length > 0 || status !== "idle") && <div className="school-threshold-results" id={`${id}-results`} role="listbox">
        {results.map((record) => <button key={record.threshold_id} type="button" role="option" aria-selected="false" onClick={() => { onQueryChange(schoolThresholdLabel(record)); onSelect(record); setOpen(false); }}><CheckCircle2 aria-hidden="true" /><span><b>{record.school_name}</b><small>{record.city} · {record.class_name} · próg {record.recruitment_year}: {record.threshold_points} pkt</small></span></button>)}
        {status === "loading" && <p>Sprawdzam zweryfikowane progi…</p>}
        {status === "empty" && <p>Nie znaleźliśmy jeszcze zweryfikowanego progu. Wpisz nazwę ręcznie i dodaj próg, jeśli go znasz.</p>}
        {status === "error" && <p>Baza progów jest przygotowywana. Nadal możesz wpisać szkołę i próg ręcznie.</p>}
      </div>}
    </div>
  );
}
