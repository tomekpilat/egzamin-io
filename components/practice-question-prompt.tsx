type PromptChoice = {
  label: string;
  text: string;
};

export type PracticePromptItem = {
  label: string;
  text: string;
  choices: PromptChoice[];
};

export type PracticePromptLayout = {
  intro: string;
  items: PracticePromptItem[];
  choices: PromptChoice[];
  isLong: boolean;
};

function splitChoices(value: string) {
  const markers = [...value.matchAll(/(^|[\n\r]|[.!?;:]\s+)([A-F])(?:[.)])?\s+/gu)].map((match) => ({
    label: match[2],
    markerStart: (match.index ?? 0) + match[1].length,
    contentStart: (match.index ?? 0) + match[0].length,
  }));

  if (markers.length < 2) return { text: value.trim(), choices: [] as PromptChoice[] };

  return {
    text: value.slice(0, markers[0].markerStart).trim(),
    choices: markers.map((marker, index) => ({
      label: marker.label,
      text: value.slice(marker.contentStart, markers[index + 1]?.markerStart ?? value.length).trim().replace(/;$/u, ""),
    })),
  };
}

export function parsePracticePrompt(prompt: string): PracticePromptLayout {
  const normalized = prompt.replace(/\r\n?/gu, "\n").replace(/[ \t]+\n/gu, "\n").trim();
  const itemMarkers = [...normalized.matchAll(/(?:^|\s)(\d{1,2}\.\d{1,2}\.?)(?=\s)/gu)].map((match) => ({
    label: match[1],
    start: (match.index ?? 0) + match[0].length - match[1].length,
    contentStart: (match.index ?? 0) + match[0].length,
  }));

  if (itemMarkers.length >= 2) {
    return {
      intro: normalized.slice(0, itemMarkers[0].start).trim(),
      items: itemMarkers.map((marker, index) => {
        const content = normalized.slice(marker.contentStart, itemMarkers[index + 1]?.start ?? normalized.length).trim();
        const parsed = splitChoices(content);
        return { label: marker.label.replace(/\.$/u, ""), text: parsed.text, choices: parsed.choices };
      }),
      choices: [],
      isLong: normalized.length >= 220,
    };
  }

  const parsed = splitChoices(normalized);
  return {
    intro: parsed.text,
    items: [],
    choices: parsed.choices,
    isLong: normalized.length >= 220,
  };
}

function PromptChoices({ choices }: { choices: PromptChoice[] }) {
  if (!choices.length) return null;
  return <ul className="task-prompt-choices" aria-label="Warianty odpowiedzi w treści zadania">
    {choices.map((choice) => <li key={`${choice.label}-${choice.text}`}><b>{choice.label}</b><span>{choice.text}</span></li>)}
  </ul>;
}

export function PracticeQuestionPrompt({ prompt }: { prompt: string }) {
  const layout = parsePracticePrompt(prompt);
  const className = ["task-prompt-copy", "mathjax_process", layout.isLong && "is-long", layout.items.length > 0 && "is-structured"].filter(Boolean).join(" ");

  return <div className={className}>
    {layout.intro && <h1>{layout.intro}</h1>}
    {layout.items.length > 0 && <ol className="task-prompt-items" aria-label="Podpunkty zadania">
      {layout.items.map((item) => <li key={`${item.label}-${item.text}`}>
        <span className="task-prompt-number">{item.label}</span>
        <div>
          {item.text && <p>{item.text}</p>}
          <PromptChoices choices={item.choices} />
        </div>
      </li>)}
    </ol>}
    <PromptChoices choices={layout.choices} />
  </div>;
}
