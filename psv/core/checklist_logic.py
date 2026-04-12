"""
PSV — Lógica do Check-list de Sensibilidade Visual
====================================================
Referência: Tabela 1 + Sistema de Correção (pp. 65-66)

Domínios:
  HEV — Hipersensibilidade Visual  → itens 1,4,7,8,10,14,17,19  (8 itens, max 32)
  HOV — Hipossensibilidade Visual  → itens 2,5,9,12,15,20        (6 itens, max 24)
  BSV — Busca Sensorial Visual     → itens 3,6,11,13,16,18       (6 itens, max 24)

Escala por item: 0 (Nunca) a 4 (Sempre)
Score normalizado: (soma_domínio / max_domínio) * 100  → 0–100
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List


# ---------------------------------------------------------------------------
# Constantes — mapeamento direto do instrumento
# ---------------------------------------------------------------------------

ITEMS: Dict[int, str] = {
    1:  "Incomoda-se com luz solar intensa ou ambientes muito iluminados",
    2:  "Parece não notar objetos em movimento em seu campo visual",
    3:  "Busca ativamente padrões visuais repetitivos (linhas, grades, texturas)",
    4:  "Evita ambientes com luzes fluorescentes ou piscantes",
    5:  "Demonstra dificuldade em localizar objetos em ambientes visualmente complexos",
    6:  "Apresenta fascínio por objetos luminosos ou estímulos giratórios",
    7:  "Queixa-se de desconforto visual ao utilizar telas por períodos prolongados",
    8:  "Fecha os olhos ou desvia o olhar diante de estímulos visuais intensos",
    9:  "Não reage a estímulos visuais que normalmente chamariam atenção (gestos, expressões)",
    10: "Prefere ambientes com iluminação reduzida",
    11: "Demonstra interesse incomum por detalhes visuais específicos",
    12: "Apresenta dificuldade em perceber detalhes visuais sutis",
    13: "Aproxima objetos dos olhos para observá-los de forma incomum",
    14: "Apresenta desconforto em ambientes com muitos estímulos visuais simultâneos",
    15: "Parece não perceber quando alguém se aproxima pelo campo visual periférico",
    16: "Move dedos ou objetos diante dos olhos de forma repetitiva",
    17: "Demonstra reações intensas a cores vibrantes ou padrões complexos",
    18: "Busca estímulos visuais brilhantes ou reflexivos",
    19: "Apresenta dificuldade em ambientes visualmente movimentados (ex.: shopping)",
    20: "Parece ignorar mudanças visuais no ambiente ao seu redor",
}

SCALE_LABELS: Dict[int, str] = {
    0: "Nunca",
    1: "Raramente",
    2: "Às vezes",
    3: "Frequentemente",
    4: "Sempre",
}

# Agrupamento dos itens por domínio — fonte: p. 66
DOMAIN_ITEMS: Dict[str, List[int]] = {
    "HEV": [1, 4, 7, 8, 10, 14, 17, 19],
    "HOV": [2, 5, 9, 12, 15, 20],
    "BSV": [3, 6, 11, 13, 16, 18],
}

DOMAIN_LABELS: Dict[str, str] = {
    "HEV": "Hipersensibilidade Visual",
    "HOV": "Hipossensibilidade Visual",
    "BSV": "Busca Sensorial Visual",
}

MAX_ITEM_SCORE = 4
TOTAL_ITEMS = 20


# ---------------------------------------------------------------------------
# Classificação de intensidade
# ---------------------------------------------------------------------------

class ScoreLevel(str, Enum):
    LOW    = "Baixo"
    MEDIUM = "Médio"
    HIGH   = "Alto"


def classify_score(normalized_score: float) -> ScoreLevel:
    """
    Classifica o score normalizado (0–100) em três faixas.
    Critério: tercis simétricos.
      0–33  → Baixo
      34–66 → Médio
      67–100→ Alto
    """
    if normalized_score <= 33:
        return ScoreLevel.LOW
    elif normalized_score <= 66:
        return ScoreLevel.MEDIUM
    else:
        return ScoreLevel.HIGH


# ---------------------------------------------------------------------------
# Dataclasses de resultado
# ---------------------------------------------------------------------------

@dataclass
class DomainResult:
    domain: str               # "HEV" | "HOV" | "BSV"
    label: str                # nome completo
    items: List[int]          # números dos itens
    raw_sum: int              # soma bruta das respostas
    max_sum: int              # máximo possível
    normalized_score: float   # 0–100
    level: ScoreLevel         # Baixo / Médio / Alto

    # --- Campos normativos (preenchidos quando dados de referência existirem) ---
    # percentile: posição do score em relação à amostra normativa (0–100)
    # norm_label: classificação qualitativa baseada em norma ("Abaixo da média", etc.)
    # Enquanto não há norma: ambos ficam None — o frontend trata ausência explicitamente.
    percentile: float | None = None    # ex: 87.0
    norm_label: str | None = None      # ex: "Acima da média"


@dataclass
class ChecklistScore:
    responses: Dict[int, int]          # {item_number: 0-4}
    domains: Dict[str, DomainResult]   # {"HEV": ..., "HOV": ..., "BSV": ...}

    @property
    def hev(self) -> DomainResult:
        return self.domains["HEV"]

    @property
    def hov(self) -> DomainResult:
        return self.domains["HOV"]

    @property
    def bsv(self) -> DomainResult:
        return self.domains["BSV"]

    def to_dict(self) -> dict:
        return {
            "responses": self.responses,
            "domains": {
                key: {
                    "domain": d.domain,
                    "label": d.label,
                    "raw_sum": d.raw_sum,
                    "max_sum": d.max_sum,
                    "normalized_score": round(d.normalized_score, 1),
                    "level": d.level.value,
                    # normativos: None enquanto não há dados de referência
                    "percentile": d.percentile,
                    "norm_label": d.norm_label,
                }
                for key, d in self.domains.items()
            },
        }


# ---------------------------------------------------------------------------
# Validação das respostas
# ---------------------------------------------------------------------------

class ChecklistValidationError(ValueError):
    pass


def validate_responses(responses: Dict[int, int]) -> None:
    """
    Garante que o dict de respostas está completo e dentro da escala.
    Lança ChecklistValidationError com mensagem descritiva em caso de falha.
    """
    missing = [i for i in ITEMS if i not in responses]
    if missing:
        raise ChecklistValidationError(
            f"Itens sem resposta: {missing}. Todos os {TOTAL_ITEMS} itens são obrigatórios."
        )

    invalid = {
        item: val for item, val in responses.items()
        if not isinstance(val, int) or val not in range(5)
    }
    if invalid:
        raise ChecklistValidationError(
            f"Valores fora da escala (0–4): {invalid}"
        )

    unexpected = [i for i in responses if i not in ITEMS]
    if unexpected:
        raise ChecklistValidationError(
            f"Números de item inválidos: {unexpected}"
        )


# ---------------------------------------------------------------------------
# Cálculo principal
# ---------------------------------------------------------------------------

def calculate_scores(responses: Dict[int, int]) -> ChecklistScore:
    """
    Recebe as respostas brutas e retorna ChecklistScore com os três domínios.

    Args:
        responses: {item_number (1–20): score (0–4)}

    Returns:
        ChecklistScore com HEV, HOV e BSV calculados e classificados.

    Raises:
        ChecklistValidationError: se as respostas forem incompletas ou inválidas.
    """
    validate_responses(responses)

    domains: Dict[str, DomainResult] = {}

    for domain_key, item_list in DOMAIN_ITEMS.items():
        raw_sum = sum(responses[i] for i in item_list)
        max_sum = len(item_list) * MAX_ITEM_SCORE
        normalized = (raw_sum / max_sum) * 100
        norm = lookup_normative(domain_key, normalized)

        domains[domain_key] = DomainResult(
            domain=domain_key,
            label=DOMAIN_LABELS[domain_key],
            items=item_list,
            raw_sum=raw_sum,
            max_sum=max_sum,
            normalized_score=round(normalized, 1),
            level=classify_score(normalized),
            percentile=norm["percentile"],
            norm_label=norm["norm_label"],
        )

    return ChecklistScore(responses=responses, domains=domains)


def get_checklist_items() -> List[Dict]:
    """
    Retorna a lista completa de itens para renderização no frontend.
    """
    return [
        {
            "number": num,
            "text": text,
            "domain": next(
                (d for d, items in DOMAIN_ITEMS.items() if num in items), None
            ),
            "scale": SCALE_LABELS,
        }
        for num, text in ITEMS.items()
    ]


# ---------------------------------------------------------------------------
# Lookup normativo — plugável quando dados de referência estiverem disponíveis
# ---------------------------------------------------------------------------

def lookup_normative(domain: str, normalized_score: float) -> Dict:
    """
    Retorna percentil e label normativo para um score de domínio.

    Atualmente retorna None para ambos — sem dados normativos coletados.
    Quando a amostra de referência estiver disponível, substituir o corpo
    desta função por uma lookup table ou interpolação de percentis.

    Exemplo de implementação futura:
        NORM_TABLE = {
            "HEV": [(0, 0), (25, 10), (50, 30), (75, 65), (100, 99)],
            ...
        }
        # interpolar percentil a partir da tabela

    Args:
        domain: "HEV" | "HOV" | "BSV"
        normalized_score: float 0–100

    Returns:
        {"percentile": float|None, "norm_label": str|None}
    """
    # --- substitua este bloco quando tiver dados normativos ---
    return {
        "percentile": None,
        "norm_label": None,
    }
    # ----------------------------------------------------------


# Mapeamento de percentil para label qualitativo (para uso futuro)
# Baseado em convenção clínica padrão (similar ao SSP/SPM)
PERCENTILE_LABELS = [
    (98,  "Definitivamente mais que os outros"),
    (84,  "Mais que os outros"),
    (16,  "Similar aos outros"),
    (2,   "Menos que os outros"),
    (0,   "Definitivamente menos que os outros"),
]


def percentile_to_label(percentile: float) -> str:
    """Converte percentil numérico em label qualitativo padronizado."""
    for threshold, label in PERCENTILE_LABELS:
        if percentile >= threshold:
            return label
    return PERCENTILE_LABELS[-1][1]
