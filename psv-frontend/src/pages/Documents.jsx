import { useNavigate } from "react-router-dom";
import api from "../api/client";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";

function formatDateTime(value) {
  if (!value) return "[data] às [hora]";
  const normalizedValue = typeof value === "string" && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
    ? `${value}Z`
    : value;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return "[data] às [hora]";
  return `${date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} às ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })}`;
}

function verificationCode(professional) {
  const source = professional?.id || professional?.email || "";
  if (!source) return "[código]";
  return `PSV-${String(source).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

async function downloadPdf(path, filename) {
  const response = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function DocumentCard({ title, rows, viewPath, filePath, apiFilePath, filename, actions = true }) {
  const navigate = useNavigate();

  return (
    <article className="documents-card">
      <div className="documents-card__header">
        <h2>{title}</h2>
      </div>

      <dl className="documents-meta">
        {rows.map(([label, value]) => (
          <div className="documents-meta__row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {actions && (
        <div className="documents-card__actions">
          <button
            className="panel-action-button"
            type="button"
            onClick={() => navigate(viewPath)}
          >
            Visualizar
          </button>
          {apiFilePath ? (
          <button
            className="panel-action-button panel-action-button--primary"
            type="button"
            onClick={() => downloadPdf(apiFilePath, filename)}
          >
            Baixar
          </button>
          ) : (
          <a
            className="panel-action-button panel-action-button--primary"
            href={filePath}
            download={filename}
          >
            Baixar
          </a>
          )}
        </div>
      )}
    </article>
  );
}

export default function Documents() {
  const { professional } = useAuth();
  const navigate = useNavigate();
  const acceptedAt = formatDateTime(professional?.created_at);
  const acceptedDate = acceptedAt.split(" às ")[0] || "[data]";

  const documents = [
    {
      title: "Termo de Uso Profissional",
      viewPath: "/contrato",
      apiFilePath: "/sessions/documents/contract",
      filename: "Termo_Uso_Profissional_PSV.pdf",
      rows: [
        ["Status", "Aceito"],
        ["Versão", "PSV v.1.0"],
        ["Aceito em", acceptedAt],
        ["Código de verificação", verificationCode(professional)],
      ],
    },
    {
      title: "Política de Privacidade",
      viewPath: "/politica-privacidade",
      apiFilePath: "/sessions/documents/privacy",
      filename: "Politica_Privacidade_PSV.pdf",
      rows: [
        ["Status", "Ciência Registrada"],
        ["Versão", "v.1.0"],
        ["Aceito em", acceptedAt],
        ["Última atualização", "25/07/2026"],
      ],
    },
  ];

  return (
    <div className="page">
      <Navbar />
      <main className="documents-page">
        <section className="card documents-panel">
          <header className="section-card-header section-card-header--compact">
            <h1>Documentos</h1>
          </header>

          <div className="documents-grid">
            {documents.map((document) => (
              <DocumentCard key={document.title} {...document} />
            ))}
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
