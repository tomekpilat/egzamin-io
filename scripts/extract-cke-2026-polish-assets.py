"""Extract the illustration used by the OPOP-100-X-2605 import.

Requires Poppler (`pdftoppm`) and Pillow. The crop contains only the six
photographs referenced by task 9; all surrounding instructions stay as
accessible HTML in egzaminio.
"""

from pathlib import Path
import subprocess
import tempfile

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BOOKLET = ROOT / "content/cke/sources/2026/jezyk_polski/OPOP-100-X-2605-zeszyt-zadan.pdf"
OUTPUT = ROOT / "public/cke/2026/polish/opop-100-x-2605"


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="egzaminio-polish-") as temporary:
        prefix = Path(temporary) / "page"
        subprocess.run(
            ["pdftoppm", "-f", "10", "-l", "10", "-png", "-r", "216", str(BOOKLET), str(prefix)],
            check=True,
            stdout=subprocess.DEVNULL,
        )
        # At 216 dpi one PDF point equals three pixels.
        with Image.open(f"{prefix}-10.png") as page:
            page.crop((204, 504, 1581, 1260)).save(OUTPUT / "q09-friendship-photos.png")


if __name__ == "__main__":
    main()
