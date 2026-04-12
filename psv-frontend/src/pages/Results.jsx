// frontend/src/pages/Results.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { sessionsApi, reportsApi } from "../api/client";

const TASK_LABELS = {
  contrast: "Limiares de Contraste Visual",
  motion:   "Movimento Global",
  gabor:    "Padrões Espaciais",
};

const LEVEL_BADGE = {
  "Alto":  "badge--alto",
  "Médio": "badge--medio",
  "Baixo": "badge--baixo",
};

function ScoreBar({ score, level }) {
  const cls = level === "Alto" ? "alto" : level === "Médio" ? "medio" : "baixo";
  return (
    <div>
      <span className="mono" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
        {score?.toFixed(1)}/100
      </span>
      <div className="score-bar">
        <div
          className={`score-bar__fill score-bar__fill--${cls}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function Results() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    sessionsApi.summary(sessionId)
      .then(setSummary)
      .catch(() => setError("Não foi possível carregar os resultados"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const initials = summary?.participant?.initials || "PSV";
      const date = new Date(summary?.session?.created_at).toLocaleDateString("pt-BR").replace(/\//g, "-");
      await reportsApi.download(sessionId, `PSV_${initials}_${date}.pdf`);
    } catch {
      setError("Erro ao gerar PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <div className="page"><Navbar /><div className="loading-screen">Carregando resultados...</div></div>
  );

  if (error) return (
    <div className="page"><Navbar />
      <main className="container mt-4"><p className="form-error">{error}</p></main>
    </div>
  );

  const { participant, checklist, tasks, session } = summary;
  const date = new Date(session.created_at).toLocaleDateString("pt-BR");

  return (
    <div className="page">
      <Navbar />
      <main className="container mt-4" style={{ maxWidth: 800, paddingBottom: "3rem" }}>

        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1>Resultados da Avaliação</h1>
            <p className="text-muted text-small mt-1">
              {participant.initials} · {participant.age} anos ·{" "}
              {participant.sex === "M" ? "Masculino" : participant.sex === "F" ? "Feminino" : "Outro"} ·{" "}
              <span className="mono">{date}</span>
            </p>
          </div>
          <div className="flex gap-1">
            <button className="btn btn--ghost btn--sm" onClick={() => navigate("/")}>
              ← Início
            </button>
            <button
              className="btn btn--primary btn--sm"
              onClick={downloadPdf}
              disabled={downloading}
            >
              {downloading ? "Gerando PDF..." : "Baixar PDF"}
            </button>
          </div>
        </div>

        {/* Tasks */}
        <div className="card mb-2">
          <h2 className="mb-2">Tarefas computadorizadas</h2>
          <table className="results-table">
            <thead>
              <tr>
                <th>Habilidade</th>
                <th>Acertos</th>
                <th>Erros</th>
                <th>Omissões</th>
                <th>Tempo médio</th>
              </tr>
            </thead>
            <tbody>
              {["contrast", "motion", "gabor"].map((key) => {
                const t = tasks.find((x) => x.task_name === key);
                if (!t) return (
                  <tr key={key}>
                    <td>{TASK_LABELS[key]}</td>
                    <td colSpan={4} className="text-muted">Não realizada</td>
                  </tr>
                );
                const hitPct = t.total_trials
                  ? Math.round((t.hits / t.total_trials) * 100)
                  : 0;
                return (
                  <>
                    <tr key={key}>
                      <td style={{ fontWeight: 500 }}>{TASK_LABELS[key]}</td>
                      <td className="mono">{t.hits}/{t.total_trials} ({hitPct}%)</td>
                      <td className="mono">{t.errors}</td>
                      <td className="mono">{t.omissions}</td>
                      <td className="mono">{t.mean_rt_ms ? `${Math.round(t.mean_rt_ms)} ms` : "—"}</td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Checklist */}
        <div className="card">
          <h2 className="mb-2">Check-list de Sensibilidade Visual</h2>
          {checklist ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[
                { key: "hev", label: "Hipersensibilidade Visual (HEV)", score: checklist.hev_score, level: checklist.hev_level },
                { key: "hov", label: "Hipossensibilidade Visual (HOV)", score: checklist.hov_score, level: checklist.hov_level },
                { key: "bsv", label: "Busca Sensorial Visual (BSV)",    score: checklist.bsv_score, level: checklist.bsv_level },
              ].map(({ key, label, score, level }) => (
                <div key={key} style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 180px",
                  gap: "1rem", alignItems: "center",
                }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{label}</span>
                  <span className={`badge ${LEVEL_BADGE[level] || ""}`}>{level}</span>
                  <ScoreBar score={score} level={level} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-small">Check-list não aplicado.</p>
          )}
        </div>

        {/* Ações finais */}
        <div className="flex gap-1 mt-3" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn--outline" onClick={() => navigate("/sessions/new")}>
            Nova avaliação
          </button>
          <button
            className="btn btn--primary btn--lg"
            onClick={downloadPdf}
            disabled={downloading}
          >
            {downloading ? "Gerando..." : "Gerar relatório em PDF"}
          </button>
        </div>
      </main>
    </div>
  );
}
