// frontend/src/pages/Results.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import FlowSteps from "../components/FlowSteps";
import SiteFooter from "../components/SiteFooter";
import { sessionsApi, reportsApi } from "../api/client";

const TASK_LABELS = {
  contrast: "Sensibilidade de Contraste",
  motion:   "Movimento Global",
  gabor:    "Discriminação de Padrões Espaciais",
};

const MINIMUM_LABELS = [
  ["uses_correction", "Uso de óculos ou lentes corretivas"],
  ["wearing_correction_now", "Correção visual habitual em uso no momento da aplicação"],
  ["visual_condition", "Condição visual ou oftalmológica autorrelatada"],
  ["visual_reaction_history", "Histórico de crise desencadeada por estímulos visuais"],
  ["current_discomfort", "Desconforto atual antes da aplicação"],
];

const SCREENING_DOMAINS = [
  ["Desconforto visual ambiental", ["q1", "q2", "q3", "q4"]],
  ["Sobrecarga visual contextual", ["q5", "q6", "q7", "q8"]],
  ["Contraste, padrões e organização visual", ["q9", "q10", "q11", "q12"]],
  ["Movimento visual", ["q13", "q14", "q15", "q16"]],
  ["Interesse, atração ou fixação por estímulos visuais", ["q17", "q18", "q19", "q20"]],
  ["Impacto funcional da experiência visual", ["q21", "q22", "q23", "q24"]],
];

const ANSWER_LABELS = {
  sim: "Sim",
  nao: "Não",
  nao_se_aplica: "Não se aplica",
  nao_sei_informar: "Não informado",
};

function fullDisplayName(name, fallback = "Participante") {
  return (name || "").trim() || fallback;
}

function sexLabel(value) {
  if (value === "M") return "Masculino";
  if (value === "F") return "Feminino";
  return "Outro";
}

function calcAge(birthdate) {
  if (!birthdate) return null;
  const birth = new Date(`${birthdate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseScreening(rawResponses) {
  if (!rawResponses) return null;

  const parsedEntries = Object.values(rawResponses).map(parseMaybeJson);
  const direct = parseMaybeJson(rawResponses);
  const minimum = direct?.minimum
    || parsedEntries.find((entry) => entry?.minimum)?.minimum
    || null;
  const scale = direct?.scale
    || parsedEntries.find((entry) => entry?.scale)?.scale
    || null;
  const openResponse = direct?.open_response
    || parsedEntries.find((entry) => Object.prototype.hasOwnProperty.call(entry || {}, "open_response"))?.open_response
    || "";

  if (!minimum && !scale) return null;
  return { minimum: minimum || {}, scale: scale || {}, openResponse };
}

function formatAnswer(value) {
  return ANSWER_LABELS[value] || "Não informado";
}

function formatMean(value) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function meanTrialRt(trials = [], expectedCorrect) {
  const values = trials
    .filter((trial) => trial.correct === expectedCorrect && Number.isFinite(Number(trial.rt_ms)))
    .map((trial) => Number(trial.rt_ms));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function meanGeneralRt(trials = []) {
  const values = trials
    .filter((trial) => Number.isFinite(Number(trial.rt_ms)))
    .map((trial) => Number(trial.rt_ms));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMs(value) {
  return value === null || value === undefined ? "—" : `${Math.round(value)} ms`;
}

function classifyMean(value) {
  if (value === null || value === undefined) return "Não informado";
  if (value < 1) return "Baixa";
  if (value < 2) return "Leve";
  if (value < 3) return "Moderada";
  return "Elevada";
}

function buildScreeningSummary(rawResponses, hasChecklist = false) {
  const screening = parseScreening(rawResponses);
  if (!screening && !hasChecklist) return null;

  const domains = SCREENING_DOMAINS.map(([label, keys]) => {
    const values = keys
      .map((key) => Number(screening?.scale?.[key]))
      .filter((value) => Number.isFinite(value));
    const mean = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;

    return {
      label,
      mean,
      classification: classifyMean(mean),
    };
  });

  const strongest = domains
    .filter((domain) => domain.mean !== null)
    .sort((a, b) => b.mean - a.mean)
    .slice(0, 2)
    .map((domain) => domain.label.toLowerCase());

  return {
    minimum: screening?.minimum || {},
    scale: screening?.scale || {},
    openResponse: screening?.openResponse || "",
    domains,
    strongest,
  };
}

export default function Results() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [reportResponsibilityAccepted, setReportResponsibilityAccepted] = useState(false);
  const [error, setError]     = useState("");
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    sessionsApi.summary(sessionId)
      .then(setSummary)
      .catch((requestError) => {
        setError(
          requestError.response?.data?.detail ||
          "Não foi possível carregar os resultados",
        );
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const downloadPdf = async (type = "geral") => {
    if (!reportResponsibilityAccepted) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const initials = summary?.participant?.initials || "PSV";
      const date = new Date(summary?.session?.created_at).toLocaleDateString("pt-BR").replace(/\//g, "-");
      const suffix = type === "detalhado" ? "detalhado" : "geral";
      await reportsApi.download(
        sessionId,
        `PSV_${initials}_${date}_${suffix}.pdf`,
        type,
        reportResponsibilityAccepted,
      );
      setReportMenuOpen(false);
    } catch (requestError) {
      setDownloadError(
        requestError.response?.data?.detail ||
        "Não foi possível gerar o relatório",
      );
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <div className="page"><Navbar /><div className="loading-screen">Carregando resultados...</div><SiteFooter /></div>
  );

  if (error) return (
    <div className="page"><Navbar />
      <main className="container mt-4"><p className="form-error">{error}</p></main>
      <SiteFooter />
    </div>
  );

  const { participant, tasks, session, checklist } = summary;
  const date = new Date(session.created_at).toLocaleDateString("pt-BR");
  const participantAge = participant.age ?? calcAge(participant.birthdate);
  const screeningSummary = buildScreeningSummary(checklist?.raw_responses, Boolean(checklist));

  return (
    <div className="page">
      <Navbar />
      <main className="container mt-4" style={{ maxWidth: 800, paddingBottom: "3rem" }}>
        <FlowSteps
          sessionId={sessionId}
          current="resultados"
          completed={["triagem", "recomendacoes", "tarefas"]}
        />

        <div className="card results-unified">
          <div className="section-card-header results-hero__header">
            <h2>Resultados da Avaliação</h2>
          </div>

          <div className="results-patient">
            <div className="results-patient__summary">
              <div className="results-patient__identity">
                <strong>{fullDisplayName(participant.name, participant.initials)}</strong>
                <div className="results-patient__meta">
                  {participantAge !== null && participantAge !== undefined && (
                    <span>{participantAge} anos</span>
                  )}
                  <span>{sexLabel(participant.sex)}</span>
                  <span>{date}</span>
                </div>
              </div>
            </div>
            <span className={`badge ${session.status === "completed" ? "badge--teal" : "badge--medio"}`}>
              {session.status === "completed" ? "Concluída" : "Incompleto"}
            </span>
          </div>

          {screeningSummary && (
            <div className="results-section-group">
            <section className="results-screening-section">
              <h3>Condições para Aplicação</h3>
              <table className="results-table results-table--soft">
                <colgroup>
                  <col className="results-col-domain-wide" />
                  <col className="results-col-outcome" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {MINIMUM_LABELS.map(([key, label]) => (
                    <tr key={key}>
                      <td>{label}</td>
                      <td>{formatAnswer(screeningSummary.minimum[key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="results-screening-section">
              <h3>Indicadores Descritivos da Experiência Visual Autorrelatada</h3>
              <table className="results-table results-table--soft">
                <colgroup>
                  <col className="results-col-domain-main" />
                  <col className="results-col-mean" />
                  <col className="results-col-outcome" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Domínio</th>
                    <th>Média</th>
                    <th>Classificação</th>
                  </tr>
                </thead>
                <tbody>
                  {screeningSummary.domains.map((domain) => (
                    <tr key={domain.label}>
                      <td>{domain.label}</td>
                      <td>{formatMean(domain.mean)}</td>
                      <td>{domain.classification}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            </div>
          )}

          <div className="results-section-group">
            <section className="results-screening-section">
            <h3>Desempenho nas Tarefas Computadorizadas</h3>
          <table className="results-table results-table--tasks">
            <colgroup>
              <col className="results-col-task" />
              <col className="results-col-count" />
              <col className="results-col-count" />
              <col className="results-col-time" />
              <col className="results-col-time" />
              <col className="results-col-time" />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2}>Habilidades</th>
                <th rowSpan={2}>Acertos</th>
                <th rowSpan={2}>Erros</th>
                <th colSpan={3} className="results-table__group-head">Tempo de Reação</th>
              </tr>
              <tr>
                <th>Geral</th>
                <th>Acerto</th>
                <th>Erro</th>
              </tr>
            </thead>
            <tbody>
              {["contrast", "motion", "gabor"].map((key) => {
                const t = tasks.find((x) => x.task_name === key);
                if (!t) return (
                  <tr key={key}>
                    <td>{TASK_LABELS[key]}</td>
                    <td colSpan={5} className="text-muted">Não realizada</td>
                  </tr>
                );
                const hitPct = t.total_trials
                  ? Math.round((t.hits / t.total_trials) * 100)
                  : 0;
                const adjustedErrors = (t.errors || 0) + (t.omissions || 0);
                const errorPct = t.total_trials
                  ? Math.round((adjustedErrors / t.total_trials) * 100)
                  : 0;
                const generalRt = t.mean_rt_ms ?? meanGeneralRt(t.raw_trials);
                const hitRt = meanTrialRt(t.raw_trials, true);
                const errorRt = meanTrialRt(t.raw_trials, false);
                return (
                  <tr key={key}>
                    <td style={{ fontWeight: 500 }}>{TASK_LABELS[key]}</td>
                    <td>{t.hits}/{t.total_trials} ({hitPct}%)</td>
                    <td>{adjustedErrors}/{t.total_trials} ({errorPct}%)</td>
                    <td>{formatMs(generalRt)}</td>
                    <td>{formatMs(hitRt)}</td>
                    <td>{formatMs(errorRt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
            </section>
          </div>
        </div>

        <label className="report-confirmation">
          <input
            type="checkbox"
            checked={reportResponsibilityAccepted}
            onChange={(event) => {
              const accepted = event.target.checked;
              setReportResponsibilityAccepted(accepted);
              if (!accepted) setReportMenuOpen(false);
            }}
          />
          <span>
            Declaro que revisei os dados apresentados, as condições de aplicação e eventuais intercorrências registradas, reconhecendo que a interpretação, a guarda e a utilização profissional do relatório gerado são de minha responsabilidade.
          </span>
        </label>
        {downloadError && <p className="form-error">{downloadError}</p>}

        {/* Ações finais */}
        <div className="flow-action-row flow-action-row--split">
          <button className="results-action-button" onClick={() => navigate("/")}>
            Voltar
          </button>
          <div className="results-actions">
            <button className="results-action-button" onClick={() => navigate("/sessions/new")}>
              Nova Avaliação
            </button>
            <div className="report-download-menu">
              <button
                className="results-action-button results-action-button--primary"
                onClick={() => setReportMenuOpen((open) => !open)}
                disabled={session.status !== "completed" || downloading || !reportResponsibilityAccepted}
              >
                {downloading ? "Gerando..." : "Gerar Relatório"}
              </button>
              {reportMenuOpen && (
                <div className="report-download-menu__options">
                  <button type="button" onClick={() => downloadPdf("geral")}>
                    Relatório Geral
                  </button>
                  <button type="button" onClick={() => downloadPdf("detalhado")}>
                    Relatório Detalhado
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
