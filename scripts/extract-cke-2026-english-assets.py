"""Prepare the media used by the OJAP-100-X-2605 import.

Requires Poppler (`pdftoppm`) and Pillow. It crops the picture options needed
for task 1 and copies the official CKE recording into the public asset tree.
"""

from pathlib import Path
import shutil
import subprocess
import tempfile

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BOOKLET = ROOT / "content/cke/sources/2026/jezyk_angielski/OJAP-100-X-2605-zeszyt-zadan.pdf"
RECORDING = ROOT / "content/cke/sources/2026/jezyk_angielski/OJAP-100-2605.mp3"
OUTPUT = ROOT / "public/cke/2026/english/ojap-100-x-2605"


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(RECORDING, OUTPUT / "ojap-100-2605.mp3")
    with tempfile.TemporaryDirectory(prefix="egzaminio-english-") as temporary:
        prefix = Path(temporary) / "page"
        subprocess.run(
            ["pdftoppm", "-f", "3", "-l", "3", "-png", "-r", "216", str(BOOKLET), str(prefix)],
            check=True,
            stdout=subprocess.DEVNULL,
        )
        # At 216 dpi one PDF point equals three pixels.
        with Image.open(f"{prefix}-03.png") as page:
            page.crop((210, 470, 1590, 2315)).save(OUTPUT / "q01-picture-options.png")


if __name__ == "__main__":
    main()
