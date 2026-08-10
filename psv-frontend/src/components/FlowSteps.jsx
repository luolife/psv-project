const STEPS = [
  { key: "triagem", label: "Triagem" },
  { key: "recomendacoes", label: "Recomendações" },
  { key: "tarefas", label: "Tarefas" },
  { key: "resultados", label: "Resultados" },
];

export default function FlowSteps({ current = "triagem", completed = [] }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);

  return (
    <div className="flow-steps" aria-label="Etapas da avaliação" role="list">
      {STEPS.map((step, index) => {
        const isActive = step.key === current;
        const isDone = completed.includes(step.key) || index < currentIndex;
        return (
          <div
            key={step.key}
            role="listitem"
            aria-current={isActive ? "step" : undefined}
            className={`flow-steps__item ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}
          >
            <span className="flow-steps__index">{index + 1}</span>
            <span className="flow-steps__label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
