"""
PSV — Gerador de Relatório PDF
================================
Usa ReportLab para montar o relatório da avaliação.
Layout baseado no protótipo: tabela de tarefas computadorizadas.
"""

import json
from pathlib import Path
from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from core.pdf_fonts import register_arial_compatible_fonts


# ---------------------------------------------------------------------------
# Paleta de cores — alinhada ao protótipo
# ---------------------------------------------------------------------------

PSV_BLUE   = colors.HexColor("#1A3A6B")
PSV_BLUE_L = colors.HexColor("#2563A8")
PSV_HEADER = colors.HexColor("#111C2E")
PSV_GRAY   = colors.HexColor("#F5F8FC")
PSV_LINE   = colors.HexColor("#D8E0EA")
PSV_ROW    = colors.HexColor("#F8FAFC")
TEXT_DARK  = colors.HexColor("#111827")
TEXT_MUTED = colors.HexColor("#64748B")
BACKEND_DIR = Path(__file__).resolve().parents[1]
LOGO_PATH = BACKEND_DIR / "psv logo.jpeg"


register_arial_compatible_fonts()

TASK_LABELS = {
    "contrast": "Sensibilidade de Contraste",
    "motion":   "Movimento Global",
    "gabor":    "Discriminação de Padrões Espaciais",
}

MINIMUM_LABELS = [
    ("uses_correction", "Uso de óculos ou lentes corretivas"),
    ("wearing_correction_now", "Correção visual habitual em uso no momento da aplicação"),
    ("visual_condition", "Condição visual ou oftalmológica autorrelatada"),
    ("visual_reaction_history", "Histórico de crise desencadeada por estímulos visuais"),
    ("current_discomfort", "Desconforto atual antes da aplicação"),
]

SCREENING_DOMAINS = [
    ("Desconforto visual ambiental", ["q1", "q2", "q3", "q4"]),
    ("Sobrecarga visual contextual", ["q5", "q6", "q7", "q8"]),
    ("Contraste, padrões e organização visual", ["q9", "q10", "q11", "q12"]),
    ("Movimento visual", ["q13", "q14", "q15", "q16"]),
    ("Interesse, atração ou fixação por estímulos visuais", ["q17", "q18", "q19", "q20"]),
    ("Impacto funcional da experiência visual", ["q21", "q22", "q23", "q24"]),
]

SCALE_LABELS = {
    "0": "0 - Nunca",
    "1": "1 - Raramente",
    "2": "2 - Às vezes",
    "3": "3 - Frequentemente",
    "4": "4 - Sempre",
}

SCREENING_ITEM_LABELS = {
    "q1": "Luzes fortes",
    "q2": "Reflexos em telas ou superfícies",
    "q3": "Mudanças rápidas de iluminação",
    "q4": "Brilho de telas",
    "q5": "Ambientes com muitas informações visuais",
    "q6": "Muitas cores, objetos, placas, luzes ou pessoas",
    "q7": "Vontade de sair ou fazer pausa",
    "q8": "Fadiga após estímulos visuais",
    "q9": "Pouco contraste",
    "q10": "Padrões repetitivos",
    "q11": "Muitos detalhes no espaço",
    "q12": "Organização visual de páginas, telas ou ambientes",
    "q13": "Movimento no campo de visão",
    "q14": "Ambientes com muita movimentação",
    "q15": "Vídeos, rolagem de tela ou animações",
    "q16": "Acompanhamento da direção do movimento",
    "q17": "Detalhes visuais pequenos",
    "q18": "Luzes, reflexos, sombras ou movimentos repetitivos",
    "q19": "Aproximação de telas, luzes ou padrões",
    "q20": "Fixação por brilhos, movimentos, formas ou padrões",
    "q21": "Permanência em ambientes de estudo, trabalho ou convivência",
    "q22": "Evitação de lugares por estímulos visuais",
    "q23": "Necessidade de pausas ou redução de estímulos",
    "q24": "Interferência na atenção, comunicação ou desempenho",
}

ANSWER_LABELS = {
    "sim": "Sim",
    "nao": "Não",
    "nao_se_aplica": "Não se aplica",
    "nao_sei_informar": "Não informado",
}


# ---------------------------------------------------------------------------
# Estilos
# ---------------------------------------------------------------------------

def _build_styles():
    styles = {
        "title": ParagraphStyle(
            "title",
            fontSize=12,
            fontName="Arial-Bold",
            textColor=TEXT_DARK,
            alignment=TA_CENTER,
            leading=18,
            spaceAfter=8,
        ),
        "issued": ParagraphStyle(
            "issued",
            fontSize=9,
            fontName="Arial",
            textColor=TEXT_MUTED,
            alignment=TA_CENTER,
            leading=14,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            fontSize=12,
            fontName="Arial",
            textColor=TEXT_MUTED,
            alignment=TA_CENTER,
            leading=18,
            spaceAfter=2,
        ),
        "section": ParagraphStyle(
            "section",
            fontSize=12,
            fontName="Arial-Bold",
            textColor=TEXT_DARK,
            alignment=TA_LEFT,
            spaceBefore=9,
            spaceAfter=5,
            leading=18,
        ),
        "body": ParagraphStyle(
            "body",
            fontSize=12,
            fontName="Arial",
            textColor=TEXT_DARK,
            spaceAfter=6,
            leading=18,
        ),
        "cell": ParagraphStyle(
            "cell",
            fontSize=9,
            fontName="Arial",
            textColor=TEXT_DARK,
            leading=12,
        ),
        "cell_header": ParagraphStyle(
            "cell_header",
            fontSize=9,
            fontName="Arial-Bold",
            textColor=colors.white,
            leading=12,
        ),
        "cell_header_center": ParagraphStyle(
            "cell_header_center",
            fontSize=9,
            fontName="Arial-Bold",
            textColor=colors.white,
            alignment=TA_CENTER,
            leading=12,
        ),
        "small": ParagraphStyle(
            "small",
            fontSize=9,
            fontName="Arial",
            textColor=TEXT_MUTED,
        ),
        "detail_cell": ParagraphStyle(
            "detail_cell",
            fontSize=8,
            fontName="Arial",
            textColor=TEXT_DARK,
            leading=10,
        ),
        "detail_header": ParagraphStyle(
            "detail_header",
            fontSize=8,
            fontName="Arial-Bold",
            textColor=colors.white,
            leading=10,
        ),
    }
    return styles


# ---------------------------------------------------------------------------
# Helpers de tabela
# ---------------------------------------------------------------------------

TABLE_STYLE_BASE = TableStyle([
    ("BACKGROUND",  (0, 0), (-1, 0),  PSV_HEADER),
    ("TEXTCOLOR",   (0, 0), (-1, 0),  colors.white),
    ("FONTNAME",    (0, 0), (-1, 0),  "Arial-Bold"),
    ("FONTSIZE",    (0, 0), (-1, 0),  9),
    ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
    ("TOPPADDING",    (0, 0), (-1, 0), 5),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PSV_ROW]),
    ("FONTNAME",    (0, 1), (-1, -1), "Arial"),
    ("FONTSIZE",    (0, 1), (-1, -1), 9),
    ("TOPPADDING",  (0, 1), (-1, -1), 4.5),
    ("BOTTOMPADDING", (0, 1), (-1, -1), 4.5),
    ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("BOX",         (0, 0), (-1, -1), 0.55, colors.HexColor("#CBD5E1")),
    ("LINEBELOW",   (0, 0), (-1, 0), 0.7, colors.HexColor("#1E293B")),
    ("LINEBELOW",   (0, 1), (-1, -1), 0.35, colors.HexColor("#E2E8F0")),
    ("LINEBEFORE",  (1, 0), (-1, -1), 0.25, colors.HexColor("#E7EDF5")),
    ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
])

TABLE_WIDTH = 16 * cm


def _p(value, style):
    return Paragraph(str(value or "—"), style)


def _table(rows, col_widths, styles, header_rows=1, extra_style=None):
    paragraph_rows = []
    for row_index, row in enumerate(rows):
        style = styles["cell_header"] if row_index < header_rows else styles["cell"]
        paragraph_rows.append([
            Paragraph("", style) if cell == "" else _p(cell, style)
            for cell in row
        ])
    table = Table(paragraph_rows, colWidths=col_widths, repeatRows=header_rows)
    table.setStyle(TABLE_STYLE_BASE)
    if header_rows > 1:
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 1), (-1, header_rows - 1), PSV_HEADER),
            ("TEXTCOLOR", (0, 1), (-1, header_rows - 1), colors.white),
            ("FONTNAME", (0, 1), (-1, header_rows - 1), "Arial-Bold"),
            ("FONTSIZE", (0, 1), (-1, header_rows - 1), 8.5),
            ("TOPPADDING", (0, 1), (-1, header_rows - 1), 4),
            ("BOTTOMPADDING", (0, 1), (-1, header_rows - 1), 6),
            ("ALIGN", (0, 1), (-1, header_rows - 1), "CENTER"),
        ]))
    if extra_style:
        table.setStyle(extra_style)
    return table


def _plain_table(rows, col_widths, base_style):
    table = Table(rows, colWidths=col_widths)
    table.setStyle(base_style)
    return table


# ---------------------------------------------------------------------------
# Seções do relatório
# ---------------------------------------------------------------------------

def _parse_maybe_json(value):
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except Exception:
        return value


def _parse_screening(raw_responses):
    if not raw_responses:
        return None

    parsed_entries = [_parse_maybe_json(value) for value in raw_responses.values()]
    minimum = next((entry.get("minimum") for entry in parsed_entries if isinstance(entry, dict) and entry.get("minimum")), {})
    scale = next((entry.get("scale") for entry in parsed_entries if isinstance(entry, dict) and entry.get("scale")), {})
    open_response = next((
        entry.get("open_response")
        for entry in parsed_entries
        if isinstance(entry, dict) and "open_response" in entry
    ), "")

    if not minimum and not scale:
        return None
    return {"minimum": minimum, "scale": scale, "open_response": open_response}


def _classify_mean(value):
    if value is None:
        return "Não informado"
    if value < 1:
        return "Baixa"
    if value < 2:
        return "Leve"
    if value < 3:
        return "Moderada"
    return "Elevada"


def _format_mean(value):
    return "—" if value is None else f"{value:.1f}".replace(".", ",")


def _mean_trial_rt(raw_trials, expected_correct):
    values = []
    for trial in raw_trials or []:
        correct = trial.get("correct") if isinstance(trial, dict) else getattr(trial, "correct", None)
        rt_ms = trial.get("rt_ms") if isinstance(trial, dict) else getattr(trial, "rt_ms", None)
        if correct is expected_correct and rt_ms is not None:
            try:
                values.append(float(rt_ms))
            except (TypeError, ValueError):
                pass
    return sum(values) / len(values) if values else None


def _mean_general_rt(raw_trials):
    values = []
    for trial in raw_trials or []:
        rt_ms = trial.get("rt_ms") if isinstance(trial, dict) else getattr(trial, "rt_ms", None)
        if rt_ms is not None:
            try:
                values.append(float(rt_ms))
            except (TypeError, ValueError):
                pass
    return sum(values) / len(values) if values else None


def _format_ms(value):
    return "—" if value is None else f"{round(value)} ms"


def _format_response(value):
    if value in (None, "", "sem_resposta"):
        return "Sem resposta"
    labels = {
        "arrowleft": "Esquerda",
        "arrowright": "Direita",
        "left": "Esquerda",
        "right": "Direita",
        "esquerda": "Esquerda",
        "direita": "Direita",
    }
    return labels.get(str(value).lower(), str(value))


def _trial_value(trial, key, default=None):
    if isinstance(trial, dict):
        return trial.get(key, default)
    return getattr(trial, key, default)


def _expected_response(task_key, trial):
    stored = _trial_value(trial, "expected_response")
    if stored:
        return stored

    stimulus = str(_trial_value(trial, "stimulus", "") or "").lower()
    if task_key == "contrast":
        return "arrowright" if "nenhum" in stimulus else "arrowleft"
    if "esquerda" in stimulus:
        return "arrowleft"
    if "direita" in stimulus:
        return "arrowright"
    return ""


def _format_trial_result(trial):
    response = _trial_value(trial, "response")
    if response in (None, "", "sem_resposta"):
        return "Sem resposta"
    return "Acerto" if _trial_value(trial, "correct") else "Erro"


def _format_scale_answer(value):
    if value is None:
        return "—"
    return SCALE_LABELS.get(str(value), str(value))


def _contrast_level(stimulus):
    text = str(stimulus or "")
    if text.startswith("contraste_"):
        return text.replace("contraste_", "")
    return "—"


def _report_footer_text():
    now = datetime.now().strftime("%d/%m/%Y às %H:%M")
    return (
        f"Relatório gerado pelo PSV em {now}. Uso técnico complementar, não diagnóstico.<br/>"
        "Interpretação sob responsabilidade do profissional aplicador."
    )


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

    footer_y = 1.45 * cm
    canvas.setStrokeColor(colors.HexColor("#D9DEE7"))
    canvas.setLineWidth(0.55)
    canvas.line(left, footer_y, right, footer_y)

    canvas.setFont("Arial", 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(
        center_x,
        0.9 * cm,
        "PSV v1.0 • Resultados da Avaliação • 2026",
    )
    canvas.restoreState()


def _screening_pdf_section(session, styles) -> list:
    checklist = getattr(session, "checklist", None)
    screening = _parse_screening(getattr(checklist, "raw_responses", None))
    if not screening:
        return []

    condition_rows = [["Indicador", "Resultado"]]
    for key, label in MINIMUM_LABELS:
        condition_rows.append([label, ANSWER_LABELS.get(screening["minimum"].get(key), "Não informado")])

    conditions_table = _table(
        condition_rows,
        [11.2 * cm, 4.8 * cm],
        styles,
        extra_style=TableStyle([
            ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ]),
    )

    domain_rows = [["Domínio", "Média", "Classificação"]]
    for label, keys in SCREENING_DOMAINS:
        values = []
        for key in keys:
            try:
                values.append(float(screening["scale"].get(key)))
            except (TypeError, ValueError):
                pass
        mean = sum(values) / len(values) if values else None
        domain_rows.append([label, _format_mean(mean), _classify_mean(mean)])

    domains_table = _table(
        domain_rows,
        [9.4 * cm, 2.1 * cm, 4.5 * cm],
        styles,
        extra_style=TableStyle([
            ("ALIGN", (1, 0), (2, -1), "CENTER"),
        ]),
    )

    section = [
        Paragraph("Condições para Aplicação", styles["section"]),
        conditions_table,
        Spacer(1, 0.08 * cm),
        Paragraph("Indicadores Descritivos da Experiência Visual Autorrelatada", styles["section"]),
        domains_table,
    ]

    return section

def _participant_info(session, styles) -> list:
    s = styles
    p = session.participant

    date_str = session.created_at.strftime("%d/%m/%Y")
    sex_label = {"M": "Masculino", "F": "Feminino", "O": "Outro"}.get(p.sex, p.sex)

    info_data = [
        ["Participante", "Idade", "Sexo", "Data da Avaliação", "Profissional"],
        [getattr(p, "name", None) or p.initials, f"{p.age} anos", sex_label, date_str, session.professional.name],
    ]
    info_table = _table(
        info_data,
        [3.8 * cm, 1.8 * cm, 2.2 * cm, 3.2 * cm, 5 * cm],
        s,
        extra_style=TableStyle([
            ("ALIGN", (1, 0), (3, -1), "CENTER"),
        ]),
    )

    content = [
        Paragraph("RESULTADOS DA AVALIAÇÃO DO PROTOCOLO SENSORIAL VISUAL — PSV", s["title"]),
    ]
    if getattr(session, "presentation_mode", False):
        content.extend([
            Paragraph(
                "Modo de Apresentação • 5 treinos e 5 tentativas principais por tarefa",
                s["issued"],
            ),
            Spacer(1, 0.05 * cm),
        ])
    content.extend([
        Spacer(1, 0.08 * cm),
        Paragraph("Dados do Participante", s["section"]),
        info_table,
    ])
    return content


def _tasks_table(session, styles) -> list:
    task_map = {t.task_name if isinstance(t.task_name, str) else t.task_name.value: t
                for t in session.task_results}

    rows = [
        [_p("Habilidades", styles["cell_header_center"]), _p("Acertos", styles["cell_header_center"]), _p("Erros", styles["cell_header_center"]), _p("Tempo de Reação", styles["cell_header_center"]), "", ""],
        ["", "", "", _p("Geral", styles["cell_header_center"]), _p("Acerto", styles["cell_header_center"]), _p("Erro", styles["cell_header_center"])],
    ]

    for key, label in TASK_LABELS.items():
        task = task_map.get(key)
        if task:
            hit_pct = f"{task.hits}/{task.total_trials} ({round(task.hits/task.total_trials*100)}%)" if task.total_trials else "—"
            adjusted_errors = (task.errors or 0) + (task.omissions or 0)
            error_pct = f"{adjusted_errors}/{task.total_trials} ({round(adjusted_errors/task.total_trials*100)}%)" if task.total_trials else "—"
            general_rt = task.mean_rt_ms or _mean_general_rt(task.raw_trials)
            hit_rt = _mean_trial_rt(task.raw_trials, True)
            error_rt = _mean_trial_rt(task.raw_trials, False)
            rows.append([
                _p(label, styles["cell"]),
                _p(hit_pct, styles["cell"]),
                _p(error_pct, styles["cell"]),
                _p(_format_ms(general_rt), styles["cell"]),
                _p(_format_ms(hit_rt), styles["cell"]),
                _p(_format_ms(error_rt), styles["cell"]),
            ])
        else:
            rows.append([_p(label, styles["cell"]), _p("—", styles["cell"]), _p("—", styles["cell"]), _p("—", styles["cell"]), _p("—", styles["cell"]), _p("—", styles["cell"])])

    col_widths = [4.1 * cm, 1.9 * cm, 1.9 * cm, 2.7 * cm, 2.7 * cm, 2.7 * cm]
    table = _plain_table(
        rows,
        col_widths,
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 1), PSV_HEADER),
            ("TEXTCOLOR", (0, 0), (-1, 1), colors.white),
            ("FONTNAME", (0, 0), (-1, 1), "Arial-Bold"),
            ("FONTSIZE", (0, 0), (-1, 1), 8.6),
            ("ROWBACKGROUNDS", (0, 2), (-1, -1), [colors.white, PSV_ROW]),
            ("SPAN", (0, 0), (0, 1)),
            ("SPAN", (1, 0), (1, 1)),
            ("SPAN", (2, 0), (2, 1)),
            ("SPAN", (3, 0), (5, 0)),
            ("ALIGN", (0, 0), (-1, 1), "CENTER"),
            ("ALIGN", (3, 0), (3, 0), "CENTER"),
            ("ALIGN", (1, 2), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, 1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, 1), 5),
            ("TOPPADDING", (0, 2), (-1, -1), 4.5),
            ("BOTTOMPADDING", (0, 2), (-1, -1), 4.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("BOX", (0, 0), (-1, -1), 0.55, colors.HexColor("#CBD5E1")),
            ("LINEBELOW", (0, 0), (-1, 0), 0.7, colors.HexColor("#1E293B")),
            ("LINEBELOW", (0, 1), (-1, 1), 0.35, colors.HexColor("#334155")),
            ("LINEBELOW", (0, 2), (-1, -1), 0.35, colors.HexColor("#E2E8F0")),
            ("LINEBEFORE", (1, 0), (-1, -1), 0.25, colors.HexColor("#E7EDF5")),
        ]),
    )

    return [
        Paragraph("Desempenho nas Tarefas Computadorizadas", styles["section"]),
        table,
    ]


def _detailed_screening_section(session, styles) -> list:
    checklist = getattr(session, "checklist", None)
    screening = _parse_screening(getattr(checklist, "raw_responses", None))
    if not screening:
        return []

    story = [
        PageBreak(),
        Paragraph("DETALHAMENTO DA TRIAGEM VISUAL", styles["title"]),
    ]

    for domain_label, keys in SCREENING_DOMAINS:
        if domain_label.startswith("Interesse, atração"):
            story.append(PageBreak())
        values = []
        rows = [["Item", "Resposta"]]
        for key in keys:
            value = screening["scale"].get(key)
            try:
                values.append(float(value))
            except (TypeError, ValueError):
                pass
            rows.append([SCREENING_ITEM_LABELS.get(key, key), _format_scale_answer(value)])

        mean = sum(values) / len(values) if values else None
        story.append(Paragraph(
            f"{domain_label} - Média {_format_mean(mean)} - {_classify_mean(mean)}",
            styles["section"],
        ))
        story.append(_table(
            rows,
            [11.2 * cm, 4.8 * cm],
            styles,
            extra_style=TableStyle([
                ("ALIGN", (1, 0), (1, -1), "CENTER"),
            ]),
        ))
        story.append(Spacer(1, 0.08 * cm))

    if screening.get("open_response"):
        story.append(Paragraph("Observações autorrelatadas", styles["section"]))
        story.append(Paragraph(screening["open_response"], styles["body"]))

    return story


def _detailed_task_table(task, task_key, styles):
    raw_trials = task.raw_trials or []
    main_trials = [trial for trial in raw_trials if _trial_value(trial, "fase", "principal") == "principal"]
    trials = main_trials or raw_trials

    is_contrast = task_key == "contrast"
    rows = [[
        "Trial",
        "Estímulo",
        *(['Cor do estímulo'] if is_contrast else []),
        "Esperada",
        "Resposta",
        "Resultado",
        "Tempo",
    ]]
    for index, trial in enumerate(trials, start=1):
        stimulus = _trial_value(trial, "stimulus", "—") or "—"
        expected = _expected_response(task_key, trial)
        response = _trial_value(trial, "response")
        rows.append([
            str(index),
            stimulus,
            *([_contrast_level(stimulus)] if is_contrast else []),
            _format_response(expected),
            _format_response(response),
            _format_trial_result(trial),
            _format_ms(_trial_value(trial, "rt_ms")),
        ])

    paragraph_rows = []
    for row_index, row in enumerate(rows):
        style = styles["detail_header"] if row_index == 0 else styles["detail_cell"]
        paragraph_rows.append([_p(cell, style) for cell in row])

    table = Table(
        paragraph_rows,
        colWidths=(
            [1.0 * cm, 3.45 * cm, 2.1 * cm, 2.2 * cm, 2.2 * cm, 2.2 * cm, 2.85 * cm]
            if is_contrast
            else [1.15 * cm, 4.25 * cm, 2.45 * cm, 2.45 * cm, 2.45 * cm, 3.25 * cm]
        ),
        repeatRows=1,
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PSV_HEADER),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PSV_ROW]),
        ("TOPPADDING", (0, 0), (-1, -1), 3.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("BOX", (0, 0), (-1, -1), 0.45, colors.HexColor("#CBD5E1")),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#E2E8F0")),
        ("LINEBEFORE", (1, 0), (-1, -1), 0.25, colors.HexColor("#E7EDF5")),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (2, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return table


def _detailed_tasks_section(session, styles) -> list:
    task_map = {
        t.task_name if isinstance(t.task_name, str) else t.task_name.value: t
        for t in session.task_results
    }
    story = [
        PageBreak(),
        Paragraph("DETALHAMENTO DAS TAREFAS COMPUTADORIZADAS", styles["title"]),
    ]

    for task_key, task_label in TASK_LABELS.items():
        task = task_map.get(task_key)
        if not task:
            continue
        story.append(Paragraph(task_label, styles["section"]))
        story.append(_detailed_task_table(task, task_key, styles))
        story.append(Spacer(1, 0.18 * cm))

    return story

def _footer(styles) -> list:
    return [
        Spacer(1, 0.24 * cm),
        HRFlowable(width=TABLE_WIDTH, thickness=0.55, color=colors.HexColor("#CBD5E1")),
        Spacer(1, 0.16 * cm),
        Paragraph(
            _report_footer_text(),
            styles["issued"],
        ),
    ]


# ---------------------------------------------------------------------------
# Entrada pública
# ---------------------------------------------------------------------------

def _build_report_story(session, styles, detailed=False):
    story = []

    story.extend(_participant_info(session, styles))
    story.extend(_screening_pdf_section(session, styles))
    story.extend(_tasks_table(session, styles))
    if detailed:
        story.extend(_detailed_screening_section(session, styles))
        story.extend(_detailed_tasks_section(session, styles))
    story.extend(_footer(styles))
    return story


def _build_pdf(session, detailed=False) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=3 * cm,
        rightMargin=2*cm,
        topMargin=3 * cm,
        bottomMargin=2 * cm,
    )

    styles = _build_styles()
    story = _build_report_story(session, styles, detailed=detailed)

    doc.build(story, onFirstPage=_draw_page_frame, onLaterPages=_draw_page_frame)
    return buffer.getvalue()


def generate_pdf(session) -> bytes:
    """
    Gera o PDF geral da avaliação e retorna como bytes.
    """
    return _build_pdf(session, detailed=False)


def generate_detailed_pdf(session) -> bytes:
    """
    Gera o PDF detalhado da avaliação, incluindo respostas da triagem e trials.
    """
    return _build_pdf(session, detailed=True)
