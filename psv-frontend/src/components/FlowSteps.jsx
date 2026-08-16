import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const STEPS = [
  { key: "triagem", label: "Triagem" },
  { key: "recomendacoes", label: "Recomendações" },
  { key: "tarefas", label: "Tarefas" },
  { key: "resultados", label: "Resultados" },
];

export default function FlowSteps({ sessionId, current = "triagem", completed = [] }) {
  const navigate = useNavigate();
  const { professional } = useAuth();
  const canNavigate = Boolean(professional?.is_admin);
  const currentIndex = STEPS.findIndex((step) => step.key === current);

  const goTo = (key) => {
    if (key === "triagem") navigate(`/sessions/${sessionId}/checklist`);
    if (key === "recomendacoes") navigate(`/sessions/${sessionId}/checklist?etapa=recomendacoes`);
    if (key === "tarefas") navigate(`/sessions/${sessionId}/tasks`);
    if (key === "resultados") navigate(`/sessions/${sessionId}/results`);
  };

  return (
    <div className="flow-steps" aria-label="Etapas da avaliação" role="list">
      {STEPS.map((step, index) => {
        const isActive = step.key === current;
        const isDone = completed.includes(step.key) || index < currentIndex;
        const content = (
          <>
            <span className="flow-steps__index">{index + 1}</span>
            <span className="flow-steps__label">{step.label}</span>
          </>
        );

        return canNavigate ? (
          <button
            key={step.key}
            type="button"
            aria-current={isActive ? "step" : undefined}
            className={`flow-steps__item is-clickable ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}
            onClick={() => goTo(step.key)}
          >
            {content}
          </button>
        ) : (
          <div
            key={step.key}
            role="listitem"
            aria-current={isActive ? "step" : undefined}
            className={`flow-steps__item ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
