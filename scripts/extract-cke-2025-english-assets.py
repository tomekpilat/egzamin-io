"""Prepare the picture options and official audio used by OJAP-100-X-2505."""

from pathlib import Path
import shutil
import subprocess
import tempfile

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BOOKLET = ROOT / "content/cke/sources/2025/jezyk_angielski/OJAP-100-X-2505-zeszyt-zadan.pdf"
RECORDING = ROOT / "content/cke/sources/2025/jezyk_angielski/OJAP-100-2505_OJAU-100-2505.mp3"
OUTPUT = ROOT / "public/cke/2025/english/ojap-100-x-2505"


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(RECORDING, OUTPUT / "ojap-100-2505.mp3")
    with tempfile.TemporaryDirectory(prefix="egzaminio-english-2025-") as temporary:
        prefix = Path(temporary) / "page"
        subprocess.run(
            ["pdftoppm", "-f", "3", "-l", "3", "-singlefile", "-png", "-r", "216", str(BOOKLET), str(prefix)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        with Image.open(f"{prefix}.png") as page:
            page.crop((250, 450, 1620, 2320)).save(OUTPUT / "q01-picture-options.png")


if __name__ == "__main__":
    main()
