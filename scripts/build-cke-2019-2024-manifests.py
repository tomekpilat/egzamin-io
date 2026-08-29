#!/usr/bin/env python3
"""Build standard CKE exam manifests for 2019–2024 from official PDFs.

The source papers are supplied by the operator in ~/Downloads. Supplementary
scoring rules, transcripts and recordings are downloaded from the official CKE
archive and retained in the ignored content/cke/sources directory.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path.home() / "Downloads"
YEARS = {
    2019: ("1904", "https://cke.gov.pl/egzamin-osmoklasisty/arkusze/2019-2/"),
    2020: ("2004", "https://cke.gov.pl/egzamin-osmoklasisty/arkusze/2020-2/"),
    2021: ("2105", "https://cke.gov.pl/egzamin-osmoklasisty/arkusze/2021-2/"),
    2022: ("2205", "https://cke.gov.pl/egzamin-osmoklasisty/arkusze/2022-2/"),
    2023: ("2305", "https://cke.gov.pl/egzamin-osmoklasisty/arkusze/2023-2/"),
    2024: ("2405", "https://cke.gov.pl/egzamin-osmoklasisty/arkusze/2024-2/"),
}
SUBJECTS = {
    "polish": ("OPOP", "język polski"),
    "mathematics": ("OMAP", "matematyka"),
    "english": ("OJAP", "język angielski"),
    "french": ("OJFP", "język francuski"),
    "spanish": ("OJHP", "język hiszpański"),
    "german": ("OJNP", "język niemiecki"),
    "russian": ("OJRP", "język rosyjski"),
    "italian": ("OJWP", "język włoski"),
}
LANGUAGE_SUBJECTS = set(SUBJECTS) - {"polish", "mathematics"}
LANGUAGE_TOPICS = [
    "Rozumienie ze słuchu — wybór wielokrotny",
    "Rozumienie ze słuchu — dopasowywanie",
    "Rozumienie ze słuchu — uzupełnianie luk",
    "Rozumienie ze słuchu — zadanie otwarte",
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
PERMISSION = {
    "reference": "Zgoda CKE na wykorzystanie materiałów potwierdzona przez operatora egzaminio",
    "verified_by": "Tomasz Piłat",
    "verified_at": "2026-08-28T12:00:00Z",
    "notes": "Przed publikacją produkcyjną dołącz numer lub lokalizację dokumentu zgody do rejestru zgodności poza repozytorium.",
}


@dataclass(frozen=True)
class Paper:
    year: int
    token: str
    source_url: str
    subject: str
    code: str
    label: str
    download_name: str

    @property
    def prefix(self) -> str:
        return f"cke-{self.year}-main-{self.subject}-100-x"

    @property
    def source_dir(self) -> Path:
        return ROOT / "content/cke/sources" / str(self.year) / self.subject

    @property
    def booklet(self) -> Path:
        return self.source_dir / self.download_name

    @property
    def public_dir(self) -> Path:
        return ROOT / "public/cke" / str(self.year) / self.subject / f"{self.code.lower()}-100-x-{self.token}"


class AnchorParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self.href: str | None = None
        self.text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a":
            self.href = dict(attrs).get("href")
            self.text = []

    def handle_data(self, data: str) -> None:
        if self.href is not None:
            self.text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self.href is not None:
            self.links.append((" ".join("".join(self.text).split()), self.href))
            self.href = None
            self.text = []


def paper_name(year: int, subject: str, code: str, token: str) -> str:
    if year == 2019 and subject in {"polish", "mathematics"}:
        return f"Arkusz_{code}-100-{token}.pdf"
    if year == 2021 and subject in {"polish", "mathematics"}:
        return f"{code}-100-X-{token}.pdf"
    if year == 2024:
        return f"{code}-100-X-{token}-zeszyt-zadan.pdf"
    return f"{code}-100-{token}.pdf"


def papers() -> list[Paper]:
    result: list[Paper] = []
    for year, (token, source_url) in YEARS.items():
        for subject, (code, label) in SUBJECTS.items():
            result.append(Paper(year, token, source_url, subject, code, label, paper_name(year, subject, code, token)))
    return result


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sanitize_text(value: str) -> str:
    value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value.replace("\u00ad", ""))
    return value.replace("\uf0b7", "•")


def clean_text(value: str) -> str:
    lines: list[str] = []
    for line in sanitize_text(value).splitlines():
        line = re.sub(r"\s+", " ", line).strip()
        if not line:
            continue
        if re.match(r"^(Strona \d+ z \d+|[A-Z]{4}[-–].*\d{4}$|PRZENIEŚ ROZWIĄZANIA|WYPEŁNIA EGZAMINATOR|Zapisy na marginesie)", line):
            continue
        if line.startswith("Układ graficzny") or line.startswith("© CKE"):
            continue
        lines.append(line)
    text = "\n".join(lines)
    text = re.sub(r"^Zadanie\s+\d+\.\s*\(0\s*[–-]\s*\d+\)\s*", "", text, flags=re.IGNORECASE)
    text = re.split(r"\b(?:CZYSTOPIS|BRUDNOPIS)\b", text, maxsplit=1, flags=re.IGNORECASE)[0].strip()
    return text


def fetch(url: str) -> bytes:
    result = subprocess.run(
        ["curl", "-L", "--fail", "--silent", "--show-error", "--max-time", "120", url],
        check=True, capture_output=True,
    )
    return result.stdout


def page_links(url: str) -> list[tuple[str, str]]:
    parser = AnchorParser()
    parser.feed(fetch(url).decode("utf-8", errors="replace"))
    return [(text, urllib.parse.urljoin(url, href).replace("http://cke.gov.pl", "https://cke.gov.pl")) for text, href in parser.links]


def discover_supplements(paper: Paper, links: list[tuple[str, str]]) -> dict[str, str]:
    relevant = [(text, url) for text, url in links if f"{paper.code}-100" in urllib.parse.unquote(url).upper() and paper.token in url]
    result: dict[str, str] = {}
    for text, url in relevant:
        lower = f"{text} {url}".lower()
        filename = Path(urllib.parse.urlparse(url).path).name.lower()
        if "zasad" in lower and "ukrain" not in lower and paper.code.replace("P", "U") not in filename.upper():
            result.setdefault("rules", url)
        elif "transkrypc" in lower:
            result.setdefault("transcript", url)
        elif filename.endswith(".mp3") and "-wp-" not in filename and "wydłuż" not in lower:
            result.setdefault("recording", url)
        elif "karta-rozwiazan" in filename:
            result.setdefault("open_answer_card", url)
        elif "karta-odpowiedzi" in filename or "karta_rozwiazan" in filename:
            result.setdefault("answer_card", url)
    return result


def prepare_sources(all_papers: list[Paper]) -> dict[str, dict[str, str]]:
    links_by_year = {year: page_links(source_url) for year, (_, source_url) in YEARS.items()}
    discovered = {paper.prefix: discover_supplements(paper, links_by_year[paper.year]) for paper in all_papers}
    missing_rules = [paper.prefix for paper in all_papers if "rules" not in discovered[paper.prefix]]
    if missing_rules:
        raise RuntimeError("Nie znaleziono zasad oceniania dla: " + ", ".join(missing_rules))

    jobs: list[tuple[str, Path]] = []
    for paper in all_papers:
        source = DOWNLOADS / paper.download_name
        if not source.exists():
            raise FileNotFoundError(f"Brak arkusza: {source}")
        paper.source_dir.mkdir(parents=True, exist_ok=True)
        if not paper.booklet.exists() or sha256(paper.booklet) != sha256(source):
            shutil.copy2(source, paper.booklet)
        for url in discovered[paper.prefix].values():
            jobs.append((url, paper.source_dir / Path(urllib.parse.urlparse(url).path).name))

    def download(job: tuple[str, Path]) -> None:
        url, target = job
        if target.exists() and target.stat().st_size > 0:
            return
        target.write_bytes(fetch(url))
        print(f"Pobrano {target.relative_to(ROOT)}")

    with ThreadPoolExecutor(max_workers=6) as executor:
        list(executor.map(download, jobs))
    return discovered


def existing_supplements(paper: Paper, discovered: dict[str, dict[str, str]]) -> dict[str, tuple[str, Path]]:
    result: dict[str, tuple[str, Path]] = {}
    for kind, url in discovered[paper.prefix].items():
        path = paper.source_dir / Path(urllib.parse.urlparse(url).path).name
        if not path.exists():
            raise FileNotFoundError(f"Brak materiału uzupełniającego: {path}")
        result[kind] = (url, path)
    return result


def extract_tasks(booklet: Path) -> list[dict]:
    with pdfplumber.open(booklet) as pdf:
        page_texts = [page.extract_text(x_tolerance=2, y_tolerance=3) or "" for page in pdf.pages]
    joined = "\n".join(f"\n[[PAGE:{index}]]\n{text}" for index, text in enumerate(page_texts, 1))
    matches = list(re.finditer(r"Zadanie\s+(\d+)\.\s*\(0\s*[–-]\s*(\d+)\)", joined, flags=re.IGNORECASE))
    numbers = [int(match.group(1)) for match in matches]
    if numbers != list(range(1, max(numbers, default=0) + 1)):
        raise RuntimeError(f"Nie udało się rozpoznać ciągłej numeracji zadań w {booklet}: {numbers}")
    tasks: list[dict] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(joined)
        block = joined[match.start():end]
        start_page = int(re.findall(r"\[\[PAGE:(\d+)\]\]", joined[:match.start()])[-1])
        task_pages = [start_page]
        markers = list(re.finditer(r"\[\[PAGE:(\d+)\]\]", block))
        for marker_index, marker in enumerate(markers):
            fragment_end = markers[marker_index + 1].start() if marker_index + 1 < len(markers) else len(block)
            if clean_text(block[marker.end():fragment_end]):
                task_pages.append(int(marker.group(1)))
        prompt = clean_text(re.sub(r"\[\[PAGE:\d+\]\]", "", block))
        tasks.append({"number": int(match.group(1)), "points": int(match.group(2)), "pages": sorted(set(task_pages)), "prompt": prompt})
    return tasks


def task_headings(page: pdfplumber.page.Page) -> list[tuple[int, float]]:
    headings: list[tuple[int, float]] = []
    for line in page.extract_text_lines():
        match = re.match(r"Zadanie\s+(\d+)\.\s*\(0\s*[–-]\s*\d+\)", sanitize_text(line["text"]), flags=re.IGNORECASE)
        if match:
            headings.append((int(match.group(1)), float(line["top"])))
    return headings


def render_task_assets(paper: Paper, tasks: list[dict]) -> dict[int, list[dict]]:
    paper.public_dir.mkdir(parents=True, exist_ok=True)
    result: dict[int, list[dict]] = {}
    with pdfplumber.open(paper.booklet) as pdf:
        headings_by_page = {index: task_headings(page) for index, page in enumerate(pdf.pages, 1)}
        starts = {number: (page, top) for page, headings in headings_by_page.items() for number, top in headings}
        for task in tasks:
            number = task["number"]
            assets: list[dict] = []
            for page_number in task["pages"]:
                page = pdf.pages[page_number - 1]
                start_page, start_top = starts[number]
                top = max(24.0, start_top - 8.0) if page_number == start_page else 28.0
                next_heading = next((item for item in headings_by_page[page_number] if item[0] == number + 1), None)
                bottom = next_heading[1] - 8.0 if next_heading else page.height - 30.0
                if bottom - top < 40:
                    continue
                asset_id = f"q{number:02d}-page-{page_number}"
                target = paper.public_dir / f"{asset_id}.webp"
                if not target.exists():
                    image = page.crop((28.0, top, page.width - 28.0, bottom)).to_image(resolution=120, antialias=True).original.convert("RGB")
                    image.save(target, "WEBP", quality=82, method=6)
                assets.append({
                    "id": asset_id,
                    "path": target.relative_to(ROOT).as_posix(),
                    "sha256": sha256(target),
                    "alt": f"Oryginalny układ zadania {number} z arkusza {paper.code}-100-{paper.token}, strona {page_number}.",
                    "caption": f"Zadanie {number} — oryginalny układ CKE, strona {page_number}.",
                    "mime_type": "image/webp",
                })
            result[number] = assets
    return result


def extract_rule_sections(path: Path) -> dict[int, str]:
    with pdfplumber.open(path) as pdf:
        text = "\n".join(page.extract_text(x_tolerance=2, y_tolerance=3) or "" for page in pdf.pages)
    text = sanitize_text(text)
    matches = list(re.finditer(r"(?:^|\n)Zadanie\s+(\d+)\.\s*\(0\s*[–−-]\s*\d+\)", text, flags=re.IGNORECASE))
    sections: dict[int, str] = {}
    for index, match in enumerate(matches):
        number = int(match.group(1))
        if number in sections:
            continue
        end = next((candidate.start() for candidate in matches[index + 1:] if int(candidate.group(1)) > number), len(text))
        sections[number] = clean_text(text[match.start():end])[:6500]
    return sections


def expected_from_section(section: str) -> str | None:
    lines = [line.strip() for line in section.splitlines() if line.strip()]
    for index, line in enumerate(lines):
        if not line.lower().startswith(("rozwiązanie", "odpowiedź")):
            continue
        for candidate in lines[index + 1:index + 5]:
            if candidate.lower().startswith(("wersja", "zadanie", "zasady", "wymagania")):
                continue
            if len(candidate) <= 240:
                if "wersja X" in line and "wersja Y" in line:
                    return candidate.split()[0]
                return candidate
    return None


def language_keys(path: Path) -> dict[int, str]:
    answers: dict[str, str] = {}

    def task_number(value: object) -> str | None:
        normalized = "".join(str(value or "").split())
        direct = re.fullmatch(r"(\d+)\.(\d+)\.?", normalized)
        if direct:
            return f"{direct.group(1)}.{direct.group(2)}"
        reversed_value = normalized[::-1]
        reversed_match = re.fullmatch(r"(\d+)\.(\d+)\.?", reversed_value)
        return f"{reversed_match.group(1)}.{reversed_match.group(2)}" if reversed_match else None

    def answer_value(value: object, reverse: bool = False) -> str:
        text = str(value or "")
        if reverse:
            text = text[::-1]
        return " ".join(clean_text(text).split())

    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                if not table:
                    continue
                header = " ".join(str(cell or "") for row in table[:4] for cell in row).lower()
                x_index = None
                expected_index = None
                for row in table[:5]:
                    for index, cell in enumerate(row):
                        normalized = " ".join(str(cell or "").split()).lower()
                        if normalized == "x":
                            x_index = index
                        if "odpowiedź oczekiwana" in normalized:
                            expected_index = index
                # W zasadach z 2019–2020 część tabel jest zapisana obrócona o 180°:
                # numery podpunktów tworzą wtedy wiersz, a odpowiedzi wariantu X
                # drugi wiersz. Odtwarzamy tę macierz przed zwykłym parsowaniem.
                task_row = next((row for row in table if any(task_number(cell) for cell in row)), None)
                x_row = next((row for row in table if any(str(cell or "").strip().upper() == "X" for cell in row)), None)
                if task_row and x_row:
                    for index, cell in enumerate(task_row):
                        number = task_number(cell)
                        if not number or index >= len(x_row):
                            continue
                        reversed_layout = not bool(re.fullmatch(r"\s*\d+\.\d+\.?\s*", str(cell or "")))
                        value = answer_value(x_row[index], reverse=reversed_layout)
                        if value and len(value) <= 300:
                            answers.setdefault(number, value)

                answer_row = next(
                    (
                        row
                        for row in table
                        if all(
                            word in " ".join(str(cell or "")[::-1] for cell in row).lower()
                            for word in ("poprawna", "odpowiedź")
                        )
                    ),
                    None,
                )
                if task_row and answer_row:
                    for index, cell in enumerate(task_row):
                        number = task_number(cell)
                        if not number or index >= len(answer_row):
                            continue
                        reversed_layout = not bool(re.fullmatch(r"\s*\d+\.\d+\.?\s*", str(cell or "")))
                        value = answer_value(answer_row[index], reverse=reversed_layout)
                        if value and len(value) <= 300:
                            answers.setdefault(number, value)

                for row in table:
                    if not row:
                        continue
                    number = task_number(row[0])
                    if not number:
                        continue
                    candidate = None
                    if expected_index is not None and expected_index < len(row):
                        candidate = row[expected_index]
                    if not candidate and x_index is not None and x_index < len(row):
                        candidate = row[x_index]
                    if not candidate and ("poprawna" in header or "odpowiedź" in header):
                        candidate = next((cell for cell in reversed(row[1:]) if cell), None)
                    if not candidate and "oczekiwana" in header:
                        candidate = next((cell for cell in row[1:] if cell), None)
                    reversed_layout = not bool(re.fullmatch(r"\s*\d+\.\d+\.?\s*", str(row[0] or "")))
                    value = answer_value(candidate, reverse=reversed_layout)
                    if value and len(value) <= 300 and "Uczeń" not in value and "Wymag" not in value:
                        answers.setdefault(number, value)
    grouped: dict[int, list[tuple[int, str]]] = {}
    for number, answer in answers.items():
        task, subtask = map(int, number.split("."))
        grouped.setdefault(task, []).append((subtask, answer))
    return {task: "; ".join(f"{task}.{subtask}: {answer}" for subtask, answer in sorted(values)) for task, values in grouped.items()}


def extract_transcript_passages(path: Path, prefix: str) -> tuple[list[dict], dict[int, str]]:
    with pdfplumber.open(path) as pdf:
        text = "\n".join(page.extract_text(x_tolerance=2, y_tolerance=3) or "" for page in pdf.pages)
    text = sanitize_text(text)
    matches = list(re.finditer(r"(?:^|\n)Zadanie\s+([1-4])\.", text, flags=re.IGNORECASE))
    passages: list[dict] = []
    by_task: dict[int, str] = {}
    for index, match in enumerate(matches):
        number = int(match.group(1))
        if number in by_task:
            continue
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        transcript = clean_text(text[match.end():end])[:9000]
        if not transcript:
            continue
        passage_id = f"{prefix}-transcript-q{number:02d}"
        passages.append({
            "id": passage_id,
            "title": f"Transkrypcja nagrania do zadania {number}",
            "paragraphs": [paragraph for paragraph in transcript.splitlines() if paragraph],
            "source": "Oficjalna transkrypcja CKE.",
        })
        by_task[number] = passage_id
    return passages, by_task


def infer_topic(subject: str, number: int, prompt: str) -> str:
    if subject in LANGUAGE_SUBJECTS:
        return LANGUAGE_TOPICS[number - 1]
    if subject == "polish":
        return "Wypowiedź pisemna" if number >= 18 or "wypracowanie" in prompt.lower() else "Czytanie, język i literatura"
    lowered = prompt.lower()
    categories = [
        (("procent",), "Procenty"), (("pierwiast",), "Pierwiastki"), (("potęg",), "Potęgi"),
        (("prawdopodob", "los"), "Prawdopodobieństwo"), (("równani",), "Równania"),
        (("prędko", "droga"), "Prędkość, droga i czas"), (("pole", "obwód"), "Geometria płaska"),
        (("objęto", "graniastosł", "ostrosł"), "Geometria przestrzenna"), (("średni", "wykres", "tabel"), "Dane i statystyka"),
    ]
    return next((label for needles, label in categories if any(needle in lowered for needle in needles)), "Rozumowanie matematyczne")


def build_manifest(paper: Paper, supplement_urls: dict[str, dict[str, str]]) -> Path:
    supplements = existing_supplements(paper, supplement_urls)
    tasks = extract_tasks(paper.booklet)
    task_assets = render_task_assets(paper, tasks)
    rule_sections = extract_rule_sections(supplements["rules"][1])
    keys = language_keys(supplements["rules"][1]) if paper.subject in LANGUAGE_SUBJECTS else {}
    passages: list[dict] = []
    transcript_by_task: dict[int, str] = {}
    if paper.subject in LANGUAGE_SUBJECTS and "recording" not in supplements and "transcript" in supplements:
        passages, transcript_by_task = extract_transcript_passages(supplements["transcript"][1], paper.prefix)

    recording_asset = None
    if "recording" in supplements:
        recording_url, recording_path = supplements["recording"]
        recording_asset = {
            "id": "official-recording",
            "path": recording_url,
            "sha256": sha256(recording_path),
            "alt": f"Oficjalne nagranie CKE {paper.year} do zadań 1–4 z przedmiotu {paper.label}.",
            "caption": f"Oficjalne nagranie CKE {paper.year} — {paper.label}, zadania 1–4.",
            "mime_type": "audio/mpeg",
        }

    questions: list[dict] = []
    for task in tasks:
        number = task["number"]
        assets = list(task_assets[number])
        blocks: list[dict] = [{"type": "image", "asset_id": asset["id"]} for asset in assets]
        if recording_asset and number <= 4:
            assets.insert(0, recording_asset)
            blocks.insert(0, {"type": "audio", "asset_id": "official-recording"})
        elif number in transcript_by_task:
            blocks.insert(0, {"type": "passage", "passage_id": transcript_by_task[number], "default_open": False})

        section = rule_sections.get(number, "")
        expected = keys.get(number) or expected_from_section(section)
        if number == 14 and paper.subject in LANGUAGE_SUBJECTS:
            answer_key = {"assessment": "rubric", "minimum_words": 50, "maximum_words": 120}
        else:
            answer_key = {"assessment": "rubric", **({"accepted_results": [expected]} if expected else {})}
        if section:
            marker = re.search(r"(?:Zasady oceniania|Rozwiązanie|Przykładowe rozwiązanie)", section, flags=re.IGNORECASE)
            guidance = section[marker.start():] if marker else section
            explanation = guidance[:5000]
        elif expected:
            explanation = f"Klucz odpowiedzi zgodny z oficjalnymi zasadami CKE: {expected}."
        else:
            explanation = "Porównaj rozwiązanie z oficjalnymi zasadami oceniania CKE dołączonymi do arkusza."
        solution_steps = ([f"Klucz CKE: {expected}."] if expected else []) + [
            "Porównaj swoją odpowiedź z oficjalnym rozwiązaniem i kryteriami punktowania.",
            "Sprawdź, czy odpowiedź realizuje wszystkie elementy polecenia.",
        ]
        questions.append({
            "id": f"{paper.prefix}-q{number:02d}", "number": str(number), "sort_order": number,
            "source_pages": task["pages"], "type": "long_text", "topic": infer_topic(paper.subject, number, task["prompt"]),
            "difficulty": 3 if task["points"] > 1 or number == len(tasks) else 2, "prompt": task["prompt"],
            "answer_key": answer_key,
            "scoring": {"max_points": task["points"], "rules": [f"Maksymalnie {task['points']} pkt zgodnie z oficjalnymi zasadami oceniania CKE."]},
            "explanation": explanation, "solution_steps": solution_steps,
            "hints": ["Przeczytaj uważnie wszystkie warunki polecenia i zaznacz dane kluczowe.", "Rozwiązuj po jednym elemencie, a na końcu sprawdź kompletność odpowiedzi."],
            "content_blocks": blocks, "assets": assets,
        })

    supplementary_sources = []
    for kind, (_, path) in supplements.items():
        labels = {
            "rules": "Oficjalne zasady oceniania rozwiązań zadań",
            "transcript": "Oficjalna transkrypcja nagrań",
            "recording": "Oficjalne nagranie do zadań 1–4",
            "open_answer_card": "Karta rozwiązań zadań otwartych",
            "answer_card": "Karta odpowiedzi",
        }
        supplementary_sources.append({
            "id": f"{paper.prefix}-{kind.replace('_', '-')}", "path": path.relative_to(ROOT).as_posix(),
            "sha256": sha256(path), "label": labels[kind],
        })

    internal_code = re.sub(r"(?:Arkusz_)?|(?:-zeszyt-zadan)?\.pdf$", "", paper.download_name)
    manifest = {
        "schema_version": 1, "manifest_id": paper.prefix, "manifest_version": 1,
        "paper": {
            "id": paper.prefix, "source_document_id": internal_code, "source_pdf_sha256": sha256(paper.booklet),
            "source_url": paper.source_url, "source_label": f"CKE {paper.year} · {paper.label} · termin główny · wariant 100-X",
            "exam_year": paper.year, "exam_session": "main", "subject": paper.subject, "variant_code": "100-X",
            "question_count": len(questions), "supplementary_sources": supplementary_sources,
        },
        "permission": PERMISSION, "passages": passages, "questions": questions,
    }
    target = ROOT / "content/cke" / f"{paper.prefix}.json"
    target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{target.relative_to(ROOT)}: {len(questions)} zadań / {sum(task['points'] for task in tasks)} pkt")
    return target


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prepare-sources", action="store_true", help="Skopiuj arkusze z ~/Downloads i pobierz oficjalne materiały CKE.")
    parser.add_argument("--year", type=int, choices=YEARS, help="Zbuduj tylko jeden rocznik.")
    parser.add_argument("--subject", choices=SUBJECTS, help="Zbuduj tylko jeden przedmiot.")
    args = parser.parse_args()
    all_papers = papers()
    selected = [
        paper
        for paper in all_papers
        if (args.year is None or paper.year == args.year)
        and (args.subject is None or paper.subject == args.subject)
    ]
    catalog_path = ROOT / "content/cke/sources/2019-2024-supplements.json"
    if args.prepare_sources:
        discovered = prepare_sources(all_papers)
        catalog_path.parent.mkdir(parents=True, exist_ok=True)
        catalog_path.write_text(json.dumps(discovered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    elif catalog_path.exists():
        discovered = json.loads(catalog_path.read_text(encoding="utf-8"))
    else:
        raise FileNotFoundError("Uruchom najpierw skrypt z opcją --prepare-sources.")
    for paper in selected:
        build_manifest(paper, discovered)


if __name__ == "__main__":
    main()
