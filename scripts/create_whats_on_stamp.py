from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
LOGO = Path("/Users/rushi/Downloads/New Logo - Blip and Text.png")
OUT = ROOT / "generated-documents" / "whats-on-company-stamp-abn.png"

BLACK = (18, 18, 18, 255)
MUTED = (42, 42, 42, 255)
GOLD = (250, 220, 74, 255)
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


def centered_text(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], text: str, fnt, fill) -> None:
    left, top, right, bottom = box
    bbox = draw.textbbox((0, 0), text, font=fnt)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = left + (right - left - w) / 2
    y = top + (bottom - top - h) / 2 - bbox[1]
    draw.text((x, y), text, font=fnt, fill=fill)


def logo_stencil(width: int) -> Image.Image:
    src = Image.open(LOGO).convert("RGBA")
    # The supplied logo is white artwork on black; use bright pixels as the stencil.
    gray = src.convert("L")
    mask = gray.point(lambda p: 255 if p > 62 else 0)
    bbox = mask.getbbox()
    if bbox:
        src = src.crop(bbox)
        mask = mask.crop(bbox)
    ratio = width / src.width
    size = (width, int(src.height * ratio))
    mask = mask.resize(size, Image.Resampling.LANCZOS)
    recolored = Image.new("RGBA", size, BLACK)
    recolored.putalpha(mask)
    return recolored


def add_subtle_stamp_texture(img: Image.Image, seed: int = 673795465) -> Image.Image:
    random.seed(seed)
    alpha = img.getchannel("A")
    noise = Image.new("L", img.size, 255)
    px = noise.load()
    width, height = img.size
    for _ in range(9000):
        x = random.randrange(width)
        y = random.randrange(height)
        # Small transparent flecks to make it feel printed, without hurting legibility.
        px[x, y] = random.randrange(150, 235)
    noise = noise.filter(ImageFilter.GaussianBlur(0.35))
    alpha = Image.composite(ImageChops_multiply(alpha, noise), alpha, alpha.point(lambda p: 255 if p else 0))
    out = img.copy()
    out.putalpha(alpha)
    return out


def ImageChops_multiply(a: Image.Image, b: Image.Image) -> Image.Image:
    # Avoid importing the full module for one operation.
    return Image.eval(Image.merge("RGB", (a, b, b)).convert("L"), lambda p: p)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    w, h = 1800, 820
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    draw = ImageDraw.Draw(img)

    margin = 44
    outer = (margin, margin, w - margin, h - margin)
    inner = (margin + 32, margin + 32, w - margin - 32, h - margin - 32)
    band = (margin + 70, 250, w - margin - 70, 570)

    # Rubber-stamp frame.
    draw.rounded_rectangle(outer, radius=78, outline=BLACK, width=16)
    draw.rounded_rectangle(inner, radius=58, outline=GOLD, width=10)
    draw.rounded_rectangle(band, radius=34, outline=BLACK, width=8)

    centered_text(draw, (margin + 80, 84, w - margin - 80, 184), "WHAT'S ON! CAMPUS PTY LTD", font(58, True), BLACK)

    logo = logo_stencil(920)
    img.alpha_composite(logo, ((w - logo.width) // 2, 292))

    centered_text(draw, (margin + 100, 596, w - margin - 100, 672), "ABN 75 673 795 465", font(54, True), BLACK)
    centered_text(draw, (margin + 100, 676, w - margin - 100, 730), "AUSTRALIA", font(33, True), MUTED)

    # Small gold side ticks give it a branded stamp feel without implying a statutory common seal.
    for x in (margin + 115, w - margin - 115):
        draw.line((x - 50, h // 2, x + 50, h // 2), fill=GOLD, width=12)

    # Keep the asset level, but add a tiny non-perfect ink offset.
    img = img.rotate(-1.2, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=TRANSPARENT)
    img = img.crop(img.getbbox())
    img.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
