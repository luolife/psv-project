import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import logoSrc from "../assets/logo.png.png";

// The version suffix ensures the embedded viewer always fetches the latest manual.
const MANUAL_FILE = "/documents/manual-tecnico.pdf?v=20260725-v23-final";

export default function ManualTechnical() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <Navbar />
      <main className="manual-page">
        <section className="card manual-panel">
          <div className="manual-hero">
            <div className="manual-hero__icon">
              <img src={logoSrc} alt="PSV" />
            </div>
            <div className="manual-hero__content">
              <span className="manual-kicker">MANUAL TÉCNICO - MAP-PSV</span>
              <h1>Manual Técnico do Protocolo Sensorial Visual</h1>
              <p>
                Documento de referência para orientar o uso profissional do PSV, reunindo informações sobre a proposta técnica, as condições de aplicação, o fluxo de registro e os cuidados necessários para interpretar os dados gerados pela plataforma.
              </p>
            </div>
          </div>

          <div className="manual-info-grid">
            <article className="manual-info-card">
              <span>Finalidade</span>
              <p>
                Apresentar a estrutura do protocolo e apoiar uma aplicação padronizada, com atenção às condições mínimas, ao registro das respostas e à leitura complementar dos resultados.
              </p>
            </article>
            <article className="manual-info-card">
              <span>Uso Profissional</span>
              <p>
                O manual deve ser consultado pelo profissional aplicador antes da utilização do PSV, especialmente para alinhar procedimentos, limites técnicos e responsabilidades de uso.
              </p>
            </article>
          </div>

          <div className="manual-access-card">
            <div>
              <span>Acesso ao Documento</span>
              <p>
                Abra o manual no visualizador do PSV para consultar com zoom e rolagem, ou baixe o arquivo para manter uma cópia local de referência.
              </p>
            </div>
            <div className="manual-access-card__actions">
              <button
                className="panel-action-button"
                type="button"
                onClick={() => navigate("/manual-tecnico/visualizar")}
              >
                Visualizar
              </button>
              <a
                className="panel-action-button panel-action-button--primary"
                href={MANUAL_FILE}
                download="Manual_Tecnico_PSV.pdf"
              >
                Baixar
              </a>
            </div>
          </div>
        </section>

        <div className="page-bottom-actions">
          <button className="profile-back-button" type="button" onClick={() => navigate("/")}>
            Voltar
          </button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
