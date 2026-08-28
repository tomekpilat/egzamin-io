"""Extract the six diagrams used by the OMAP-100-X-2605 import.

Requires PyMuPDF. Crops are expressed in PDF points and deliberately exclude
the question text, so the accessible text remains native HTML in egzaminio.
"""

from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parents[1]
BOOKLET = ROOT / "content/cke/sources/2026/matematyka/OMAP-100-X-2605-zeszyt-zadan.pdf"
OPEN_CARD = ROOT / "content/cke/sources/2026/matematyka/Karta-rozwiazan-zadan-otwartych-2605.pdf"
OUTPUT = ROOT / "public/cke/2026/mathematics/omap-100-x-2605"

CROPS = [
    (BOOKLET, 3, fitz.Rect(135, 145, 470, 330), "q01-diagram.png"),
    (BOOKLET, 9, fitz.Rect(135, 320, 470, 455), "q12-map.png"),
    (BOOKLET, 11, fitz.Rect(190, 130, 405, 305), "q13-pentagon.png"),
    (BOOKLET, 11, fitz.Rect(220, 455, 385, 620), "q14-prism.png"),
    (OPEN_CARD, 4, fitz.Rect(60, 280, 215, 420), "q18-pyramid.png"),
    (OPEN_CARD, 6, fitz.Rect(55, 265, 540, 355), "q20-figures.png"),
]


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    documents: dict[Path, fitz.Document] = {}
    try:
        for source, page_index, crop, filename in CROPS:
            document = documents.setdefault(source, fitz.open(source))
            pixmap = document[page_index].get_pixmap(matrix=fitz.Matrix(3, 3), clip=crop, alpha=False)
            pixmap.save(OUTPUT / filename)
    finally:
        for document in documents.values():
            document.close()


if __name__ == "__main__":
    main()
