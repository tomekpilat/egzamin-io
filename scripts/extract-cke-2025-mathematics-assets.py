"""Extract the diagrams used by the OMAP-100-X-2505 import."""

from pathlib import Path
import subprocess
import tempfile

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BOOKLET = ROOT / "content/cke/sources/2025/matematyka/OMAP-100-X-2505-zeszyt-zadan.pdf"
OPEN_CARD = ROOT / "content/cke/sources/2025/matematyka/Karta-rozwiazan-zadan-matematyka-2505.pdf"
OUTPUT = ROOT / "public/cke/2025/mathematics/omap-100-x-2505"


def render_and_crop(source: Path, page_number: int, crop: tuple[int, int, int, int], target: str) -> None:
    with tempfile.TemporaryDirectory(prefix="egzaminio-math-2025-") as temporary:
        prefix = Path(temporary) / "page"
        subprocess.run(
            ["pdftoppm", "-f", str(page_number), "-l", str(page_number), "-singlefile", "-png", "-r", "216", str(source), str(prefix)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        with Image.open(f"{prefix}.png") as page:
            page.crop(crop).save(OUTPUT / target)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    crops = [
        (BOOKLET, 4, (324, 405, 1440, 1000), "q01-savings-chart.png"),
        (BOOKLET, 6, (720, 1505, 1060, 1790), "q05-pentagon.png"),
        (BOOKLET, 10, (520, 1000, 1150, 1450), "q11-right-triangle.png"),
        (BOOKLET, 12, (270, 350, 1560, 570), "q12-number-line.png"),
        (BOOKLET, 12, (420, 1135, 1460, 1505), "q13-trapezoid.png"),
        (BOOKLET, 14, (470, 380, 1180, 850), "q14-coordinate-plane.png"),
        (BOOKLET, 14, (700, 1380, 1080, 1800), "q15-cuboid.png"),
        (OPEN_CARD, 4, (195, 590, 995, 980), "q18-trapezoid.png"),
        (OPEN_CARD, 6, (195, 590, 790, 1125), "q20-square.png"),
        (OPEN_CARD, 7, (185, 705, 880, 1030), "q21-pyramid.png"),
    ]
    for source, page_number, crop, target in crops:
        render_and_crop(source, page_number, crop, target)


if __name__ == "__main__":
    main()
