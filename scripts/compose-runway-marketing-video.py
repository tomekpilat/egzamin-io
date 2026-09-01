#!/usr/bin/env python3
"""Compose a Runway-generated opening with the exact egzaminio product animation."""

from __future__ import annotations

import argparse
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH = 1080
HEIGHT = 1920
INK = "#1E1B2E"
MUTED = "#5B5674"
INDIGO = "#4338CA"
AMBER = "#F59E0B"
PAPER = "#FAFAF9"
ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
GEORGIA_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def make_overlay(path: Path) -> None:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    logo_regular = font(ARIAL_BOLD, 40)
    logo_bold = font(ARIAL_BOLD, 40)
    draw.rounded_rectangle((48, 54, 310, 132), radius=28, fill=(30, 27, 46, 220))
    draw.text((78, 73), "egzamin", font=logo_regular, fill="#DEDBE9")
    end = draw.textbbox((78, 73), "egzamin", font=logo_regular)[2]
    draw.text((end, 73), "io", font=logo_bold, fill="#FFFFFF")

    draw.rounded_rectangle(
        (48, 1235, WIDTH - 48, 1780),
        radius=36,
        fill=(250, 250, 249, 242),
        outline=(255, 255, 255, 210),
        width=2,
    )
    draw.text((92, 1295), "AUTENTYCZNE ARKUSZE CKE", font=font(ARIAL_BOLD, 25), fill=INDIGO)
    draw.multiline_text(
        (88, 1370),
        "Zacznij od\nprawdziwych zadań.",
        font=font(GEORGIA_BOLD, 70),
        fill=INK,
        spacing=8,
    )
    draw.text((92, 1575), "Ponad 1000 pytań z lat 2019–2026.", font=font(ARIAL, 31), fill=MUTED)
    draw.rounded_rectangle((92, 1650, 475, 1730), radius=20, fill=INDIGO)
    draw.text((130, 1672), "egzamin.io  →", font=font(ARIAL_BOLD, 28), fill=PAPER)
    draw.rounded_rectangle((500, 1650, 620, 1730), radius=20, fill="#FEF3C7")
    draw.line(((535, 1690), (551, 1706), (584, 1671)), fill=AMBER, width=7, joint="curve")
    image.save(path)


def compose(ffmpeg: str, runway: Path, product: Path, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="egzaminio-runway-") as temp_dir:
        overlay = Path(temp_dir) / "opening-overlay.png"
        make_overlay(overlay)
        filter_graph = (
            "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920,gblur=sigma=6,fps=25,trim=0:3.8,"
            "settb=AVTB,setpts=PTS-STARTPTS[runway];"
            "[2:v]format=rgba,fps=25,settb=AVTB,setpts=PTS-STARTPTS[overlay];"
            "[runway][overlay]overlay=0:0:shortest=1,fps=25,settb=AVTB,"
            "setpts=PTS-STARTPTS,fade=t=out:st=3.5:d=0.3:color=white[opening];"
            "[1:v]scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920,fps=25,trim=start=2.5:end=15,"
            "settb=AVTB,setpts=(PTS-STARTPTS)/1.116,"
            "fade=t=in:st=0:d=0.3:color=white[product];"
            "[opening][product]concat=n=2:v=1:a=0,"
            "fps=25,tpad=stop_mode=clone:stop_duration=0.2,"
            "trim=duration=15,format=yuv420p[out]"
        )
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-i",
                str(runway),
                "-i",
                str(product),
                "-loop",
                "1",
                "-i",
                str(overlay),
                "-filter_complex",
                filter_graph,
                "-map",
                "[out]",
                "-an",
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                "20",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                str(output),
            ],
            check=True,
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", required=True)
    parser.add_argument("--runway", type=Path, required=True)
    parser.add_argument("--product", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    compose(args.ffmpeg, args.runway, args.product, args.output)


if __name__ == "__main__":
    main()
