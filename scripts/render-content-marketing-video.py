#!/usr/bin/env python3
"""Render the 18-second egzaminio tools and content social promo."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH = 1080
HEIGHT = 1920
FPS = 25
DURATION = 18

# Product palette from app/redesign.css.
PAPER = "#FAFAF9"
CARD = "#FFFFFF"
INK = "#1E1B2E"
COPY = "#3A3550"
MUTED = "#5B5674"
QUIET = "#7B7692"
LINE = "#E5E3DE"
SUBTLE_LINE = "#EDECE8"
INDIGO = "#4338CA"
INDIGO_LIGHT = "#EEF2FF"
INDIGO_TINT = "#E0E7FF"
AMBER = "#F59E0B"
AMBER_LIGHT = "#FEF3C7"

ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
GEORGIA_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


F_LOGO = font(ARIAL_BOLD, 38)
F_EYEBROW = font(ARIAL_BOLD, 23)
F_HERO = font(GEORGIA_BOLD, 86)
F_H1 = font(GEORGIA_BOLD, 70)
F_H2 = font(GEORGIA_BOLD, 51)
F_BODY = font(ARIAL, 31)
F_BODY_BOLD = font(ARIAL_BOLD, 31)
F_SMALL = font(ARIAL, 25)
F_SMALL_BOLD = font(ARIAL_BOLD, 25)
F_TINY = font(ARIAL, 20)
F_TINY_BOLD = font(ARIAL_BOLD, 20)
F_NUMBER = font(GEORGIA_BOLD, 102)
F_BUTTON = font(ARIAL_BOLD, 29)


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def ease(value: float) -> float:
    value = clamp(value)
    return value * value * (3 - 2 * value)


def scene_alpha(t: float, start: float, end: float, fade: float = 0.32) -> float:
    return min(ease((t - start) / fade), ease((end - t) / fade))


def wrap(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=text_font)[2] <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def text_block(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    text_font: ImageFont.FreeTypeFont,
    fill: str,
    max_width: int,
    spacing: int = 10,
) -> int:
    x, y = xy
    line_height = text_font.getbbox("Ag")[3] - text_font.getbbox("Ag")[1]
    for line in wrap(draw, text, text_font, max_width):
        draw.text((x, y), line, font=text_font, fill=fill)
        y += line_height + spacing
    return y


def rounded(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    fill: str,
    outline: str | None = None,
    width: int = 2,
    radius: int = 24,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def logo(draw: ImageDraw.ImageDraw, y: int = 86) -> None:
    draw.text((70, y), "egzamin", font=F_LOGO, fill=MUTED)
    end = draw.textbbox((70, y), "egzamin", font=F_LOGO)[2]
    draw.text((end, y), "io", font=F_LOGO, fill=INK)


def top_rule(draw: ImageDraw.ImageDraw) -> None:
    draw.line((70, 156, WIDTH - 70, 156), fill=LINE, width=2)


def arrow(draw: ImageDraw.ImageDraw, x: int, y: int, color: str = INK) -> None:
    draw.line((x, y, x + 34, y), fill=color, width=4)
    draw.line((x + 22, y - 11, x + 34, y, x + 22, y + 11), fill=color, width=4, joint="curve")


def check(draw: ImageDraw.ImageDraw, x: int, y: int, color: str = AMBER, scale: float = 1.0) -> None:
    points = [
        (x, y + int(12 * scale)),
        (x + int(12 * scale), y + int(24 * scale)),
        (x + int(36 * scale), y),
    ]
    draw.line(points, fill=color, width=max(4, int(6 * scale)), joint="curve")


def base_frame() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)
    draw.ellipse((750, -300, 1320, 270), outline=LINE, width=2)
    draw.ellipse((790, 1590, 1320, 2120), outline=LINE, width=2)
    return image


def hook_scene(local_t: float) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    logo(draw)
    top_rule(draw)
    slide = int((1 - ease(local_t / 0.55)) * 52)
    draw.text((70, 300 + slide), "NIE TYLKO ARKUSZE", font=F_EYEBROW, fill=INDIGO)
    draw.text((70, 410 + slide), "Policz.", font=F_HERO, fill=INK)
    draw.text((70, 520 + slide), "Zrozum.", font=F_HERO, fill=INK)
    draw.text((70, 630 + slide), "Ćwicz.", font=F_HERO, fill=INK)
    text_block(
        draw,
        (74, 795 + slide),
        "Jedno miejsce, które prowadzi Cię od planu do rozwiązania.",
        F_BODY,
        MUTED,
        840,
        10,
    )
    features = ["Kalkulator punktów", "Baza wiedzy", "Maia AI"]
    for index, label in enumerate(features):
        y = 1040 + index * 112
        rounded(draw, (70, y, 730, y + 78), CARD, LINE, 2, 18)
        check(draw, 106, y + 26, AMBER, 0.7)
        draw.text((166, y + 23), label, font=F_SMALL_BOLD, fill=INK)
    return image


def calculator_scene(local_t: float) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    logo(draw)
    top_rule(draw)
    draw.text((70, 245), "KALKULATOR PUNKTÓW", font=F_EYEBROW, fill=INDIGO)
    draw.text((70, 330), "Wiesz, ile", font=F_H1, fill=INK)
    draw.text((70, 420), "potrzebujesz.", font=F_H1, fill=INK)
    draw.text((74, 535), "Przykładowe wyliczenie · bez logowania", font=F_SMALL, fill=MUTED)

    rounded(draw, (60, 650, 1020, 1450), CARD, LINE, 2, 30)
    draw.text((105, 710), "TWÓJ WYNIK", font=F_TINY_BOLD, fill=QUIET)
    count = int(151 * ease(local_t / 1.05))
    draw.text((100, 780), str(count), font=F_NUMBER, fill=INK)
    draw.text((330, 850), "/ 200 pkt", font=F_BODY, fill=MUTED)

    draw.text((105, 1010), "Próg wybranej klasy", font=F_SMALL, fill=COPY)
    draw.text((885, 1010), "172", font=F_SMALL_BOLD, fill=INK, anchor="ra")
    draw.rounded_rectangle((105, 1080, 915, 1110), radius=15, fill=INDIGO_TINT)
    progress = int(810 * (count / 200))
    if progress:
        draw.rounded_rectangle((105, 1080, 105 + progress, 1110), radius=15, fill=INDIGO)
    marker_x = 105 + int(810 * (172 / 200))
    draw.line((marker_x, 1062, marker_x, 1128), fill=AMBER, width=5)

    reveal = ease((local_t - 0.85) / 0.45)
    notice_y = int(1200 + (1 - reveal) * 45)
    rounded(draw, (105, notice_y, 915, notice_y + 150), AMBER_LIGHT, None, radius=20)
    draw.text((140, notice_y + 28), "Do progu brakuje 21 punktów", font=F_BODY_BOLD, fill=INK)
    draw.text((140, notice_y + 82), "Teraz możesz zaplanować przygotowania.", font=F_SMALL, fill=COPY)
    return image


def knowledge_scene(local_t: float) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    logo(draw)
    top_rule(draw)
    draw.text((70, 245), "BAZA WIEDZY", font=F_EYEBROW, fill=INDIGO)
    draw.text((70, 330), "Odpowiedź, której", font=F_H1, fill=INK)
    draw.text((70, 420), "właśnie szukasz.", font=F_H1, fill=INK)
    text_block(draw, (74, 535), "Krótkie, uporządkowane materiały bez przekopywania internetu.", F_BODY, MUTED, 850)

    topics = [
        ("REKRUTACJA", "Jak liczyć punkty do liceum i technikum?"),
        ("MATEMATYKA", "Procenty — najważniejsze zasady i przykłady"),
        ("JĘZYK POLSKI", "Lektury obowiązkowe na egzamin"),
        ("JĘZYKI OBCE", "Jak napisać wiadomość e-mail?"),
    ]
    for index, (category, title) in enumerate(topics):
        y = 750 + index * 205
        offset = int((1 - ease((local_t - index * 0.09) / 0.45)) * 34)
        rounded(draw, (70, y + offset, 1010, y + 165 + offset), CARD, LINE, 2, 20)
        draw.text((105, y + 30 + offset), category, font=F_TINY_BOLD, fill=INDIGO)
        draw.text((105, y + 78 + offset), title, font=F_SMALL_BOLD, fill=INK)
        arrow(draw, 920, y + 89 + offset, QUIET)
    return image


def maia_scene(local_t: float) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    logo(draw)
    top_rule(draw)
    draw.text((70, 245), "MAIA AI", font=F_EYEBROW, fill=INDIGO)
    draw.text((70, 330), "Zapytaj tak,", font=F_H1, fill=INK)
    draw.text((70, 420), "jak umiesz.", font=F_H1, fill=INK)
    draw.text((74, 535), "Maia odpowiada po polsku i prowadzi krok po kroku.", font=F_SMALL, fill=MUTED)

    rounded(draw, (60, 660, 1020, 1510), CARD, LINE, 2, 30)
    draw.text((105, 720), "Maia · nauczycielka AI", font=F_SMALL_BOLD, fill=INDIGO)
    draw.text((875, 720), "3 pytania bezpłatnie", font=F_TINY, fill=QUIET, anchor="ra")
    draw.line((105, 780, 975, 780), fill=SUBTLE_LINE, width=2)

    rounded(draw, (220, 835, 940, 1010), INDIGO_LIGHT, None, radius=22)
    draw.text((260, 870), "Ty", font=F_TINY_BOLD, fill=QUIET)
    text_block(draw, (260, 920), "Dlaczego 15% z 80 to 12?", F_BODY, INK, 620)

    reply_progress = ease((local_t - 0.7) / 0.55)
    reply_y = int(1060 + (1 - reply_progress) * 60)
    rounded(draw, (105, reply_y, 900, reply_y + 285), INDIGO, None, radius=22)
    draw.text((145, reply_y + 34), "Maia", font=F_TINY_BOLD, fill="#FFFFFF")
    text_block(
        draw,
        (145, reply_y + 88),
        "Zacznij od 10%: to 8. Potem dodaj 5%, czyli 4. Razem otrzymasz 12.",
        F_BODY,
        "#FFFFFF",
        675,
        8,
    )
    draw.text((105, 1430), "Możesz dopytać, jeśli nadal coś jest niejasne.", font=F_SMALL, fill=MUTED)
    return image


def cta_scene(local_t: float) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    logo(draw, 110)
    slide = int((1 - ease(local_t / 0.55)) * 48)
    draw.text((70, 365 + slide), "Policz.", font=F_HERO, fill=INK)
    draw.text((70, 475 + slide), "Zrozum.", font=F_HERO, fill=INK)
    draw.text((70, 585 + slide), "Ćwicz.", font=F_HERO, fill=INK)
    text_block(
        draw,
        (74, 755 + slide),
        "Kalkulator, baza wiedzy, Maia i autentyczne arkusze CKE w jednym miejscu.",
        F_BODY,
        MUTED,
        850,
    )
    rounded(draw, (70, 1010, 1010, 1140), INDIGO, None, radius=24)
    draw.text((120, 1048), "Zacznij bezpłatnie", font=F_BUTTON, fill="#FFFFFF")
    arrow(draw, 910, 1075, "#FFFFFF")
    rounded(draw, (70, 1215, 620, 1295), AMBER_LIGHT, None, radius=18)
    check(draw, 105, 1237, AMBER, 0.8)
    draw.text((165, 1237), "egzamin.io", font=F_SMALL_BOLD, fill=INK)
    draw.text((70, 1605), "Od planu do rozwiązania — we własnym tempie.", font=F_SMALL, fill=MUTED)
    return image


SCENES = [
    (0.0, 3.1, hook_scene),
    (2.8, 7.0, calculator_scene),
    (6.7, 11.0, knowledge_scene),
    (10.7, 15.2, maia_scene),
    (14.9, 18.0, cta_scene),
]


def render_frame(t: float) -> Image.Image:
    frame = base_frame().convert("RGBA")
    for start, end, renderer in SCENES:
        alpha = scene_alpha(t, start, end)
        if alpha <= 0:
            continue
        layer = renderer(t - start)
        layer.putalpha(layer.getchannel("A").point(lambda value: int(value * alpha)))
        frame = Image.alpha_composite(frame, layer)
    return frame.convert("RGB")


def render(ffmpeg: str, output: Path, audio: Path | None) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    command = [
        ffmpeg,
        "-y",
        "-f", "rawvideo",
        "-pix_fmt", "rgb24",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-r", str(FPS),
        "-i", "-",
    ]
    if audio:
        command += ["-i", str(audio), "-shortest"]
    command += [
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "21",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
    ]
    if audio:
        command += ["-c:a", "aac", "-b:a", "160k"]
    command += [str(output)]

    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    for frame_number in range(FPS * DURATION):
        process.stdin.write(render_frame(frame_number / FPS).tobytes())
    process.stdin.close()
    if process.wait() != 0:
        raise SystemExit("FFmpeg failed")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--audio", type=Path)
    args = parser.parse_args()
    render(args.ffmpeg, args.output, args.audio)


if __name__ == "__main__":
    main()
