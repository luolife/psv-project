import pipTeaLogo from "../assets/pip-tea.png";

export default function SiteFooter() {
  return (
    <footer className="dashboard-footer">
      <div className="dashboard-footer__inner">
        <div className="dashboard-footer__brand" aria-label="PIP-TEA">
          <img src={pipTeaLogo} alt="PIP-TEA" />
        </div>
        <p>
          Produto Técnico-Tecnológico derivado da pesquisa de Mestrado Profissional em Psicologia, Desenvolvimento e Políticas Públicas da Universidade Católica de Santos (UNISANTOS)
        </p>
        <div className="dashboard-footer__author">
          <strong>© 2026 PSV</strong>
        </div>
      </div>
    </footer>
  );
}
