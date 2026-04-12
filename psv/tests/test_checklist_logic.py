"""
Testes para psv/core/checklist_logic.py
Rode com: pytest tests/test_checklist_logic.py -v
"""

import pytest
from core.checklist_logic import (
    calculate_scores,
    get_checklist_items,
    validate_responses,
    ChecklistValidationError,
    ScoreLevel,
    DOMAIN_ITEMS,
    TOTAL_ITEMS,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def make_responses(value: int) -> dict:
    """Retorna um dict com todos os 20 itens preenchidos com o mesmo valor."""
    return {i: value for i in range(1, 21)}


# ---------------------------------------------------------------------------
# Testes de validação
# ---------------------------------------------------------------------------

class TestValidation:

    def test_rejects_missing_items(self):
        responses = make_responses(2)
        del responses[5]
        with pytest.raises(ChecklistValidationError, match="sem resposta"):
            validate_responses(responses)

    def test_rejects_score_above_4(self):
        responses = make_responses(2)
        responses[3] = 5
        with pytest.raises(ChecklistValidationError, match="fora da escala"):
            validate_responses(responses)

    def test_rejects_negative_score(self):
        responses = make_responses(2)
        responses[1] = -1
        with pytest.raises(ChecklistValidationError, match="fora da escala"):
            validate_responses(responses)

    def test_rejects_invalid_item_number(self):
        responses = make_responses(0)
        responses[99] = 2
        with pytest.raises(ChecklistValidationError, match="inválidos"):
            validate_responses(responses)

    def test_accepts_valid_boundary_values(self):
        # 0 e 4 são válidos
        responses = make_responses(0)
        responses[1] = 4
        validate_responses(responses)  # não deve levantar exceção


# ---------------------------------------------------------------------------
# Testes de cálculo — casos extremos
# ---------------------------------------------------------------------------

class TestCalculation:

    def test_all_zero_gives_zero_scores(self):
        result = calculate_scores(make_responses(0))
        for domain in result.domains.values():
            assert domain.raw_sum == 0
            assert domain.normalized_score == 0.0
            assert domain.level == ScoreLevel.LOW

    def test_all_max_gives_100_scores(self):
        result = calculate_scores(make_responses(4))
        for domain in result.domains.values():
            assert domain.normalized_score == 100.0
            assert domain.level == ScoreLevel.HIGH

    def test_hev_item_count(self):
        """HEV tem 8 itens → max_sum = 32"""
        result = calculate_scores(make_responses(4))
        assert result.hev.max_sum == 32
        assert len(result.hev.items) == 8

    def test_hov_item_count(self):
        """HOV tem 6 itens → max_sum = 24"""
        result = calculate_scores(make_responses(4))
        assert result.hov.max_sum == 24
        assert len(result.hov.items) == 6

    def test_bsv_item_count(self):
        """BSV tem 6 itens → max_sum = 24"""
        result = calculate_scores(make_responses(4))
        assert result.bsv.max_sum == 24
        assert len(result.bsv.items) == 6

    def test_domain_items_cover_all_20(self):
        """Todos os 20 itens devem estar em exatamente um domínio."""
        all_items = []
        for items in DOMAIN_ITEMS.values():
            all_items.extend(items)
        assert sorted(all_items) == list(range(1, 21))

    def test_hev_calculation_manual(self):
        """
        Só itens HEV (1,4,7,8,10,14,17,19) marcados com 2, resto 0.
        raw_sum = 8 * 2 = 16; max = 32; normalized = 50.0
        """
        responses = make_responses(0)
        for item in DOMAIN_ITEMS["HEV"]:
            responses[item] = 2
        result = calculate_scores(responses)
        assert result.hev.raw_sum == 16
        assert result.hev.normalized_score == 50.0
        assert result.hev.level == ScoreLevel.MEDIUM
        # outros domínios devem ser 0
        assert result.hov.raw_sum == 0
        assert result.bsv.raw_sum == 0

    def test_score_from_prototype_image(self):
        """
        Reproduz o exemplo da imagem do protótipo:
        HEV=78, HOV=32, BSV=55 (aproximados).
        Verifica apenas a classificação esperada.
        """
        responses = make_responses(0)
        # HEV alto: itens 1,4,7,8,10,14,17,19 → score ~78 → todos com 3
        for item in DOMAIN_ITEMS["HEV"]:
            responses[item] = 3   # 8*3=24/32 = 75.0 → Alto
        # HOV baixo: itens com 1
        for item in DOMAIN_ITEMS["HOV"]:
            responses[item] = 1   # 6*1=6/24 = 25.0 → Baixo
        # BSV médio: itens com 2
        for item in DOMAIN_ITEMS["BSV"]:
            responses[item] = 2   # 6*2=12/24 = 50.0 → Médio

        result = calculate_scores(responses)
        assert result.hev.level == ScoreLevel.HIGH
        assert result.hov.level == ScoreLevel.LOW
        assert result.bsv.level == ScoreLevel.MEDIUM


# ---------------------------------------------------------------------------
# Testes de classificação
# ---------------------------------------------------------------------------

class TestClassification:

    @pytest.mark.parametrize("score,expected", [
        (0.0,   ScoreLevel.LOW),
        (33.0,  ScoreLevel.LOW),
        (33.1,  ScoreLevel.MEDIUM),
        (66.0,  ScoreLevel.MEDIUM),
        (66.1,  ScoreLevel.HIGH),
        (100.0, ScoreLevel.HIGH),
    ])
    def test_boundaries(self, score, expected):
        from core.checklist_logic import classify_score
        assert classify_score(score) == expected



# ---------------------------------------------------------------------------
# Testes dos campos normativos (placeholder)
# ---------------------------------------------------------------------------

class TestNormative:

    def test_percentile_is_none_without_norm_data(self):
        """Sem dados normativos, percentil deve ser None — nunca um valor inventado."""
        result = calculate_scores(make_responses(3))
        for domain in result.domains.values():
            assert domain.percentile is None

    def test_norm_label_is_none_without_norm_data(self):
        result = calculate_scores(make_responses(3))
        for domain in result.domains.values():
            assert domain.norm_label is None

    def test_to_dict_includes_normative_keys(self):
        """to_dict deve sempre incluir as chaves, mesmo que None."""
        d = calculate_scores(make_responses(2)).to_dict()
        for domain_data in d["domains"].values():
            assert "percentile" in domain_data
            assert "norm_label" in domain_data

    def test_percentile_to_label_mapping(self):
        from core.checklist_logic import percentile_to_label
        assert percentile_to_label(99) == "Definitivamente mais que os outros"
        assert percentile_to_label(84) == "Mais que os outros"
        assert percentile_to_label(50) == "Similar aos outros"
        assert percentile_to_label(10) == "Menos que os outros"
        assert percentile_to_label(1)  == "Definitivamente menos que os outros"

    def test_lookup_normative_returns_expected_shape(self):
        from core.checklist_logic import lookup_normative
        result = lookup_normative("HEV", 75.0)
        assert "percentile" in result
        assert "norm_label" in result

class TestSerialization:

    def test_to_dict_structure(self):
        result = calculate_scores(make_responses(2))
        d = result.to_dict()
        assert "responses" in d
        assert "domains" in d
        for key in ["HEV", "HOV", "BSV"]:
            assert key in d["domains"]
            dom = d["domains"][key]
            assert "normalized_score" in dom
            assert "level" in dom
            assert "raw_sum" in dom

    def test_get_checklist_items_returns_all(self):
        items = get_checklist_items()
        assert len(items) == TOTAL_ITEMS
        numbers = [i["number"] for i in items]
        assert numbers == list(range(1, 21))

    def test_each_item_has_domain(self):
        items = get_checklist_items()
        for item in items:
            assert item["domain"] in ("HEV", "HOV", "BSV")
