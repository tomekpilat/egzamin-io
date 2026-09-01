#!/usr/bin/env python3
"""Render the 15-second vertical egzaminio social promo.

Dependencies are intentionally kept outside package.json:
  Pillow and an FFmpeg binary (imageio-ffmpeg works well locally).
"""

from __future__ import annotations

import argparse
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH = 1080
HEIGHT = 1920
FPS = 25
DURATION = 15

PAPER = "#F6F4EE"
CARD = "#FCFBF8"
INK = "#1F1F1C"
MUTED = "#6F6C65"
QUIET = "#969188"
LINE = "#DCD7CD"
BLUE = "#365B9D"
BLUE_LIGHT = "#E9EEF8"
GREEN = "#26765F"
GREEN_LIGHT = "#EAF4EF"

ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
GEORGIA_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


F_LOGO = font(ARIAL_BOLD, 38)
F_EYEBROW = font(ARIAL_BOLD, 23)
F_HERO = font(GEORGIA_BOLD, 92)
F_H1 = font(GEORGIA_BOLD, 76)
F_H2 = font(GEORGIA_BOLD, 55)
F_BODY = font(ARIAL, 32)
F_BODY_BOLD = font(ARIAL_BOLD, 32)
F_SMALL = font(ARIAL, 25)
F_SMALL_BOLD = font(ARIAL_BOLD, 25)
F_TINY = font(ARIAL, 20)
F_BUTTON = font(ARIAL_BOLD, 30)
F_NUMBER = font(GEORGIA_BOLD, 108)


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def ease(value: float) -> float:
    value = clamp(value)
    return value * value * (3 - 2 * value)


def scene_alpha(t: float, start: float, end: float, fade: float = 0.35) -> float:
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
    spacing: int = 12,
) -> int:
    x, y = xy
    lines = wrap(draw, text, text_font, max_width)
    line_height = text_font.getbbox("Ag")[3] - text_font.getbbox("Ag")[1]
    for line in lines:
        draw.text((x, y), line, font=text_font, fill=fill)
        y += line_height + spacing
    return y


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str | None = None, width: int = 2, radius: int = 28) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def logo(draw: ImageDraw.ImageDraw, y: int = 86) -> None:
    draw.text((70, y), "egzamin", font=F_LOGO, fill=MUTED)
    w = draw.textbbox((70, y), "egzamin", font=F_LOGO)[2]
    draw.text((w, y), "io", font=F_LOGO, fill=INK)


def top_rule(draw: ImageDraw.ImageDraw) -> None:
    draw.line((70, 156, WIDTH - 70, 156), fill=LINE, width=2)


def tick(draw: ImageDraw.ImageDraw, x: int, y: int, color: str = BLUE, scale: float = 1.0) -> None:
    points = [(x, y + int(11 * scale)), (x + int(10 * scale), y + int(22 * scale)), (x + int(31 * scale), y)]
    draw.line(points, fill=color, width=max(3, int(5 * scale)), joint="curve")


def arrow(draw: ImageDraw.ImageDraw, x: int, y: int, color: str = INK) -> None:
    draw.line((x, y, x + 33, y), fill=color, width=4)
    draw.line((x + 21, y - 11, x + 33, y, x + 21, y + 11), fill=color, width=4, joint="curve")


def base_frame() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)
    draw.ellipse((720, -280, 1320, 320), outline=LINE, width=2)
    draw.ellipse((780, 1570, 1320, 2110), outline=LINE, width=2)
    return image


def intro_scene(local_t: float) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    logo(draw)
    top_rule(draw)
    slide = int((1 - ease(local_t / 0.65)) * 46)
    draw.text((70, 285 + slide), "EGZAMIN ÓSMOKLASISTY", font=F_EYEBROW, fill=BLUE)
    draw.text((70, 385 + slide), "Egzamin", font=F_HERO, fill=INK)
    draw.text((70, 500 + slide), "bez paniki.", font=F_HERO, fill=INK)
    text_block(draw, (74, 660 + slide), "Autentyczne arkusze CKE z poprzednich lat.", F_BODY, MUTED, 820, 10)
    rounded(draw, (70, 830, 1010, 980), CARD, LINE, 2, 24)
    tick(draw, 108, 875, BLUE, 1.15)
    draw.text((170, 860), "2019–2026", font=F_BODY_BOLD, fill=INK)
    draw.text((170, 908), "Prawdziwe zadania egzaminacyjne", font=F_SMALL, fill=MUTED)
    draw.text((70, 1605), "egzamin.io", font=F_SMALL_BOLD, fill=BLUE)
    return image


def library_scene(local_t: float) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    logo(draw)
    top_rule(draw)
    draw.text((70, 270), "BAZA ZADAŃ", font=F_EYEBROW, fill=BLUE)
    count = int(1000 * ease(local_t / 1.15))
    draw.text((70, 380), f"{count}+", font=F_NUMBER, fill=INK)
    draw.text((70, 515), "pytań z arkuszy CKE", font=F_H2, fill=INK)
    text_block(draw, (74, 625), "Odpowiedzi i wyjaśnienia krok po kroku.", F_BODY, MUTED, 850, 10)
    years = ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"]
    for index, year in enumerate(years):
        row, col = divmod(index, 2)
        x = 70 + col * 485
        y = 820 + row * 138
        delay = index * 0.06
        offset = int((1 - ease((local_t - delay) / 0.45)) * 28)
        rounded(draw, (x, y + offset, x + 450, y + 105 + offset), CARD, LINE, 2, 20)
        draw.text((x + 28, y + 31 + offset), year, font=F_SMALL_BOLD, fill=INK)
        tick(draw, x + 370, y + 40 + offset, BLUE, 0.8)
    draw.text((70, 1605), "Matematyka · Polski · Języki obce", font=F_SMALL, fill=MUTED)
    return image


def task_scene(local_t: float) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    logo(draw)
    top_rule(draw)
    draw.text((70, 245), "ROZWIĄŻ → ZAPYTAJ → ZROZUM", font=F_EYEBROW, fill=BLUE)
    rounded(draw, (55, 330, 1025, 1575), CARD, LINE, 2, 30)
    draw.text((95, 385), "CKE 2024 · Matematyka · zadanie 7", font=F_TINY, fill=QUIET)
    text_block(draw, (95, 475), "Trapez ma podstawy 8 cm i 12 cm oraz wysokość 5 cm. Oblicz jego pole.", F_H2, INK, 840, 13)
    answers = [("A", "40 cm²"), ("B", "50 cm²"), ("C", "60 cm²")]
    selected = local_t > 0.8
    for index, (letter, answer_text) in enumerate(answers):
        y = 785 + index * 135
        active = selected and letter == "B"
        rounded(draw, (95, y, 935, y + 105), BLUE_LIGHT if active else CARD, BLUE if active else LINE, 3 if active else 2, 18)
        draw.ellipse((122, y + 27, 172, y + 77), fill=BLUE if active else CARD, outline=BLUE if active else LINE, width=2)
        draw.text((147, y + 52), letter, font=F_TINY, fill=CARD if active else MUTED, anchor="mm")
        draw.text((198, y + 31), answer_text, font=F_BODY, fill=INK)
        if active:
            draw.text((760, y + 38), "Poprawna", font=F_SMALL_BOLD, fill=GREEN)
    hint_progress = ease((local_t - 1.25) / 0.55)
    hint_y = int(1250 + (1 - hint_progress) * 70)
    rounded(draw, (95, hint_y, 935, hint_y + 230), GREEN_LIGHT, GREEN, 2, 18)
    draw.text((130, hint_y + 30), "Maia · nauczycielka AI", font=F_SMALL_BOLD, fill=GREEN)
    text_block(draw, (130, hint_y + 88), "Najpierw podziel sumę podstaw przez 2. Ile otrzymasz?", F_BODY, INK, 730, 8)
    return image


def parent_scene(local_t: float) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    logo(draw)
    top_rule(draw)
    draw.text((70, 250), "DLA RODZICA", font=F_EYEBROW, fill=BLUE)
    text_block(draw, (70, 345), "Wiesz, jak wspierać.", F_H1, INK, 900, 10)
    text_block(draw, (74, 555), "Postęp, regularność i tematy do powtórki w jednym miejscu.", F_BODY, MUTED, 850, 10)
    cards = [
        ("Rozwiązane", "48", "zadań"),
        ("Poprawne", "76%", "odpowiedzi"),
        ("Regularność", "5", "dni z rzędu"),
    ]
    for index, (label, value, suffix) in enumerate(cards):
        y = 780 + index * 225
        offset = int((1 - ease((local_t - index * 0.1) / 0.5)) * 44)
        rounded(draw, (70, y + offset, 1010, y + 180 + offset), CARD, LINE, 2, 22)
        draw.text((105, y + 34 + offset), label, font=F_SMALL, fill=MUTED)
        draw.text((105, y + 78 + offset), value, font=F_H2, fill=INK)
        draw.text((310, y + 105 + offset), suffix, font=F_SMALL, fill=QUIET)
        if index == 1:
            draw.rounded_rectangle((610, y + 90 + offset, 950, y + 112 + offset), radius=11, fill=LINE)
            draw.rounded_rectangle((610, y + 90 + offset, 868, y + 112 + offset), radius=11, fill=BLUE)
    return image


def cta_scene(local_t: float) -> Image.Image:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    logo(draw, 110)
    slide = int((1 - ease(local_t / 0.55)) * 50)
    draw.text((70, 430 + slide), "Zacznij", font=F_HERO, fill=INK)
    draw.text((70, 545 + slide), "bezpłatnie.", font=F_HERO, fill=INK)
    text_block(draw, (74, 720 + slide), "Arkusze CKE, odpowiedzi i Maia — pomoc krok po kroku.", F_BODY, MUTED, 850, 10)
    rounded(draw, (70, 930, 1010, 1055), BLUE, None, radius=24)
    draw.text((120, 965), "egzamin.io", font=F_BUTTON, fill=CARD)
    arrow(draw, 910, 992, CARD)
    draw.text((70, 1575), "Autentyczne arkusze CKE · ponad 1000 pytań", font=F_SMALL, fill=MUTED)
    draw.line((70, 1645, 1010, 1645), fill=LINE, width=2)
    draw.text((70, 1680), "Niezależny projekt edukacyjny", font=F_TINY, fill=QUIET)
    return image


SCENES = [
    (0.0, 2.8, intro_scene),
    (2.5, 5.8, library_scene),
    (5.5, 9.2, task_scene),
    (8.9, 12.2, parent_scene),
    (11.9, 15.0, cta_scene),
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
        frame = render_frame(frame_number / FPS)
        process.stdin.write(frame.tobytes())
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
