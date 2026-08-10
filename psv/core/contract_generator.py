"""
PSV — Gerador do Termo de Uso Profissional
=========================================
Gera o PDF institucional do Termo de Uso Profissional do PSV.
"""

from datetime import datetime, timedelta, timezone
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
from reportlab.platypus import (
    Indenter,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


PSV_BLUE = colors.HexColor("#1A3A6B")
PSV_HEADER = colors.HexColor("#111C2E")
PSV_ROW = colors.HexColor("#F8FAFC")
TEXT_DARK = colors.HexColor("#111827")
TEXT_MUTED = colors.HexColor("#64748B")

ROOT = Path(__file__).resolve().parents[2]
LOGO_PATH = ROOT / "psv-frontend" / "src" / "assets" / "logo.png.png"
FONT_DIR = Path("C:/Windows/Fonts")


def _register_fonts():
    try:
        pdfmetrics.registerFont(TTFont("Arial", str(FONT_DIR / "arial.ttf")))
        pdfmetrics.registerFont(TTFont("Arial-Bold", str(FONT_DIR / "arialbd.ttf")))
        pdfmetrics.registerFont(TTFont("Arial-Italic", str(FONT_DIR / "ariali.ttf")))
        pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial-Italic")
    except Exception:
        # Helvetica keeps the PDF generation available if Arial is missing.
        pdfmetrics.registerFontFamily("Arial", normal="Helvetica", bold="Helvetica-Bold", italic="Helvetica-Oblique")


_register_fonts()


IDENTIFICATION_FIELDS = [
    ("Nome completo", "[nome completo do profissional]"),
    ("CPF", "[CPF]"),
    ("Profissão", "[profissão]"),
    ("Área de atuação", "[área de atuação]"),
    ("Conselho profissional", "[sigla do conselho, quando aplicável]"),
    ("Número de registro", "[número de registro, quando aplicável]"),
    ("E-mail cadastrado", "[e-mail]"),
    ("Data e hora do aceite", "[data] às [hora]"),
    ("Versão do Termo de Uso Profissional", "PSV v.1.0"),
    ("Código de verificação", "[código automático gerado pelo sistema]"),
]


PROFESSIONAL_DECLARATIONS = [
    "Possui formação, habilitação ou competência técnica compatível com o uso do PSV em sua área de atuação;",
    "Utilizará o PSV de forma ética, responsável e compatível com sua finalidade técnica, científica, clínica, educacional ou institucional.",
    "Reconhece que o PSV não possui finalidade diagnóstica isolada e não deve ser utilizado como fonte única para emissão de diagnóstico, laudo, parecer conclusivo, seleção, exclusão, restrição de direitos ou tomada de decisão isolada;",
    "É responsável pelas informações inseridas no sistema, pela condução adequada da aplicação, pela interpretação técnica dos resultados gerados e pelo uso dos documentos emitidos pela plataforma;",
    "Compromete-se a seguir as Recomendações Mínimas para Aplicação e os parâmetros técnicos, operacionais e ético-legais do PSV, incluindo condições adequadas de ambiente, equipamento, sistema operacional, navegador, tela, conexão com a internet, dispositivo de resposta, posicionamento do participante, instrução prévia e interrupção da tarefa em caso de desconforto, fadiga, mal-estar ou solicitação do participante;",
    "Compromete-se a obter autorização, assentimento, consentimento informado ou consentimento livre e esclarecido do participante ou de seu responsável legal, quando aplicável;",
    "Compromete-se a preservar a privacidade, a confidencialidade e a segurança dos dados inseridos no sistema, observando a legislação brasileira de proteção de dados pessoais;",
    "Declara ciência e concordância com o registro eletrônico de seu aceite, incluindo nome completo, CPF, profissão, área de atuação, conselho profissional, número de registro, e-mail, data e horário do aceite, versão dos documentos aceitos, endereço IP, identificadores técnicos do acesso e código de verificação, quando disponíveis;",
    "Reconhece que o uso inadequado do PSV, a aplicação fora das condições recomendadas, a inserção incorreta de dados ou a interpretação indevida dos resultados são de responsabilidade do profissional aplicador.",
    "Declara ciência de que os dados e relatórios gerados pela plataforma poderão permanecer armazenados em ambiente digital seguro por até 60 dias contados da data de geração do relatório, com a finalidade de permitir acesso pelo profissional, download do relatório, manutenção do histórico de aplicações, rastreabilidade técnica, suporte operacional e funcionamento adequado da plataforma;",
    "Declara ciência e concordância de que dados gerados pelo uso do PSV poderão ser utilizados, de forma anonimizada ou agregada, para fins de aprimoramento técnico da plataforma, análise de usabilidade, desenvolvimento do produto, segurança do sistema, produção de estatísticas internas e estudos futuros, sem identificação direta dos participantes ou profissionais;",
    "Reconhece que a visualização dos resultados e a emissão dos relatórios em PDF devem ocorrer mediante revisão e confirmação profissional, cabendo ao aplicador analisar os dados apresentados, as condições de aplicação, eventuais intercorrências e os limites metodológicos do PSV. Após visualização, download, impressão, envio, arquivamento ou anexação a registros profissionais, a guarda, a confidencialidade, a proteção e a utilização adequada do relatório passam a ser de responsabilidade do profissional aplicador.",
]


def _dash(value):
    value = "" if value is None else str(value).strip()
    return value or "—"


def _format_datetime(value):
    if not value:
        return "[data] às [hora]"
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        value = value.astimezone(timezone(timedelta(hours=-3)))
        return f"{value.strftime('%d/%m/%Y')} às {value.strftime('%H:%M')}"
    return str(value)


def _verification_code(professional):
    source = getattr(professional, "id", None) or getattr(professional, "email", None) or ""
    source = "".join(ch for ch in str(source) if ch.isalnum()).upper()
    return f"PSV-{source[:8]}" if source else "[código automático]"


def _contract_identification_fields(professional=None):
    if professional is None:
        return IDENTIFICATION_FIELDS
    return [
        ("Nome completo", _dash(getattr(professional, "name", None))),
        ("CPF", _dash(getattr(professional, "cpf", None))),
        ("Profissão", _dash(getattr(professional, "profession", None))),
        ("Área de atuação", _dash(getattr(professional, "area", None))),
        ("Conselho profissional", _dash(getattr(professional, "council", None))),
        ("Número de registro", _dash(getattr(professional, "council_register", None))),
        ("E-mail cadastrado", _dash(getattr(professional, "email", None))),
        ("Data e hora do aceite", _format_datetime(getattr(professional, "created_at", None))),
        ("Versão do Termo de Uso Profissional", "PSV v.1.0"),
        ("Código de verificação", _verification_code(professional)),
    ]


CONTRACT_SECTIONS = [
    (
        "2. Objeto",
        [
            "O presente Termo de Uso Profissional regula o uso do Protocolo Sensorial Visual (PSV) pelo profissional cadastrado na plataforma.",
            "O PSV disponibiliza recursos digitais para registro de dados do participante, triagem visual, aplicação de tarefas computadorizadas, organização de indicadores descritivos e geração de relatórios em PDF e documentos profissionais complementares vinculados ao uso da plataforma.",
            "O uso do PSV deve ocorrer exclusivamente em contexto profissional, técnico, clínico, institucional, educacional ou de pesquisa, conforme a formação, habilitação, competência e responsabilidade do profissional aplicador.",
        ],
    ),
    (
        "3. Natureza e finalidade do PSV",
        [
            "O PSV é uma ferramenta digital de apoio técnico destinada à caracterização descritiva de aspectos relacionados à experiência visual, ao desempenho em tarefas computadorizadas e à organização de indicadores complementares.",
            "O PSV não possui finalidade diagnóstica isolada e não substitui avaliação clínica, psicológica, neuropsicológica, médica, oftalmológica, educacional ou qualquer outro procedimento profissional completo.",
            "Os resultados apresentados pelo PSV devem ser lidos, analisados e interpretados pelo profissional de forma contextualizada, considerando as condições de aplicação, as informações fornecidas pelo participante, o histórico profissionalmente levantado e outros dados clínicos, funcionais ou institucionais disponíveis.",
        ],
    ),
    (
        "4. Condições para uso da plataforma",
        [
            "Ao utilizar o PSV, o profissional declara que:",
        ],
        [
            "possui formação, habilitação ou competência técnica compatível com o uso pretendido da plataforma;",
            "utilizará o PSV apenas dentro dos limites éticos, técnicos e legais de sua profissão;",
            "observará as normas de seu conselho profissional, quando aplicável;",
            "seguirá as orientações de uso, recomendações mínimas de aplicação e instruções técnicas disponibilizadas na plataforma e no manual do PSV;",
            "não utilizará o PSV como instrumento único para diagnóstico, emissão de laudo, parecer conclusivo, seleção, exclusão, restrição de direitos ou tomada de decisão isolada;",
            "informará ao participante, ou ao responsável legal quando aplicável, a finalidade da aplicação e os limites dos resultados gerados.",
        ],
    ),
    (
        "5. Responsabilidade técnica do profissional",
        [
            "O profissional é integralmente responsável:",
        ],
        [
            "pela veracidade das informações inseridas no sistema;",
            "pela obtenção de autorização, assentimento ou consentimento do participante ou responsável legal, quando aplicável;",
            "pela preparação adequada do ambiente de aplicação;",
            "pela condução ética e técnica do procedimento;",
            "pela interrupção da aplicação em caso de desconforto, fadiga, mal-estar, crise, solicitação de pausa ou desistência do participante;",
            "pela leitura, análise e interpretação profissional dos resultados apresentados pela plataforma;",
            "pela elaboração de documentos profissionais derivados da aplicação, quando houver;",
            "pela guarda, compartilhamento, arquivamento e descarte dos relatórios em PDF gerados pela plataforma;",
            "pelo cumprimento das normas éticas, legais e profissionais aplicáveis à sua área de atuação.",
        ],
        [
            "O uso inadequado do PSV, a aplicação fora das condições recomendadas, a interpretação indevida dos resultados ou o uso dos relatórios em PDF para finalidade incompatível com sua natureza complementar são de responsabilidade do profissional aplicador.",
        ],
    ),
    (
        "6. Limitações do PSV",
        [
            "O profissional reconhece que o PSV:",
        ],
        [
            "não realiza diagnóstico de Transtorno do Espectro Autista, transtornos sensoriais, alterações oftalmológicas, quadros neurológicos ou qualquer outro quadro clínico;",
            "não substitui entrevista clínica, avaliação psicológica, avaliação neuropsicológica, avaliação médica, exame oftalmológico, avaliação funcional ou avaliação educacional;",
            "não deve ser utilizado isoladamente para definir aptidão, incapacidade, elegibilidade, prognóstico, intervenção, afastamento, seleção ou exclusão de qualquer pessoa;",
            "não garante resultados clínicos, terapêuticos, educacionais, ocupacionais ou institucionais;",
            "não elimina a necessidade de julgamento técnico do profissional habilitado.",
        ],
        [
            "Quando utilizado por psicólogos, o PSV não deve ser apresentado como teste psicológico aprovado, instrumento diagnóstico ou fonte única de avaliação psicológica, salvo se houver aprovação específica futura por órgão competente. Seu uso deve permanecer compatível com as normas éticas e técnicas aplicáveis à avaliação psicológica e à elaboração de documentos profissionais.",
        ],
    ),
    (
        "7. Recomendações mínimas para aplicação",
        [
            "O profissional compromete-se a observar condições mínimas de aplicação, incluindo:",
        ],
        [
            "ambiente com iluminação estável e baixa interferência externa;",
            "redução de ruídos e distratores;",
            "posicionamento adequado do participante em relação à tela;",
            "uso de equipamento compatível com as orientações técnicas do PSV;",
            "verificação do uso de correção visual habitual, quando aplicável;",
            "explicação clara das instruções antes do início das tarefas;",
            "realização de treino ou etapa preparatória quando previsto;",
            "monitoramento de sinais de desconforto, fadiga ou desregulação durante a aplicação.",
        ],
        [
            "A não observância dessas condições poderá comprometer a qualidade dos dados e a leitura técnica dos resultados apresentados pela plataforma.",
        ],
    ),
    (
        "8. Dados pessoais, privacidade e confidencialidade",
        [
            "O profissional compromete-se a tratar os dados pessoais e dados sensíveis inseridos no PSV com confidencialidade, segurança e finalidade específica, observando a legislação brasileira de proteção de dados pessoais.",
            "O profissional declara estar ciente de que informações relacionadas à saúde, desenvolvimento, comportamento, respostas em triagens, dados de desempenho e relatórios em PDF gerados pela plataforma podem constituir dados pessoais sensíveis e devem ser tratados com cautela, acesso restrito e justificativa profissional adequada.",
            "O compartilhamento de relatórios em PDF ou dados gerados pelo PSV deverá ocorrer apenas quando houver base legal, autorização adequada, finalidade legítima e respeito às normas éticas e legais aplicáveis.",
            "O profissional é responsável por orientar o participante, ou seu responsável legal, quanto à finalidade da coleta, ao uso dos dados e aos limites dos resultados gerados.",
        ],
    ),
    (
        "9. Registro eletrônico, logs e comprovação do aceite",
        [
            "O PSV poderá registrar eletronicamente informações relacionadas ao aceite deste Termo de Uso Profissional e ao uso da plataforma, incluindo nome, CPF, e-mail, profissão, conselho profissional, número de registro, data e hora do aceite, versão do Termo de Uso Profissional, endereço IP, identificadores técnicos do acesso e código de verificação.",
            "Esses registros têm a finalidade de documentar a concordância do profissional, preservar a rastreabilidade do uso da plataforma, prevenir uso indevido e permitir auditoria técnica quando necessário.",
            "A continuidade de uso da plataforma após atualizações relevantes poderá exigir novo aceite eletrônico do profissional.",
        ],
    ),
    (
        "10. Propriedade intelectual e uso permitido",
        [
            "O PSV, sua estrutura, identidade visual, textos, telas, tarefas computadorizadas, fluxos, relatórios em PDF, manuais, critérios de organização dos dados e demais materiais associados são protegidos por direitos autorais e demais normas aplicáveis.",
            "O profissional recebe autorização limitada, pessoal, intransferível e revogável para utilizar o PSV conforme as finalidades previstas neste Termo de Uso Profissional.",
            "É vedado ao profissional:",
        ],
        [
            "copiar, reproduzir, vender, licenciar, sublicenciar ou redistribuir a plataforma ou seus componentes sem autorização;",
            "modificar, adaptar, extrair, replicar ou comercializar tarefas, telas, relatórios em PDF, manuais ou fluxos do PSV sem autorização;",
            "realizar engenharia reversa, tentativa de acesso indevido, extração automatizada de dados ou uso da plataforma para finalidade não autorizada;",
            "utilizar o nome PSV, Protocolo Sensorial Visual ou materiais associados de modo que sugira vínculo, certificação, chancela ou responsabilidade técnica não autorizada.",
        ],
    ),
    (
        "11. Uso indevido, suspensão e cancelamento de acesso",
        [
            "O acesso do profissional ao PSV poderá ser suspenso ou cancelado em caso de uso indevido, descumprimento deste Termo de Uso Profissional, violação de normas éticas ou legais, tentativa de acesso não autorizado, compartilhamento irregular de credenciais ou utilização da plataforma para finalidade incompatível com sua proposta.",
            "O profissional é responsável por manter a confidencialidade de seu login e senha, bem como por todas as atividades realizadas em sua conta.",
        ],
    ),
    (
        "12. Relatórios e documentos gerados",
        [
            "Os relatórios em PDF gerados pelo PSV possuem caráter complementar e devem ser compreendidos como documentos de apresentação organizada dos resultados registrados pela plataforma, destinados a apoiar a análise profissional contextualizada.",
            "A emissão automática de relatório em PDF não constitui laudo, parecer conclusivo, diagnóstico, prescrição, recomendação terapêutica ou avaliação completa.",
            "A leitura, análise, interpretação, comunicação e eventual utilização profissional dos resultados são de responsabilidade do profissional aplicador.",
        ],
    ),
    (
        "13. Atualizações da plataforma e do Termo de Uso Profissional",
        [
            "O PSV poderá passar por atualizações técnicas, metodológicas, visuais ou operacionais, incluindo ajustes em telas, fluxos, relatórios em PDF, critérios de organização dos dados e funcionalidades.",
            "Alterações relevantes neste Termo de Uso Profissional poderão gerar nova versão e exigir novo aceite eletrônico do profissional.",
            "A versão aplicável será aquela vigente na data e horário do aceite registrado pelo sistema.",
        ],
    ),
    (
        "14. Disponibilização do Termo de Uso Profissional",
        [
            "Este Termo de Uso Profissional ficará disponível para consulta e download no ambiente do profissional cadastrado.",
            "O profissional poderá acessar a versão aceita do Termo de Uso Profissional na área correspondente da plataforma, juntamente com os dados de aceite eletrônico, quando disponível.",
        ],
    ),
]


FINAL_ACCEPTANCE = [
    "Ao prosseguir com o cadastro, acessar ou utilizar o PSV, o profissional declara que leu, compreendeu e aceitou integralmente este Termo de Uso Profissional.",
    "Declara, ainda, estar ciente de que o PSV é uma ferramenta digital de apoio técnico complementar, sem finalidade diagnóstica isolada, e que a aplicação, leitura, análise, interpretação e uso profissional dos resultados são de responsabilidade do profissional aplicador.",
]


ACCEPTANCE_FIELDS = [
    ("Aceite eletrônico registrado em", "[data] às [hora]"),
    ("Profissional", "[nome completo]"),
    ("CPF", "[CPF]"),
    ("Registro profissional", "[conselho e número, quando aplicável]"),
    ("Código de verificação", "[código automático]"),
]


def _contract_acceptance_fields(professional=None):
    if professional is None:
        return ACCEPTANCE_FIELDS

    council = _dash(getattr(professional, "council", None))
    register = _dash(getattr(professional, "council_register", None))
    professional_register = "—"
    if council != "—" and register != "—":
        professional_register = f"{council} {register}"
    elif council != "—":
        professional_register = council
    elif register != "—":
        professional_register = register

    return [
        ("Aceite eletrônico registrado em", _format_datetime(getattr(professional, "created_at", None))),
        ("Profissional", _dash(getattr(professional, "name", None))),
        ("CPF", _dash(getattr(professional, "cpf", None))),
        ("Registro profissional", professional_register),
        ("Código de verificação", _verification_code(professional)),
    ]


def _styles():
    return {
        "title": ParagraphStyle(
            "contract_title",
            fontName="Arial-Bold",
            fontSize=12,
            leading=18,
            textColor=TEXT_DARK,
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "subtitle": ParagraphStyle(
            "contract_subtitle",
            fontName="Arial",
            fontSize=12,
            leading=18,
            textColor=TEXT_DARK,
            alignment=TA_CENTER,
            spaceAfter=14,
        ),
        "intro": ParagraphStyle(
            "contract_intro",
            fontName="Arial",
            fontSize=12,
            leading=18,
            textColor=TEXT_DARK,
            alignment=TA_JUSTIFY,
            firstLineIndent=1.25 * cm,
            spaceAfter=6,
        ),
        "clause": ParagraphStyle(
            "contract_clause",
            fontName="Arial-Bold",
            fontSize=12,
            leading=18,
            textColor=TEXT_DARK,
            alignment=TA_LEFT,
            spaceBefore=14,
            spaceAfter=8,
        ),
        "body": ParagraphStyle(
            "contract_body",
            fontName="Arial",
            fontSize=12,
            leading=18,
            textColor=TEXT_DARK,
            alignment=TA_JUSTIFY,
            firstLineIndent=1.25 * cm,
            spaceAfter=6,
        ),
        "field": ParagraphStyle(
            "contract_field",
            fontName="Arial",
            fontSize=12,
            leading=18,
            textColor=TEXT_DARK,
            alignment=TA_LEFT,
            leftIndent=1.25 * cm,
            spaceAfter=1,
        ),
        "letter": ParagraphStyle(
            "contract_letter",
            fontName="Arial",
            fontSize=12,
            leading=18,
            textColor=TEXT_DARK,
            alignment=TA_JUSTIFY,
            leftIndent=2 * cm,
            firstLineIndent=0,
            spaceAfter=2,
        ),
        "numbered": ParagraphStyle(
            "contract_numbered",
            fontName="Arial",
            fontSize=12,
            leading=18,
            textColor=TEXT_DARK,
            alignment=TA_JUSTIFY,
            leftIndent=1.25 * cm,
            firstLineIndent=-0.65 * cm,
            spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "contract_small",
            fontName="Arial",
            fontSize=9,
            leading=12,
            textColor=TEXT_MUTED,
            alignment=TA_CENTER,
        ),
        "cell": ParagraphStyle(
            "contract_cell",
            fontName="Arial",
            fontSize=12,
            leading=18,
            textColor=TEXT_DARK,
        ),
        "cell_bold": ParagraphStyle(
            "contract_cell_bold",
            fontName="Arial-Bold",
            fontSize=12,
            leading=18,
            textColor=TEXT_DARK,
        ),
        "cell_header": ParagraphStyle(
            "contract_cell_header",
            fontName="Arial-Bold",
            fontSize=12,
            leading=18,
            textColor=colors.white,
        ),
    }


def _p(text, style):
    return Paragraph(str(text or "—"), style)


def _table_style():
    return TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), PSV_HEADER),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PSV_ROW]),
            ("TOPPADDING", (0, 0), (-1, -1), 5.8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5.8),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("BOX", (0, 0), (-1, -1), 0.55, colors.HexColor("#CBD5E1")),
            ("LINEBELOW", (0, 0), (-1, 0), 0.7, colors.HexColor("#1E293B")),
            ("LINEBELOW", (0, 1), (-1, -1), 0.35, colors.HexColor("#E2E8F0")),
            ("LINEBEFORE", (1, 0), (-1, -1), 0.25, colors.HexColor("#E7EDF5")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]
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
    canvas.line(left, footer_y, right, footer_y)
    canvas.setFont("Arial", 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(center_x, 0.9 * cm, "PSV v1.0 • Termo de Uso Profissional • 2026")
    canvas.restoreState()


def _field_table(fields, styles, header=("Campo", "Informação")):
    lines = [
        Paragraph(f"<b>{label}:</b> {value}", styles["field"])
        for label, value in fields
    ]
    return KeepTogether(lines)


def _letter_table(items, styles):
    return [
        Paragraph(f"{chr(ord('a') + index)}) {item}", styles["letter"])
        for index, item in enumerate(items)
    ]


def _add_section(story, title, styles, paragraphs=None, letters=None, final_paragraphs=None):
    story.append(Paragraph(title, styles["clause"]))
    for paragraph in paragraphs or []:
        story.append(Paragraph(paragraph, styles["body"]))
    if letters:
        story.append(Spacer(1, 0.08 * cm))
        story.extend(_letter_table(letters, styles))
        story.append(Spacer(1, 0.12 * cm))
    for paragraph in final_paragraphs or []:
        story.append(Paragraph(paragraph, styles["body"]))


def generate_contract_pdf(professional=None) -> bytes:
    styles = _styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=3 * cm,
        rightMargin=2 * cm,
        topMargin=3 * cm,
        bottomMargin=2 * cm,
    )

    story = [
        Paragraph("TERMO DE USO PROFISSIONAL DO PROTOCOLO SENSORIAL VISUAL — PSV", styles["title"]),
        Paragraph("Termo de ciência, responsabilidade técnica e uso da plataforma", styles["subtitle"]),
        Spacer(1, 0.28 * cm),
        Paragraph(
            "Este Termo de Uso Profissional estabelece as condições de acesso e utilização do Protocolo Sensorial Visual (PSV), ferramenta digital estruturada para apoiar a preparação, aplicação, registro, organização e emissão de relatórios em PDF para apresentação dos resultados registrados pela plataforma, relacionados à caracterização complementar do processamento sensorial visual.",
            styles["intro"],
        ),
        Paragraph(
            "Ao criar uma conta, acessar ou utilizar o PSV, o profissional declara ter lido, compreendido e aceitado integralmente as condições estabelecidas neste Termo de Uso Profissional.",
            styles["intro"],
        ),
        Paragraph("1. Identificação do profissional", styles["clause"]),
        Spacer(1, 0.08 * cm),
        _field_table(_contract_identification_fields(professional), styles),
        Spacer(1, 0.36 * cm),
    ]

    for section in CONTRACT_SECTIONS:
        title = section[0]
        paragraphs = section[1] if len(section) > 1 else []
        letters = section[2] if len(section) > 2 else None
        final_paragraphs = section[3] if len(section) > 3 else None
        if title.startswith("11. Uso indevido"):
            story.append(PageBreak())
        _add_section(story, title, styles, paragraphs, letters, final_paragraphs)

    story.append(Paragraph("15. Declarações registradas no cadastro", styles["clause"]))
    story.append(Paragraph("Ao prosseguir, o profissional declara que:", styles["body"]))
    for index, declaration in enumerate(PROFESSIONAL_DECLARATIONS, start=1):
        story.append(KeepTogether([
            Paragraph(f"{index}. {declaration}", styles["numbered"]),
        ]))

    story.append(Paragraph("16. Declaração final de aceite", styles["clause"]))
    for paragraph in FINAL_ACCEPTANCE:
        story.append(Paragraph(paragraph, styles["body"]))
    story.append(Spacer(1, 0.08 * cm))
    story.append(_field_table(_contract_acceptance_fields(professional), styles, header=("Registro", "Informação")))
    doc.build(story, onFirstPage=_draw_page_frame, onLaterPages=_draw_page_frame)
    return buffer.getvalue()


if __name__ == "__main__":
    output = ROOT / "psv-frontend" / "public" / "documents" / "contrato.pdf"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(generate_contract_pdf())
