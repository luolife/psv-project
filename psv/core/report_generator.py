"""
PSV — Gerador de Relatório PDF
================================
Usa ReportLab para montar o relatório da avaliação.
Layout baseado no protótipo: tabela de tasks + tabela de checklist.
"""

from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


# ---------------------------------------------------------------------------
# Paleta de cores — alinhada ao protótipo
# ---------------------------------------------------------------------------

PSV_BLUE   = colors.HexColor("#1A3A6B")
PSV_BLUE_L = colors.HexColor("#2563A8")
PSV_GRAY   = colors.HexColor("#F5F5F5")
PSV_LINE   = colors.HexColor("#DDDDDD")
TEXT_DARK  = colors.HexColor("#1A1A1A")
TEXT_MUTED = colors.HexColor("#666666")

LEVEL_COLORS = {
    "Alto":   colors.HexColor("#C0392B"),
    "Médio":  colors.HexColor("#E67E22"),
    "Baixo":  colors.HexColor("#27AE60"),
}

TASK_LABELS = {
    "contrast": "Limiares de Contraste Visual",
    "motion":   "Movimento Global",
    "gabor":    "Padrões Espaciais",
}


# ---------------------------------------------------------------------------
# Estilos
# ---------------------------------------------------------------------------

def _build_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "title",
            fontSize=18,
            fontName="Helvetica-Bold",
            textColor=PSV_BLUE,
            alignment=TA_CENTER,
            spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            fontSize=11,
            fontName="Helvetica",
            textColor=TEXT_MUTED,
            alignment=TA_CENTER,
            spaceAfter=2,
        ),
        "section": ParagraphStyle(
            "section",
            fontSize=12,
            fontName="Helvetica-Bold",
            textColor=PSV_BLUE,
            spaceBefore=14,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            fontSize=10,
            fontName="Helvetica",
            textColor=TEXT_DARK,
            spaceAfter=2,
        ),
        "small": ParagraphStyle(
            "small",
            fontSize=8,
            fontName="Helvetica",
            textColor=TEXT_MUTED,
        ),
    }
    return styles


# ---------------------------------------------------------------------------
# Helpers de tabela
# ---------------------------------------------------------------------------

TABLE_STYLE_BASE = TableStyle([
    ("BACKGROUND",  (0, 0), (-1, 0),  PSV_BLUE),
    ("TEXTCOLOR",   (0, 0), (-1, 0),  colors.white),
    ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
    ("FONTSIZE",    (0, 0), (-1, 0),  10),
    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
    ("TOPPADDING",    (0, 0), (-1, 0), 8),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PSV_GRAY]),
    ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
    ("FONTSIZE",    (0, 1), (-1, -1), 9),
    ("TOPPADDING",  (0, 1), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("GRID",        (0, 0), (-1, -1), 0.5, PSV_LINE),
    ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
])


# ---------------------------------------------------------------------------
# Seções do relatório
# ---------------------------------------------------------------------------

def _participant_info(session, styles) -> list:
    s = styles
    p = session.participant

    date_str = session.created_at.strftime("%d/%m/%Y")
    sex_label = {"M": "Masculino", "F": "Feminino", "O": "Outro"}.get(p.sex, p.sex)

    info_data = [
        ["Participante", "Idade", "Sexo", "Data da Avaliação", "Profissional"],
        [p.initials, str(p.age), sex_label, date_str, session.professional.name],
    ]
    info_table = Table(info_data, colWidths=[4*cm, 2.5*cm, 3*cm, 4*cm, 4.5*cm])
    info_table.setStyle(TABLE_STYLE_BASE)

    return [
        Paragraph("Resultados da Avaliação do PSV", s["title"]),
        Paragraph("Protocolo Sensorial Visual", s["subtitle"]),
        Spacer(1, 0.3*cm),
        HRFlowable(width="100%", thickness=1.5, color=PSV_BLUE),
        Spacer(1, 0.4*cm),
        Paragraph("Dados do Participante", s["section"]),
        info_table,
    ]


def _tasks_table(session, styles) -> list:
    task_map = {t.task_name if isinstance(t.task_name, str) else t.task_name.value: t
                for t in session.task_results}

    rows = [["Habilidade", "Acertos", "Erros", "Omissões", "Tempo Médio (ms)", "Data"]]

    for key, label in TASK_LABELS.items():
        task = task_map.get(key)
        if task:
            hit_pct = f"{task.hits}/{task.total_trials} ({round(task.hits/task.total_trials*100)}%)" if task.total_trials else "—"
            rt = f"{round(task.mean_rt_ms)}" if task.mean_rt_ms else "—"
            date_str = task.created_at.strftime("%d/%m/%Y")
            rows.append([label, hit_pct, str(task.errors), str(task.omissions), rt, date_str])
        else:
            rows.append([label, "—", "—", "—", "—", "—"])

    col_widths = [5.5*cm, 3*cm, 2*cm, 2.5*cm, 3.5*cm, 2.5*cm]
    table = Table(rows, colWidths=col_widths)
    table.setStyle(TABLE_STYLE_BASE)

    return [
        Paragraph("Tarefas Computadorizadas", styles["section"]),
        table,
    ]


def _checklist_table(session, styles) -> list:
    cl = session.checklist
    if not cl:
        return [Paragraph("Check-list não aplicado nesta sessão.", styles["body"])]

    domains = [
        ("Hipersensibilidade Visual (HEV)", cl.hev_score, cl.hev_level),
        ("Hipossensibilidade Visual (HOV)", cl.hov_score, cl.hov_level),
        ("Busca Sensorial Visual (BSV)",    cl.bsv_score, cl.bsv_level),
    ]

    rows = [["Domínio", "Score (0–100)", "Classificação"]]
    for label, score, level in domains:
        rows.append([label, f"{score:.1f}", level])

    col_widths = [9*cm, 4*cm, 5*cm]
    table = Table(rows, colWidths=col_widths)

    style = TableStyle(list(TABLE_STYLE_BASE._cmds))
    # Colorir a coluna de classificação por nível
    for row_idx, (_, _, level) in enumerate(domains, start=1):
        color = LEVEL_COLORS.get(level, TEXT_DARK)
        style.add("TEXTCOLOR", (2, row_idx), (2, row_idx), color)
        style.add("FONTNAME",  (2, row_idx), (2, row_idx), "Helvetica-Bold")
    table.setStyle(style)

    return [
        Paragraph("Check-list de Sensibilidade Visual", styles["section"]),
        table,
    ]


def _footer(styles) -> list:
    now = datetime.now().strftime("%d/%m/%Y às %H:%M")
    return [
        Spacer(1, 0.6*cm),
        HRFlowable(width="100%", thickness=0.5, color=PSV_LINE),
        Spacer(1, 0.2*cm),
        Paragraph(
            f"Documento gerado automaticamente pelo PSV em {now}. "
            "Este relatório é de uso exclusivo do profissional responsável.",
            styles["small"],
        ),
    ]


# ---------------------------------------------------------------------------
# Entrada pública
# ---------------------------------------------------------------------------

def generate_pdf(session) -> bytes:
    """
    Gera o PDF da avaliação e retorna como bytes.

    Args:
        session: instância de PSVSession com participant, checklist
                 e task_results carregados (SQLAlchemy relationships).

    Returns:
        bytes do PDF pronto para streaming ou salvar em disco.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2*cm,
        rightMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )

    styles = _build_styles()
    story = []

    story.extend(_participant_info(session, styles))
    story.extend(_tasks_table(session, styles))
    story.append(Spacer(1, 0.3*cm))
    story.extend(_checklist_table(session, styles))
    story.extend(_footer(styles))

    doc.build(story)
    return buffer.getvalue()
