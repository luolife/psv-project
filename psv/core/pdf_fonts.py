"""Fontes portaveis para os PDFs gerados localmente e no Railway."""

from pathlib import Path

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


WINDOWS_FONT_DIR = Path("C:/Windows/Fonts")


def register_arial_compatible_fonts(font_dir: Path = WINDOWS_FONT_DIR) -> None:
    """Usa Arial quando disponivel e Helvetica como substituta no Linux."""
    try:
        pdfmetrics.registerFont(TTFont("Arial", str(font_dir / "arial.ttf")))
        pdfmetrics.registerFont(TTFont("Arial-Bold", str(font_dir / "arialbd.ttf")))
        pdfmetrics.registerFont(TTFont("Arial-Italic", str(font_dir / "ariali.ttf")))
        pdfmetrics.registerFont(
            TTFont("Arial-BoldItalic", str(font_dir / "arialbi.ttf"))
        )
    except Exception:
        aliases = {
            "Arial": "Helvetica",
            "Arial-Bold": "Helvetica-Bold",
            "Arial-Italic": "Helvetica-Oblique",
            "Arial-BoldItalic": "Helvetica-BoldOblique",
        }
        for alias, face in aliases.items():
            pdfmetrics.registerFont(
                pdfmetrics.Font(alias, face, "WinAnsiEncoding")
            )

    pdfmetrics.registerFontFamily(
        "Arial",
        normal="Arial",
        bold="Arial-Bold",
        italic="Arial-Italic",
        boldItalic="Arial-BoldItalic",
    )
