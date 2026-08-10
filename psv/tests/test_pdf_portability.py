from pathlib import Path

from core.contract_generator import generate_contract_pdf
from core.pdf_fonts import register_arial_compatible_fonts
from core.privacy_generator import generate_privacy_pdf


def test_legal_pdfs_work_without_windows_fonts(tmp_path):
    missing_font_dir = tmp_path / "windows-fonts-not-installed"
    register_arial_compatible_fonts(Path(missing_font_dir))

    contract = generate_contract_pdf()
    privacy = generate_privacy_pdf()

    assert contract.startswith(b"%PDF")
    assert privacy.startswith(b"%PDF")
    assert len(contract) > 1_000
    assert len(privacy) > 1_000
