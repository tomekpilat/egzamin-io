"""Extract the illustration sets shared by both OPOP-100-2505 versions."""

from pathlib import Path
import subprocess
import tempfile

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BOOKLET = ROOT / "content/cke/sources/2025/jezyk_polski/OPOP-100-X-2505-zeszyt-zadan.pdf"
OUTPUT = ROOT / "public/cke/2025/polish/opop-100-2505"


def render_and_crop(page_number: int, crop: tuple[int, int, int, int], target: str) -> None:
    with tempfile.TemporaryDirectory(prefix="egzaminio-polish-2025-") as temporary:
        prefix = Path(temporary) / "page"
        subprocess.run(
            ["pdftoppm", "-f", str(page_number), "-l", str(page_number), "-singlefile", "-png", "-r", "216", str(BOOKLET), str(prefix)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        with Image.open(f"{prefix}.png") as page:
            page.crop(crop).save(OUTPUT / target)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    render_and_crop(10, (390, 390, 1400, 2270), "q11-literary-cards.png")
    render_and_crop(16, (190, 1400, 1580, 2310), "q19-story-prompts.png")


if __name__ == "__main__":
    main()
