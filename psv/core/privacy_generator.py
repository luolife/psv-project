"""Gerador institucional da Política de Privacidade do PSV."""

import html
import re
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[2]
SOURCE_PATH = ROOT / "psv" / "legal" / "privacy_policy.md"
LOGO_PATH = ROOT / "psv-frontend" / "src" / "assets" / "logo.png.png"
FONT_DIR = Path("C:/Windows/Fonts")

TEXT_DARK = colors.HexColor("#111827")
TEXT_MUTED = colors.HexColor("#64748B")


def _register_fonts():
    try:
        pdfmetrics.registerFont(TTFont("Arial", str(FONT_DIR / "arial.ttf")))
        pdfmetrics.registerFont(TTFont("Arial-Bold", str(FONT_DIR / "arialbd.ttf")))
        pdfmetrics.registerFont(TTFont("Arial-Italic", str(FONT_DIR / "ariali.ttf")))
        pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial-Italic")
    except Exception:
        pdfmetrics.registerFontFamily(
            "Arial", normal="Helvetica", bold="Helvetica-Bold", italic="Helvetica-Oblique"
        )


_register_fonts()


def _styles():
    return {
        "title": ParagraphStyle(
            "privacy_title",
            fontName="Arial-Bold",
            fontSize=12,
            leading=18,
            alignment=TA_CENTER,
            textColor=TEXT_DARK,
            spaceAfter=13,
        ),
        "meta": ParagraphStyle(
            "privacy_meta",
            fontName="Arial",
            fontSize=12,
            leading=18,
            alignment=TA_LEFT,
            textColor=TEXT_DARK,
            spaceAfter=1,
        ),
        "section": ParagraphStyle(
            "privacy_section",
            fontName="Arial-Bold",
            fontSize=12,
            leading=18,
            alignment=TA_LEFT,
            textColor=TEXT_DARK,
            spaceBefore=14,
            spaceAfter=8,
            keepWithNext=True,
        ),
        "subsection": ParagraphStyle(
            "privacy_subsection",
            fontName="Arial-Bold",
            fontSize=12,
            leading=18,
            alignment=TA_LEFT,
            textColor=TEXT_DARK,
            spaceBefore=11,
            spaceAfter=7,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "privacy_body",
            fontName="Arial",
            fontSize=12,
            leading=18,
            alignment=TA_JUSTIFY,
            firstLineIndent=1.25 * cm,
            textColor=TEXT_DARK,
            spaceAfter=6,
        ),
        "letter": ParagraphStyle(
            "privacy_letter",
            fontName="Arial",
            fontSize=12,
            leading=18,
            alignment=TA_JUSTIFY,
            leftIndent=2 * cm,
            firstLineIndent=0,
            textColor=TEXT_DARK,
            spaceAfter=2,
        ),
    }


def _inline_markup(text: str) -> str:
    escaped = html.escape(text.strip())
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)


def _draw_page_frame(canvas, doc):
    canvas.saveState()
    page_width, page_height = A4
    left = doc.leftMargin
    right = page_width - doc.rightMargin
    center_x = page_width / 2

    header_center_y = page_height - 1.25 * cm
    header_text_y = header_center_y - 0.075 * cm
    header_line_y = page_height - 2.15 * cm

    if LOGO_PATH.exists():
        try:
            logo = ImageReader(str(LOGO_PATH))
            logo_size = 0.86 * cm
            canvas.drawImage(
                logo,
                left,
                header_center_y - logo_size / 2,
                width=logo_size,
                height=logo_size,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception:
            pass

    canvas.setFillColor(TEXT_DARK)
    canvas.setFont("Arial-Bold", 8)
    canvas.drawString(left + 1.1 * cm, header_text_y, "Protocolo Sensorial Visual — PSV")
    canvas.setFillColor(TEXT_MUTED)
    canvas.setFont("Arial", 7)
    canvas.drawRightString(right, header_text_y, "Produto Técnico–Tecnológico")

    canvas.setStrokeColor(colors.HexColor("#D9DEE7"))
    canvas.setLineWidth(0.55)
    canvas.line(left, header_line_y, right, header_line_y)
    canvas.line(left, 1.45 * cm, right, 1.45 * cm)

    canvas.setFont("Arial", 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(center_x, 0.9 * cm, "PSV v1.0 • Política de Privacidade • 2026")
    canvas.restoreState()


def _build_story(source: str):
    styles = _styles()
    story = []
    paragraph_lines = []

    def flush_paragraph():
        if paragraph_lines:
            story.append(Paragraph(_inline_markup(" ".join(paragraph_lines)), styles["body"]))
            paragraph_lines.clear()

    for raw_line in source.splitlines():
        line = raw_line.strip()
        if not line or line == "---":
            flush_paragraph()
            continue
        if line.startswith("# "):
            flush_paragraph()
            story.append(Paragraph(_inline_markup(line[2:]), styles["title"]))
            continue
        if line.startswith("## "):
            flush_paragraph()
            story.append(Paragraph(_inline_markup(line[3:]), styles["section"]))
            continue
        if line.startswith("### "):
            flush_paragraph()
            story.append(Paragraph(_inline_markup(line[4:]), styles["subsection"]))
            continue
        if re.match(r"^[a-z]\)\s", line, flags=re.IGNORECASE):
            flush_paragraph()
            story.append(Paragraph(_inline_markup(line), styles["letter"]))
            continue
        if line.startswith("**") and ":**" in line:
            flush_paragraph()
            story.append(Paragraph(_inline_markup(line), styles["meta"]))
            continue
        paragraph_lines.append(line)

    flush_paragraph()
    return story


def generate_privacy_pdf() -> bytes:
    source = SOURCE_PATH.read_text(encoding="utf-8")
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=3 * cm,
        rightMargin=2 * cm,
        topMargin=3 * cm,
        bottomMargin=2 * cm,
    )
    story = _build_story(source)
    story.insert(4, Spacer(1, 0.2 * cm))
    doc.build(story, onFirstPage=_draw_page_frame, onLaterPages=_draw_page_frame)
    return buffer.getvalue()


if __name__ == "__main__":
    output = ROOT / "psv-frontend" / "public" / "documents" / "politica-privacidade-v6.pdf"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(generate_privacy_pdf())
