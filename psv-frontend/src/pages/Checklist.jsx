// frontend/src/pages/Checklist.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { checklistApi, sessionsApi } from "../api/client";

const ITEMS = [
  { n: 1,  text: "Incomoda-se com luz solar intensa ou ambientes muito iluminados" },
  { n: 2,  text: "Parece não notar objetos em movimento em seu campo visual" },
  { n: 3,  text: "Busca ativamente padrões visuais repetitivos (linhas, grades, texturas)" },
  { n: 4,  text: "Evita ambientes com luzes fluorescentes ou piscantes" },
  { n: 5,  text: "Demonstra dificuldade em localizar objetos em ambientes visualmente complexos" },
  { n: 6,  text: "Apresenta fascínio por objetos luminosos ou estímulos giratórios" },
  { n: 7,  text: "Queixa-se de desconforto visual ao utilizar telas por períodos prolongados" },
  { n: 8,  text: "Fecha os olhos ou desvia o olhar diante de estímulos visuais intensos" },
  { n: 9,  text: "Não reage a estímulos visuais que normalmente chamariam atenção (gestos, expressões)" },
  { n: 10, text: "Prefere ambientes com iluminação reduzida" },
  { n: 11, text: "Demonstra interesse incomum por detalhes visuais específicos" },
  { n: 12, text: "Apresenta dificuldade em perceber detalhes visuais sutis" },
  { n: 13, text: "Aproxima objetos dos olhos para observá-los de forma incomum" },
  { n: 14, text: "Apresenta desconforto em ambientes com muitos estímulos visuais simultâneos" },
  { n: 15, text: "Parece não perceber quando alguém se aproxima pelo campo visual periférico" },
  { n: 16, text: "Move dedos ou objetos diante dos olhos de forma repetitiva" },
  { n: 17, text: "Demonstra reações intensas a cores vibrantes ou padrões complexos" },
  { n: 18, text: "Busca estímulos visuais brilhantes ou reflexivos" },
  { n: 19, text: "Apresenta dificuldade em ambientes visualmente movimentados (ex.: shopping)" },
  { n: 20, text: "Parece ignorar mudanças visuais no ambiente ao seu redor" },
];

const SCALE = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Raramente" },
  { value: 2, label: "Às vezes" },
  { value: 3, label: "Frequentemente" },
  { value: 4, label: "Sempre" },
];

function Stepper({ checklistDone }) {
  return (
    <div className="stepper">
      <div className="stepper__step">
        <div className="stepper__dot stepper__dot--done">✓</div>
        <span className="stepper__label">Cadastro</span>
      </div>
      <div className={`stepper__line ${checklistDone ? "stepper__line--done" : ""}`} />
      <div className="stepper__step">
        <div className={`stepper__dot ${checklistDone ? "stepper__dot--done" : "stepper__dot--active"}`}>
          {checklistDone ? "✓" : "2"}
        </div>
        <span className="stepper__label">Check-list</span>
      </div>
      <div className="stepper__line" />
      <div className="stepper__step">
        <div className={`stepper__dot ${checklistDone ? "stepper__dot--active" : "stepper__dot--pending"}`}>3</div>
        <span className="stepper__label">Tarefas</span>
      </div>
      <div className="stepper__line" />
      <div className="stepper__step">
        <div className="stepper__dot stepper__dot--pending">4</div>
        <span className="stepper__label">Resultados</span>
      </div>
    </div>
  );
}

export default function Checklist() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [responses, setResponses] = useState({});
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [checking, setChecking]   = useState(true);
  const [alreadyDone, setAlreadyDone] = useState(false);

  // Ao carregar, verifica se o checklist já foi preenchido
  useEffect(() => {
    sessionsApi.summary(sessionId)
      .then((summary) => {
        if (summary.checklist) {
          setAlreadyDone(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [sessionId]);

  const answered = Object.keys(responses).length;
  const total    = ITEMS.length;
  const progress = Math.round((answered / total) * 100);

  const setResponse = (itemNumber, value) => {
    setResponses((prev) => ({ ...prev, [itemNumber]: value }));
  };

  const submit = async () => {
    if (answered < total) {
      setError(`Responda todos os itens. Faltam ${total - answered}.`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(responses).map(([k, v]) => [parseInt(k, 10), v])
      );
      await checklistApi.submit(sessionId, payload);
      navigate(`/sessions/${sessionId}/tasks`);
    } catch (err) {
      const detail = err.response?.data?.detail || "";
      // Se já foi submetido, vai para tasks
      if (detail.includes("já foi submetido")) {
        navigate(`/sessions/${sessionId}/tasks`);
      } else {
        setError(detail || "Erro ao salvar checklist");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="page">
        <Navbar />
        <main className="container mt-4" style={{ maxWidth: 720 }}>
          <p className="text-muted text-small text-center">Carregando sessão...</p>
        </main>
      </div>
    );
  }

  // Checklist já feito — mostra aviso e botão para continuar para as tasks
  if (alreadyDone) {
    return (
      <div className="page">
        <Navbar />
        <main className="container mt-4" style={{ maxWidth: 720 }}>
          <Stepper checklistDone={true} />
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✓</div>
            <h2 className="mb-1">Check-list já preenchido</h2>
            <p className="text-muted text-small mb-3">
              O check-list desta sessão já foi registrado. Continue para as tarefas computadorizadas.
            </p>
            <button
              className="btn btn--primary btn--lg"
              onClick={() => navigate(`/sessions/${sessionId}/tasks`)}
            >
              Continuar para as tarefas →
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar />
      <main className="container mt-4" style={{ maxWidth: 720 }}>
        <Stepper checklistDone={false} />

        <div className="card">
          <div className="flex justify-between items-center mb-1">
            <h2>Check-list de Sensibilidade Visual</h2>
            <span className="text-muted text-small mono">{answered}/{total}</span>
          </div>
          <p className="text-muted text-small mb-2">
            Indique com que frequência o participante apresenta cada comportamento.
          </p>

          <div style={{
            height: 4, background: "var(--c-border)",
            borderRadius: 999, marginBottom: "1.5rem", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${progress}%`,
              background: "var(--c-teal-500)",
              transition: "width 0.3s ease", borderRadius: 999,
            }} />
          </div>

          <div style={{
            display: "flex", gap: "0.75rem", marginBottom: "1rem",
            padding: "0.625rem 1rem",
            background: "var(--c-bg)", borderRadius: "var(--radius-md)",
            flexWrap: "wrap",
          }}>
            {SCALE.map((s) => (
              <span key={s.value} className="text-small text-muted">
                <span className="mono" style={{ fontWeight: 600, color: "var(--c-blue-500)" }}>
                  {s.value}
                </span>
                {" "}— {s.label}
              </span>
            ))}
          </div>

          <div>
            {ITEMS.map((item) => (
              <div
                key={item.n}
                className={`checklist-item ${responses[item.n] !== undefined ? "answered" : ""}`}
              >
                <div>
                  <div className="checklist-item__number">Item {item.n}</div>
                  <div className="checklist-item__text">{item.text}</div>
                </div>
                <div className="scale-buttons">
                  {SCALE.map((s) => (
                    <button
                      key={s.value}
                      className={`scale-btn ${responses[item.n] === s.value ? "selected" : ""}`}
                      onClick={() => setResponse(item.n, s.value)}
                      title={s.label}
                      type="button"
                    >
                      {s.value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="form-error mt-2">{error}</p>}
          <div className="flex gap-1 mt-3">
            <button className="btn btn--ghost" onClick={() => navigate("/")}>
              Cancelar
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1 }}
              onClick={submit}
              disabled={loading}
            >
              {loading
                ? "Salvando..."
                : answered < total
                  ? `Responda mais ${total - answered} item(s)`
                  : "Salvar e continuar →"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
