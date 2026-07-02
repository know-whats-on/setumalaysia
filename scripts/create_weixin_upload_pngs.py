from __future__ import annotations

import subprocess
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DESKTOP = Path("/Users/rushi/Desktop")
OUT_DIR = DESKTOP / "weixin-upload-pngs"
LOGO = Path("/Users/rushi/Downloads/New Logo - Blip and Text.png")
STAMP = ROOT / "generated-documents" / "whats-on-company-stamp-blue-transparent.png"
APP_PDF = DESKTOP / "weixin_official_account_application_whats_on_campus_stamped.pdf"
AUTH_PDF = DESKTOP / "operation_authorization_letter_whats_on_campus_stamped.pdf"

PY_RUNTIME_BIN = Path("/Users/rushi/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin")


BLACK = (18, 18, 18, 255)
GREY = (102, 102, 102, 255)
LINE = (210, 216, 224, 255)
GOLD = (250, 220, 74, 255)
WHITE = (255, 255, 255, 255)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for candidate in candidates:
        p = Path(candidate)
        if p.exists():
            return ImageFont.truetype(str(p), size=size)
    return ImageFont.load_default()


def text_width(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> int:
    bbox = draw.textbbox((0, 0), text, font=fnt)
    return bbox[2] - bbox[0]


def wrap_pixels(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for para in text.split("\n"):
        if not para:
            lines.append("")
            continue
        words = para.split()
        current = ""
        for word in words:
            candidate = word if not current else f"{current} {word}"
            if text_width(draw, candidate, fnt) <= max_width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    fnt: ImageFont.FreeTypeFont,
    max_width: int,
    fill=BLACK,
    leading: int = 38,
) -> int:
    x, y = xy
    for line in wrap_pixels(draw, text, fnt, max_width):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += leading
    return y


def draw_center(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], text: str, fnt, fill=BLACK) -> None:
    left, top, right, bottom = box
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((left + (right - left - tw) / 2, top + (bottom - top - th) / 2 - bbox[1]), text, font=fnt, fill=fill)


def paste_letterhead(img: Image.Image, draw: ImageDraw.ImageDraw, left: int, top: int, width: int) -> int:
    masthead_h = 210
    gold_h = 58
    draw.rectangle((left, top, left + width, top + masthead_h), fill=(0, 0, 0, 255))
    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((620, masthead_h - 48), Image.Resampling.LANCZOS)
    img.alpha_composite(logo, (left + 48, top + 24))
    draw.rectangle((left, top + masthead_h, left + width, top + masthead_h + gold_h), fill=GOLD)
    return top + masthead_h + gold_h


def extract_application_signature() -> Image.Image | None:
    page2 = OUT_DIR / "application_form_original_page-2.png"
    if not page2.exists():
        return None
    src = Image.open(page2).convert("RGBA")
    # Crop around the handwritten signature only. The threshold keeps black ink
    # while dropping the white paper and grey table line.
    crop = src.crop((235, 1230, 850, 1390))
    alpha = Image.new("L", crop.size, 0)
    pix = crop.load()
    apix = alpha.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, _ = pix[x, y]
            if r < 115 and g < 115 and b < 115:
                apix[x, y] = 255
    bbox = alpha.getbbox()
    if not bbox:
        return None
    crop = crop.crop(bbox)
    alpha = alpha.crop(bbox)
    # Render the signature as clean black ink over transparency.
    sig = Image.new("RGBA", crop.size, (0, 0, 0, 255))
    sig.putalpha(alpha)
    return sig


def create_one_page_application_png() -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "application_form_one_page_upload.png"

    w, h = 2550, 3300
    img = Image.new("RGBA", (w, h), WHITE)
    draw = ImageDraw.Draw(img)
    margin = 220
    content_w = w - 2 * margin

    y = 170
    y = paste_letterhead(img, draw, margin, y, content_w)
    y += 120

    title_f = font(50, True)
    sub_f = font(34, True)
    body_f = font(29, False)
    body_b = font(29, True)
    small_b = font(26, True)
    small_f = font(26, False)

    draw_center(
        draw,
        (margin, y, w - margin, y + 112),
        "WEIXIN OFFICIAL ACCOUNT REGISTRATION AND VERIFICATION APPLICATION FORM",
        title_f,
    )
    y += 112
    draw_center(draw, (margin, y, w - margin, y + 58), "(International Applicant)", sub_f, GREY)
    y += 122
    draw.rectangle((margin, y, w - margin, y + 9), fill=GOLD)
    y += 64

    opening = (
        "The Applicant(entity name) What's On! Campus Pty Ltd hereby irrevocably applies for registration and "
        "verification Weixin (Official Accounts/Mini Programs/Open Platform) (Original ID) gh_119addaec551"
        "(the \"Account\"), and agrees with the followings:"
    )
    y = draw_wrapped(draw, (margin, y), opening, body_f, content_w, leading=38)
    y += 28

    clauses = [
        "The Applicant represents and warrants that it has full and complete capability and authority to authorize the Contact Person who is designated by the Applicant and submitted to Tencent in the process of registration and verification of the Account (including any changes to the Contact Person which may be submitted by the Applicant from time to time via designated Account channels) to irrevocably apply for registration, verification, operation, maintenance and management of the Account on behalf of the Applicant, to pay application fee by WeChat Pay, credit card or debit card of the Contact Person for the Applicant and that the Contact Person has full and complete capability and authority to perform the foregoing authorization. Any and all obligations and liabilities arising from or related to the Account shall be assumed by the Applicant and Contact Person.",
        "The Applicant hereby agrees that, when applying for registration and verification of the Account, the Applicant shall fill in its name and confirm by signing this application form. After successful Account verification, verified Applicants shall have the right to use the Account. Any and all rights and obligations arising from the Account as from the date of registration shall be assumed by the Applicant. The verified Applicants shall be entitled to any and all earnings and permissions obtained by the Account, and all operation activities must be carried out by the Applicant.",
        "The Applicant hereby acknowledges and represents that all registration and verification information that are submitted to Tencent are true, accurate and valid, and that it irrevocably authorizes Tencent and any third-party verification organization delegated by Tencent to review and verify the submitted materials. The Applicant acknowledges and agrees that the verification service fee paid will not be refunded regardless of the verification result, withdrawal of application by the Applicant or any other factors.",
        "The Applicant acknowledges and agrees that content maintenance, development maintenance and operation management of the Account shall comply with the applicable laws and regulations of the People's Republic of China and local rules, as well as relevant agreements and rules of Tencent (collectively, the \"Tencent Agreements\") , including but not limited to Tencent Service Agreement, Weixin Official Accounts Platform Service Agreement, Weixin Official Accounts Platform Authentication Service Agreement, Weixin Mini-Program Platform - Terms of Service, Weixin Open Platform Developer Service Agreement. The Applicant shall solely assume all the liabilities if it violates any of the foregoing commitments.",
        "The Applicant acknowledges and agrees that this registration and verification process is limited to reviewing the authenticity and legality of the materials submitted by the Applicant. Whether certain features and permissions can be granted, or whether the Account can be created shall be subject to specific rules formulated by the platform, which is independent of the verification result. Tencent may, at its sole discretion, accept or reject the application for registration and verification of the Account.",
    ]
    num_x = margin + 36
    text_x = margin + 120
    for idx, clause in enumerate(clauses, 1):
        draw.text((num_x, y), f"{idx}.", font=body_f, fill=BLACK)
        y = draw_wrapped(draw, (text_x, y), clause, body_f, content_w - 120, leading=36)
        y += 14

    confirmation = (
        "The Applicant hereby confirms that there is no objection to the above registration and verification information "
        "and to this application form. This application form shall remain in full force and effect, provided that no "
        "changes occur to the Applicant."
    )
    y += 12
    y = draw_wrapped(draw, (margin, y), confirmation, body_f, content_w, leading=37)
    y += 42

    draw.text((margin, y), "Sign by authorized representative of the Applicant:", font=body_b, fill=BLACK)
    y += 58

    table_h = 360
    left_w = int(content_w * 0.55)
    right_w = content_w - left_w
    x0 = margin
    x1 = margin + left_w
    x2 = margin + content_w
    y0 = y
    y1 = y0 + 245
    y2 = y0 + table_h
    draw.rectangle((x0, y0, x2, y2), outline=LINE, width=3)
    draw.line((x1, y0, x1, y2), fill=LINE, width=3)
    draw.line((x0, y1, x2, y1), fill=LINE, width=3)
    draw.text((x0 + 34, y0 + 32), "Authorized representative signature", font=small_b, fill=GREY)
    draw.line((x0 + 34, y0 + 190, x1 - 34, y0 + 190), fill=(150, 160, 175, 255), width=3)
    signature = extract_application_signature()
    if signature is not None:
        signature.thumbnail((720, 160), Image.Resampling.LANCZOS)
        img.alpha_composite(signature, (x0 + 160, y0 + 90))
    draw.text((x0 + 34, y1 + 35), "Date:", font=body_b, fill=BLACK)
    draw.text((x0 + 132, y1 + 35), "01/07/2026", font=body_f, fill=BLACK)

    if STAMP.exists():
        stamp = Image.open(STAMP).convert("RGBA")
        stamp.thumbnail((right_w - 70, 225), Image.Resampling.LANCZOS)
        img.alpha_composite(stamp, (x1 + (right_w - stamp.width) // 2, y0 + (245 - stamp.height) // 2))
    else:
        draw_center(draw, (x1, y0, x2, y1), "Please affix with the company seal", small_b, BLACK)

    # Footer.
    draw.text((margin + 640, h - 130), "What's On! Campus Pty Ltd | Weixin Official Account Application", font=small_f, fill=GREY)
    draw.line((margin, h - 92, w - margin, h - 92), fill=LINE, width=2)

    img.convert("RGB").save(out, optimize=True)
    return out


def render_pdf_to_png(pdf: Path, prefix: Path, dpi: int = 240) -> list[Path]:
    cmd = [
        str(PY_RUNTIME_BIN / "pdftoppm"),
        "-r",
        str(dpi),
        "-png",
        str(pdf),
        str(prefix),
    ]
    subprocess.run(cmd, check=True)
    return sorted(prefix.parent.glob(f"{prefix.name}-*.png"))


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # Render original pages first, both as fallback reference PNGs and so the
    # compact one-page file can preserve the handwritten signature.
    original_prefix = OUT_DIR / "application_form_original_page"
    auth_prefix = OUT_DIR / "operation_authorization_letter_upload"
    for p in OUT_DIR.glob("application_form_original_page-*.png"):
        p.unlink()
    for p in OUT_DIR.glob("operation_authorization_letter_upload-*.png"):
        p.unlink()
    app_pages = render_pdf_to_png(APP_PDF, original_prefix, dpi=240)
    auth_pages = render_pdf_to_png(AUTH_PDF, auth_prefix, dpi=240)
    one_page = create_one_page_application_png()

    if auth_pages:
        final_auth = OUT_DIR / "operation_authorization_letter_upload.png"
        if final_auth.exists():
            final_auth.unlink()
        auth_pages[0].rename(final_auth)
        auth_pages = [final_auth]

    print(one_page)
    for p in app_pages:
        print(p)
    for p in auth_pages:
        print(p)


if __name__ == "__main__":
    main()
