#!/usr/bin/env python3
"""Build complete CKE 2025 manifests for the five remaining foreign languages.

The official source files are intentionally kept outside Git.
Run this script with the bundled Codex Python runtime, which includes pdfplumber.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = "https://cke.gov.pl/egzamin-osmoklasisty/arkusze/2025-2/"
POINTS = [5, 4, 4, 3, 4, 2, 4, 3, 4, 3, 3, 3, 3, 10]
TOPICS = [
    "Rozumienie ze słuchu — wybór wielokrotny",
    "Rozumienie ze słuchu — dopasowywanie",
    "Funkcje językowe — rozumienie ze słuchu",
    "Rozumienie ze słuchu — uzupełnianie luk",
    "Funkcje językowe",
    "Funkcje językowe — uzupełnianie dialogów",
    "Rozumienie tekstów pisanych",
    "Spójność tekstu",
    "Wyszukiwanie informacji",
    "Przetwarzanie wypowiedzi",
    "Środki językowe — wybór wyrazów",
    "Środki językowe — gramatyka i leksyka",
    "Transformacje leksykalno-gramatyczne",
    "Wypowiedź pisemna — e-mail",
]


LANGUAGES = {
    "french": {
        "pl": "francuski", "dir": "jezyk_francuski", "code": "OJFP",
        "booklet_pages": [4, 5],
        "recording": "OJFP-100-2505_OJFU-100-2505.mp3",
        "transcript": "OJFP-100-2505_OJFU-100-2505-transkrypcja.pdf", "rules": "OJFP-100-2505-zasady.pdf",
        "keys": ["B, B, C, B, A", "C, B, A, E", "E, B, D, A", "11 / onze; grands-parents; l’avion", "C, A, B, B", "J’aime / J’adore / J’aime beaucoup / J’aime bien / Je suis fasciné par; Je suis (vraiment) désolée / Désolée / Je te demande pardon / Pardonne-moi / Excuse-moi / Je vous demande pardon / Pardonnez-moi / Excusez-moi", "A, C, C, A", "C, A, D", "C, A, B, A", "komedii (romantycznej) / filmu; w 3. piątek grudnia / w trzeci piątek grudnia; (śmieszne/zimowe) skarpety/skarpetki", "D, A, B", "B, A, C", "il est né / est né; parce que / car; bois vite"],
    },
    "spanish": {
        "pl": "hiszpański", "dir": "jezyk_hiszpanski", "code": "OJHP",
        "booklet_pages": [3, 4],
        "recording": "OJHP-100-2505_OJHU-100-2505.mp3",
        "transcript": "OJHP-100-2505_OJHU-100-2505-transkrypcja.pdf", "rules": "OJHP-100-2505-zasady.pdf",
        "keys": ["B, A, A, C, A", "D, B, A, E", "C, E, B, A", "cuarenta; más; cocinera", "B, C, B, A", "cómo se dice; Encantado / Me alegro", "C, B, C, C", "D, B, C", "C, A, C, B", "samodzielnie/samemu zrobić; lipca; przygotowywać posiłki/jedzenie", "D, A, E", "C, A, A", "fui al médico / fui al doctor; dónde están / dónde se encuentran; decirme"],
    },
    "german": {
        "pl": "niemiecki", "dir": "jezyk_niemiecki", "code": "OJNP",
        "booklet_pages": [4, 5],
        "recording": "OJNP-100-2505_OJNU-100-2505.mp3",
        "transcript": "OJNP-100-200-400-2505_OJNU-100-2505-transkrypcja.pdf", "rules": "OJNP-100-200-400-2505-zasady.pdf",
        "open_answer_card": "OJNP-100-X-2505-karta-rozwiazan.pdf",
        "keys": ["A, B, B, C, B", "D, E, B, A", "A, D, E, C", "7. / siebte; Bus; Plattform", "C, A, C, B", "mag / esse / habe oraz nazwa potrawy w języku niemieckim; darf / kann", "C, B, A, B", "D, A, B", "B, A, C, B", "3 / trzy; polityki; śniadanie", "F, E, B", "B, C, A", "Guten Morgen / Guten Tag; musst; Ich jogge / Ich laufe"],
    },
    "russian": {
        "pl": "rosyjski", "dir": "jezyk_rosyjski", "code": "OJRP",
        "booklet_pages": [4, 5],
        "recording": "OJRP-100-2505_OJRU-100-2505.mp3",
        "transcript": "OJRP-100-2505_OJRU-100-2505-transkrypcja.pdf", "rules": "OJRP-100-2505-zasady.pdf",
        "open_answer_card": "OJRP-100-X-2505-karta-rozwiazan.pdf",
        "keys": ["A, B, C, A, B", "C, E, A, D", "C, A, E, B", "в лицее; ветеринара; из школьной столовой", "C, B, A, C", "сколько стоит; что у вас болит / что у Вас болит", "B, A, B, C", "D, B, A", "C, A, C, B", "poniedziałek/poniedziałki; 10/dziesięć; jej książkę", "B, F, A", "C, A, B", "гуляю / гулял / гуляла с собакой; этих журналов; позвоним в среду"],
    },
    "italian": {
        "pl": "włoski", "dir": "jezyk_wloski", "code": "OJWP",
        "booklet_pages": [3, 4],
        "recording": "OJWP-100-2505_OJWU-100-2505.mp3",
        "transcript": "OJWP-100-2505_OJWU-100-2505-transkrypcja.pdf", "rules": "OJWP-100-2505-zasady.pdf",
        "keys": ["B, A, C, C, A", "B, D, E, A", "B, E, D, C", "40 / quaranta; rumorosi; cuoca", "B, B, C, A", "Piacere; resta / rimani", "B, A, C, B", "D, A, C", "B, A, C, B", "zrobić samemu/samodzielnie; namiotach; pociągiem", "E, B, C", "C, A, C", "di dove sei / da dove vieni; aprite i vostri quaderni; quanto tempo"],
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def clean_text(value: str) -> str:
    # PDF extractors can emit control characters that JSON accepts but
    # PostgreSQL text/jsonb rejects (notably U+0000). Strip those artifacts
    # before any extracted content reaches a manifest.
    value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value.replace("\u00ad", ""))
    lines: list[str] = []
    for line in value.splitlines():
        line = re.sub(r"\s+", " ", line).strip()
        if not line:
            continue
        if re.match(r"^(Strona \d+ z \d+|[A-Z]{4}-100-2505|PRZENIEŚ ROZWIĄZANIA|WYPEŁNIA EGZAMINATOR|Zapisy na marginesie)", line):
            continue
        if line.startswith("Układ graficzny") or line.startswith("© CKE"):
            continue
        lines.append(line)
    text = "\n".join(lines)
    text = re.sub(r"^Zadanie\s+\d+\.\s*\(0[–-]\d+\)\s*", "", text)
    text = re.split(r"\b(?:CZYSTOPIS|BRUDNOPIS)\b", text, maxsplit=1, flags=re.IGNORECASE)[0].strip()
    return text


def extract_tasks(booklet: Path) -> list[dict]:
    page_texts: list[str] = []
    with pdfplumber.open(booklet) as pdf:
        for page in pdf.pages:
            page_texts.append(page.extract_text(x_tolerance=2, y_tolerance=3) or "")

    joined = "\n".join(f"\n[[PAGE:{index}]]\n{text}" for index, text in enumerate(page_texts, 1))
    matches = list(re.finditer(r"Zadanie\s+(\d+)\.\s*\(0[–-](\d+)\)", joined))
    if [int(match.group(1)) for match in matches] != list(range(1, 15)):
        raise RuntimeError(f"Nie udało się rozpoznać wszystkich 14 zadań w {booklet}")

    tasks = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(joined)
        block = joined[match.start():end]
        start_page = int(re.findall(r"\[\[PAGE:(\d+)\]\]", joined[:match.start()])[-1])
        pages = [start_page]
        markers = list(re.finditer(r"\[\[PAGE:(\d+)\]\]", block))
        for marker_index, page_marker in enumerate(markers):
            fragment_end = markers[marker_index + 1].start() if marker_index + 1 < len(markers) else len(block)
            if clean_text(block[page_marker.end():fragment_end]):
                pages.append(int(page_marker.group(1)))
        pages = sorted(set(pages))
        block = re.sub(r"\[\[PAGE:\d+\]\]", "", block)
        tasks.append({"number": int(match.group(1)), "pages": pages or [1], "prompt": clean_text(block)})
    return tasks


def extract_open_answer_card_tasks(path: Path) -> dict[int, dict]:
    """Extract tasks printed on the separate German/Russian open-answer card."""
    page_map = {4: [2], 6: [3], 10: [4, 5], 13: [6], 14: [6]}
    result: dict[int, dict] = {}
    with pdfplumber.open(path) as pdf:
        for number, page_numbers in page_map.items():
            text = "\n".join(pdf.pages[page_number - 1].extract_text(x_tolerance=2, y_tolerance=3) or "" for page_number in page_numbers)
            # pdfplumber may split the word "Zadanie" into spaced glyph groups.
            text = re.sub(r"Z\s*a\s*d\s*a\s*n\s*i\s*e", "Zadanie", text, flags=re.IGNORECASE)
            start = re.search(rf"Zadanie\s+{number}\.\s*\(0[–-]\d+\)", text, flags=re.IGNORECASE)
            if not start:
                raise RuntimeError(f"Nie znaleziono zadania {number} na stronach {page_numbers} pliku {path}")
            next_task = re.search(r"Zadanie\s+\d+\.\s*\(0[–-]\d+\)", text[start.end():], flags=re.IGNORECASE)
            end = start.end() + next_task.start() if next_task else len(text)
            prompt = clean_text(text[start.start():end])
            # In the German card the task-14 heading is placed above task 13 in the PDF
            # reading order, while the actual writing prompt follows task 13.
            if number == 14 and len(prompt) < 300 and "Twoja klasa" in text:
                prompt = clean_text("Zadanie 14. (0–10)\n" + text[text.index("Twoja klasa"):])
            result[number] = {"number": number, "pages": page_numbers, "prompt": prompt}
    return result


def source_entry(identifier: str, path: Path, label: str) -> dict:
    return {"id": identifier, "path": path.relative_to(ROOT).as_posix(), "sha256": sha256(path), "label": label}


def render_page(booklet: Path, page: int, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    stem = output.with_suffix("")
    subprocess.run([
        "pdftoppm", "-f", str(page), "-l", str(page), "-r", "144", "-png", "-singlefile",
        str(booklet), str(stem),
    ], check=True)


def build_language(subject: str, config: dict) -> None:
    code = config["code"]
    source_dir = ROOT / "content/cke/sources/2025" / config["dir"]
    booklet = source_dir / f"{code}-100-X-2505-zeszyt-zadan.pdf"
    recording = source_dir / config["recording"]
    transcript = source_dir / config["transcript"]
    rules = source_dir / config["rules"]
    answer_card = source_dir / f"{code}-100-X-2505-karta-odpowiedzi.pdf"
    open_answer_card = source_dir / config["open_answer_card"] if config.get("open_answer_card") else None
    required = [booklet, recording, transcript, rules, answer_card] + ([open_answer_card] if open_answer_card else [])
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError("Brak plików źródłowych:\n" + "\n".join(missing))

    prefix = f"cke-2025-main-{subject}-100-x"
    public_dir = ROOT / "public/cke/2025" / subject / f"{code.lower()}-100-x-2505"
    public_dir.mkdir(parents=True, exist_ok=True)
    public_audio = public_dir / f"{code.lower()}-100-2505.mp3"
    shutil.copyfile(recording, public_audio)

    picture_assets: list[dict] = []
    for page in config["booklet_pages"]:
        image_path = public_dir / f"q01-options-page-{page}.png"
        render_page(booklet, page, image_path)
        picture_assets.append({
            "id": f"q01-options-page-{page}",
            "path": image_path.relative_to(ROOT).as_posix(),
            "sha256": sha256(image_path),
            "alt": f"Strona {page} arkusza CKE z opcjami do zadania 1 z języka {config['pl']}.",
            "caption": "Opcje tekstowe i obrazkowe do zadania 1.",
            "mime_type": "image/png",
        })

    audio_asset = {
        "id": "official-recording",
        "path": public_audio.relative_to(ROOT).as_posix(),
        "sha256": sha256(public_audio),
        "alt": f"Pełne oficjalne nagranie CKE do zadań 1–4 z języka {config['pl']}.",
        "caption": f"Oficjalne nagranie CKE 2025 — język {config['pl']}, zadania 1–4",
        "mime_type": "audio/mpeg",
    }

    tasks = extract_tasks(booklet)
    if open_answer_card:
        open_tasks = extract_open_answer_card_tasks(open_answer_card)
        tasks = [open_tasks.get(task["number"], task) for task in tasks]

    questions = []
    for task in tasks:
        number = task["number"]
        max_points = POINTS[number - 1]
        blocks: list[dict] = []
        assets: list[dict] = []
        if number <= 4:
            blocks.append({"type": "audio", "asset_id": "official-recording"})
            assets.append(audio_asset)
        if number == 1:
            for image_asset in picture_assets:
                blocks.append({"type": "image", "asset_id": image_asset["id"]})
                assets.append(image_asset)

        if number == 14:
            answer_key = {"assessment": "rubric", "minimum_words": 50, "maximum_words": 120}
            rules_list = [
                "0–4 pkt – treść: odniesienie się do trzech podpunktów i ich rozwinięcie.",
                "0–2 pkt – spójność i logika wypowiedzi.",
                "0–2 pkt – zakres środków językowych.",
                "0–2 pkt – poprawność środków językowych.",
            ]
            explanation = "Odpowiedź jest oceniana według oficjalnej skali CKE: treść, spójność, zakres i poprawność językowa."
        else:
            official_key = config["keys"][number - 1]
            answer_key = {"accepted_results": [official_key], "assessment": "rubric"}
            rules_list = [f"Łącznie {max_points} pkt; punktacja cząstkowa zgodnie z zasadami CKE. Klucz: {official_key}."]
            explanation = f"Poprawny klucz według zasad oceniania CKE: {official_key}."

        questions.append({
            "id": f"{prefix}-q{number:02d}", "number": str(number), "sort_order": number,
            "source_pages": task["pages"], "type": "long_text", "topic": TOPICS[number - 1],
            "difficulty": 3 if number in (4, 13, 14) else 2, "prompt": task["prompt"],
            "answer_key": answer_key, "scoring": {"max_points": max_points, "rules": rules_list},
            "explanation": explanation,
            "solution_steps": ["Przeczytaj polecenie i wszystkie odpowiedzi lub luki.", "Wskaż fragment nagrania albo tekstu, który uzasadnia rozwiązanie.", "Sprawdź odpowiedź z kluczem i przeanalizuj ewentualny błąd."],
            "hints": ["Najpierw określ, jakiej informacji wymaga polecenie.", "W zadaniach językowych zwróć uwagę zarówno na znaczenie, jak i poprawność gramatyczną."],
            "content_blocks": blocks, "assets": assets,
        })

    manifest = {
        "schema_version": 1, "manifest_id": prefix, "manifest_version": 1,
        "paper": {
            "id": prefix, "source_document_id": f"{code}-100-X-2505",
            "source_pdf_sha256": sha256(booklet), "source_url": SOURCE_URL,
            "source_label": f"CKE 2025 · język {config['pl']} · termin główny · wariant 100-X",
            "exam_year": 2025, "exam_session": "main", "subject": subject, "variant_code": "100-X", "question_count": 14,
            "supplementary_sources": [
                source_entry(f"cke-2025-{subject}-recording", recording, "Oficjalne nagranie do zadań 1–4"),
                source_entry(f"cke-2025-{subject}-transcript", transcript, "Transkrypcja nagrań"),
                source_entry(f"cke-2025-{subject}-answer-card", answer_card, "Karta odpowiedzi, wersja X"),
                source_entry(f"cke-2025-{subject}-scoring-rules", rules, "Zasady oceniania rozwiązań"),
            ] + ([source_entry(f"cke-2025-{subject}-open-answer-card", open_answer_card, "Karta rozwiązań zadań otwartych")] if open_answer_card else []),
        },
        "permission": {
            "reference": "Zgoda CKE na wykorzystanie materiałów potwierdzona przez operatora egzaminio",
            "verified_by": "Tomasz Piłat", "verified_at": "2026-08-28T12:00:00Z",
            "notes": "Przed publikacją produkcyjną dołącz numer lub lokalizację dokumentu zgody do rejestru zgodności poza repozytorium.",
        },
        "questions": questions,
    }
    target = ROOT / "content/cke" / f"{prefix}.json"
    target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{target.relative_to(ROOT)}: 14 zadań / {sum(POINTS)} pkt")


if __name__ == "__main__":
    for language, settings in LANGUAGES.items():
        build_language(language, settings)
