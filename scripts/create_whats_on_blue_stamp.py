from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
LOGO = Path("/Users/rushi/Downloads/New Logo - Blip and Text.png")
OUT_DIR = ROOT / "generated-documents"
PAPER_OUT = OUT_DIR / "whats-on-company-stamp-blue-on-paper.png"
TRANSPARENT_OUT = OUT_DIR / "whats-on-company-stamp-blue-transparent.png"

BLUE = (22, 83, 178, 255)
BLUE_DARK = (10, 55, 145, 255)
PAPER = (248, 246, 239, 255)
TRANSPARENT = (255, 255, 255, 0)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def draw_centered(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], text: str, fnt, fill) -> None:
    left, top, right, bottom = box
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = left + (right - left - tw) / 2
    y = top + (bottom - top - th) / 2 - bbox[1]
    draw.text((x, y), text, font=fnt, fill=fill)


def logo_mask(target_width: int) -> Image.Image:
    src = Image.open(LOGO).convert("RGBA")
    gray = src.convert("L")
    mask = gray.point(lambda p: 255 if p > 64 else 0)
    bbox = mask.getbbox()
    if bbox:
        mask = mask.crop(bbox)
    ratio = target_width / mask.width
    target_size = (target_width, int(mask.height * ratio))
    return mask.resize(target_size, Image.Resampling.LANCZOS)


def distressed_alpha(base_alpha: Image.Image, seed: int = 75673795465) -> Image.Image:
    random.seed(seed)
    w, h = base_alpha.size
    noise = Image.new("L", (w, h), 255)
    pix = noise.load()

    for _ in range(85000):
        x = random.randrange(w)
        y = random.randrange(h)
        pix[x, y] = random.randrange(15, 235)

    for _ in range(1200):
        cx = random.randrange(w)
        cy = random.randrange(h)
        rx = random.randrange(1, 5)
        ry = random.randrange(1, 4)
        val = random.randrange(0, 90)
        ImageDraw.Draw(noise).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=val)

    noise = noise.filter(ImageFilter.GaussianBlur(0.45))
    alpha = ImageChops.multiply(base_alpha, noise)

    # Uneven pressure: slightly lighter in a few bands.
    pressure = Image.new("L", (w, h), 235)
    pdraw = ImageDraw.Draw(pressure)
    for i in range(10):
        y = int(h * (i + 0.5) / 10 + random.randrange(-18, 18))
        pdraw.line((0, y, w, y + random.randrange(-8, 8)), fill=random.randrange(165, 235), width=random.randrange(3, 11))
    pressure = pressure.filter(ImageFilter.GaussianBlur(8))
    alpha = ImageChops.multiply(alpha, pressure)
    return alpha


def make_stamp_layer() -> Image.Image:
    w, h = 1900, 960
    layer = Image.new("RGBA", (w, h), TRANSPARENT)
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)

    margin = 75
    outer = (margin, margin, w - margin, h - margin)
    inner = (margin + 42, margin + 42, w - margin - 42, h - margin - 42)
    panel = (margin + 95, 290, w - margin - 95, 620)

    draw.rounded_rectangle(outer, radius=92, outline=255, width=22)
    draw.rounded_rectangle(inner, radius=66, outline=255, width=10)
    draw.rounded_rectangle(panel, radius=42, outline=255, width=11)

    # Side registration ticks.
    draw.line((margin + 78, h // 2, margin + 185, h // 2), fill=255, width=14)
    draw.line((w - margin - 185, h // 2, w - margin - 78, h // 2), fill=255, width=14)

    text_layer = Image.new("L", (w, h), 0)
    text_draw = ImageDraw.Draw(text_layer)
    draw_centered(text_draw, (160, 104, w - 160, 220), "WHAT'S ON! CAMPUS PTY LTD", font(66, True), 255)
    draw_centered(text_draw, (160, 660, w - 160, 748), "ABN 75 673 795 465", font(64, True), 255)
    draw_centered(text_draw, (160, 752, w - 160, 812), "AUSTRALIA", font(38, True), 235)
    mask = ImageChops.lighter(mask, text_layer)

    lm = logo_mask(1040)
    logo_canvas = Image.new("L", (w, h), 0)
    logo_canvas.paste(lm, ((w - lm.width) // 2, 342), lm)
    mask = ImageChops.lighter(mask, logo_canvas)

    mask = distressed_alpha(mask)
    blue = Image.new("RGBA", (w, h), BLUE)
    layer.alpha_composite(blue)
    layer.putalpha(mask)

    # Slight blur and offset ghosting simulate ink bleed.
    bleed = layer.filter(ImageFilter.GaussianBlur(0.45))
    layer = Image.alpha_composite(bleed, layer)
    layer = layer.rotate(-2.6, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=TRANSPARENT)
    return layer.crop(layer.getbbox())


def make_paper(size: tuple[int, int], seed: int = 20260701) -> Image.Image:
    random.seed(seed)
    w, h = size
    paper = Image.new("RGBA", size, PAPER)
    texture = Image.new("L", size, 128)
    pix = texture.load()
    for y in range(h):
        for x in range(w):
            val = 128 + random.randrange(-12, 13)
            val += int(4 * math.sin((x + y) / 53))
            pix[x, y] = max(0, min(255, val))
    texture = texture.filter(ImageFilter.GaussianBlur(0.7))
    tint = Image.new("RGBA", size, (255, 255, 255, 0))
    tpix = texture.load()
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    opix = overlay.load()
    for y in range(h):
        for x in range(w):
            delta = tpix[x, y] - 128
            if delta >= 0:
                opix[x, y] = (255, 255, 255, min(35, delta * 3))
            else:
                opix[x, y] = (120, 98, 65, min(26, -delta * 2))
    paper = Image.alpha_composite(paper, tint)
    paper = Image.alpha_composite(paper, overlay)
    return paper


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = make_stamp_layer()
    stamp.save(TRANSPARENT_OUT)

    paper = make_paper((2300, 1450))
    x = (paper.width - stamp.width) // 2
    y = (paper.height - stamp.height) // 2 + 18
    paper.alpha_composite(stamp, (x, y))

    # Add very light paper edge shadow so it reads as a scanned paper crop.
    vignette = Image.new("RGBA", paper.size, (0, 0, 0, 0))
    vdraw = ImageDraw.Draw(vignette)
    vdraw.rectangle((0, 0, paper.width - 1, paper.height - 1), outline=(120, 105, 80, 28), width=8)
    paper = Image.alpha_composite(paper, vignette)
    paper.convert("RGB").save(PAPER_OUT, quality=96)
    print(PAPER_OUT)
    print(TRANSPARENT_OUT)


if __name__ == "__main__":
    main()
