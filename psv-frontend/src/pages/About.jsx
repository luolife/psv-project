import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import pipTeaLogo from "../assets/pip-tea.png";
import unisantosLogo from "../assets/unisantos-symbol-white.png";

const ABOUT_LINKS = [
  {
    icon: "instagram",
    label: "PIP-TEA",
    href: "https://www.instagram.com/piptea.unisantos/",
  },
  {
    icon: "instagram",
    label: "Luiz Henrique Ferreira",
    href: "https://www.instagram.com/psi.luizhferreira/?utm_source=ig_web_button_share_sheet",
  },
  {
    icon: "site",
    label: "UNISANTOS",
    href: "https://www.unisantos.br",
  },
];

const PEOPLE = [
  {
    role: "Pesquisador",
    name: "Luiz Henrique Alves dos Santos Ferreira",
    lattes: "http://lattes.cnpq.br/0249836393313307",
  },
  {
    role: "Orientador",
    name: "Prof. Dr. Edgar Toschi Dias",
    lattes: "http://lattes.cnpq.br/0811672026179794",
  },
  {
    role: "Coautoria",
    name: "Lucas Oliveira Ferreira",
    lattes: "http://lattes.cnpq.br/2172965813581934",
  },
];

const ABOUT_ITEMS = [
  ["Programa", "Mestrado Profissional em Psicologia, Desenvolvimento e Políticas Públicas"],
  ["Instituição", "Universidade Católica de Santos (UNISANTOS)"],
  ["Produto", "Produto Técnico-Tecnológico"],
  ["Apoio", "CAPES/PROEXT-PG"],
  ["CAAE", "8683812.4.0000.5536"],
];

const RESEARCH_TITLE = "Processamento visual e respostas autonômicas induzidos por paradigmas computadorizados em jovens adultos com Transtorno do Espectro Autista";

function LinkIcon({ type }) {
  if (type === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="4" />
        <circle cx="12" cy="12" r="3.2" />
        <circle cx="16.4" cy="7.8" r="0.8" />
      </svg>
    );
  }

  if (type === "lattes") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h7l3 3v13H7z" />
        <path d="M14 4v4h4" />
        <path d="M9.5 12h5" />
        <path d="M9.5 15h4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <path d="M12 4c2.2 2.2 3.2 4.8 3.2 8s-1 5.8-3.2 8" />
      <path d="M12 4c-2.2 2.2-3.2 4.8-3.2 8s1 5.8 3.2 8" />
    </svg>
  );
}

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <Navbar />
      <main className="about-page">
        <section className="about-hero">
          <div className="about-hero__logos" aria-hidden="true">
            <span className="about-hero__logo about-hero__logo--unisantos">
              <img src={unisantosLogo} alt="" />
            </span>
            <span className="about-hero__separator" />
            <span className="about-hero__logo about-hero__logo--pip">
              <img src={pipTeaLogo} alt="" />
            </span>
          </div>

          <div className="about-hero__content">
            <span className="about-kicker">Sobre</span>
            <h1>Protocolo Sensorial Visual</h1>
            <p>
              Produto Técnico-Tecnológico derivado de pesquisa de Mestrado Profissional, desenvolvido para apoiar a aplicação, o registro e o acompanhamento de tarefas relacionadas ao processamento sensorial visual.
            </p>
          </div>
        </section>

        <section className="about-grid">
          <article className="about-card about-card--wide">
            <span className="about-card__label">Sobre o pesquisador</span>
            <p>
              Luiz Henrique Alves dos Santos Ferreira é mestrando em Psicologia, Desenvolvimento e Políticas Públicas pela UNISANTOS, bolsista CAPES no Programa PIP-TEA, com atuação voltada à avaliação psicológica, elaboração de laudos e desenvolvimento de habilidades para inclusão de pessoas com Transtorno do Espectro Autista (TEA) e comorbidades associadas. Sua trajetória integra pesquisas de Iniciação Científica em saúde mental, experiência em clínica ABA, planejamento de intervenções, mediação com famílias e capacitação de equipes, sempre orientada por evidências científicas, indicadores de eficácia, autonomia e qualidade de vida.
            </p>
          </article>

          <article className="about-card about-card--profile">
            <span className="about-card__label">EQUIPE DA PESQUISA</span>
            <div className="about-people">
              {PEOPLE.map((person) => (
                <div key={person.name} className="about-person">
                  <span>{person.role}</span>
                  <strong>{person.name}</strong>
                  <a className="about-lattes-button" href={person.lattes} target="_blank" rel="noreferrer" title={`Currículo Lattes de ${person.name}`}>
                    <LinkIcon type="lattes" />
                    <span>Lattes</span>
                  </a>
                </div>
              ))}
            </div>
          </article>

          <article className="about-card">
            <span className="about-card__label">Vínculo Acadêmico</span>
            <div className="about-list">
              {ABOUT_ITEMS.map(([label, value]) => (
                <div key={label} className="about-list__item">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="about-card about-card--wide">
            <div className="about-card__header">
              <span className="about-card__label">Pesquisa que derivou o produto técnico</span>
              <h2>{RESEARCH_TITLE}</h2>
              <div className="about-research-tags">
                <span>Transtorno do Espectro Autista</span>
                <span>Processamento Sensorial Visual</span>
                <span>Respostas Autonômicas</span>
                <span>Protocolo Experimental</span>
                <span>Paradigmas Computadorizados</span>
              </div>
            </div>

            <div className="about-abstract">
              <p>
                O estudo investigou o processamento sensorial visual e as respostas autonômicas induzidos por paradigmas computadorizados em jovens adultos com Transtorno do Espectro Autista (TEA), considerando indicadores comportamentais e psicofisiológicos.
              </p>
              <p>
                A amostra foi composta por 15 participantes com diagnóstico de TEA, submetidos às tarefas de Sensibilidade ao Contraste, Discriminação de Padrões Espaciais (Gabor) e Coerência de Movimento, com registro de acurácia, tempo de reação, omissões, padrões de resposta, frequência cardíaca e frequência respiratória.
              </p>
              <p>
                A integração entre tarefas computadorizadas e registros fisiológicos demonstrou viabilidade técnica e metodológica, subsidiando o desenvolvimento do Protocolo Sensorial Visual (PSV) como Produto Técnico-Tecnológico de apoio à avaliação do processamento sensorial visual em contextos clínicos, institucionais e de pesquisa.
              </p>
            </div>
          </article>

          <article className="about-card about-card--wide">
            <span className="about-card__label">Acesso Institucional</span>
            <div className="about-links about-links--three">
              {ABOUT_LINKS.map((link) => (
                <a
                  key={link.label}
                  className="about-link"
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="about-link__icon">
                    <LinkIcon type={link.icon} />
                  </span>
                  <span className="about-link__text">
                    <strong>{link.label}</strong>
                  </span>
                </a>
              ))}
            </div>
          </article>
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
