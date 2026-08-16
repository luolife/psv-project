import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import FlowSteps from "../components/FlowSteps";
import SiteFooter from "../components/SiteFooter";
import { tasksApi, sessionsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { isPresentationModeEnabled } from "../utils/presentationMode";
import { runContrastTask } from "../tasks/contrast";
import { runMotionTask }   from "../tasks/motion";
import { runGaborTask }    from "../tasks/gabor";

const ALL_TASKS = [
  {
    key: "contrast",
    label: "Sensibilidade de Contraste",
    description: "Avalia a capacidade de detectar diferenças sutis entre tons claros e escuros, auxiliando na observação da sensibilidade visual funcional.",
    fn: runContrastTask,
  },
  {
    key: "motion",
    label: "Percepção de Movimento",
    description: "Investiga como o participante percebe direção e deslocamento visual, contribuindo para a análise do processamento de movimento.",
    fn: runMotionTask,
  },
  {
    key: "gabor",
    label: "Discriminação de Padrões Espaciais",
    description: "Observa a discriminação de padrões visuais estruturados, como orientação e frequência espacial, relacionados à organização perceptiva.",
    fn: runGaborTask,
  },
];

async function captureHardwareMeta() {
  const refreshRate = await new Promise((resolve) => {
    let last = null, samples = [], frame = 0;
    const measure = (ts) => {
      if (last !== null) samples.push(ts - last);
      last = ts; frame++;
      if (frame < 30) requestAnimationFrame(measure);
      else resolve(Math.round(1000 / (samples.reduce((a,b)=>a+b,0)/samples.length)));
    };
    requestAnimationFrame(measure);
  });
  return {
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    device_pixel_ratio: window.devicePixelRatio || 1,
    estimated_refresh_rate: refreshRate,
    browser: navigator.userAgent.split(") ")[0].split("(").pop() || "unknown",
    os: navigator.platform || "unknown",
    user_agent: navigator.userAgent,
  };
}

export default function TaskRunner() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { professional } = useAuth();

  const [phase, setPhase]             = useState("select");
  const [selected, setSelected]       = useState([]);  // preenchido pelo useEffect
  const [currentTask, setCurrentTask] = useState(0);
  const [queue, setQueue]             = useState([]);
  const [doneThisRound, setDoneThisRound] = useState([]);
  const [errorMsg, setErrorMsg]       = useState("");
  const [submitting, setSubmitting]   = useState(false);
  // Tasks já feitas em rodadas anteriores (carregadas do banco)
  const [alreadyDone, setAlreadyDone] = useState([]);
  const [loadingDone, setLoadingDone] = useState(true);
  const [presentationMode, setPresentationMode] = useState(false);
  const [expandedTaskKey, setExpandedTaskKey] = useState(null);
  const taskContainerRef = useRef(null);
  const hardwareMetaRef  = useRef(null);

  // Carrega quais tasks já foram feitas nesta sessão
  useEffect(() => {
    sessionsApi.summary(sessionId)
      .then(async (s) => {
        let session = s.session;
        const shouldEnablePresentation = Boolean(
          professional?.is_admin
          && isPresentationModeEnabled()
          && !session?.presentation_mode
          && s.tasks.length === 0
        );

        if (shouldEnablePresentation) {
          session = await sessionsApi.enablePresentation(sessionId);
        }

        setPresentationMode(Boolean(session?.presentation_mode));
        const done = s.tasks.map((t) => t.task_name);
        setAlreadyDone(done);
        // Pré-seleciona apenas as que faltam
        const remaining = ALL_TASKS.filter((t) => !done.includes(t.key)).map((t) => t.key);
        setSelected(remaining.length > 0 ? remaining : []);
      })
      .catch(() => {})
      .finally(() => setLoadingDone(false));
  }, [sessionId, professional?.is_admin]);

  const toggleTask = (key) => {
    // Não permite desmarcar tasks já feitas
    if (alreadyDone.includes(key)) return;
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const moveTask = (key, direction) => {
    setSelected((prev) => {
      const index = prev.indexOf(key);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const startTasks = () => {
    // Filtra selected removendo qualquer task já concluída (proteção extra)
    const q = selected
      .map((key) => ALL_TASKS.find((t) => t.key === key))
      .filter((t) => t && !alreadyDone.includes(t.key));
    if (q.length === 0) return;
    setQueue(q);
    setDoneThisRound([]);
    setPhase("running");
  };

  const runTasksWhenReady = async () => {
    try {
      hardwareMetaRef.current = await captureHardwareMeta();
      const nowDone = [...alreadyDone];

      for (let i = 0; i < queue.length; i++) {
        setCurrentTask(i);
        const task = queue[i];

        // Pula se já foi feita nesta sessão (evita erro 409)
        if (nowDone.includes(task.key)) {
          setDoneThisRound((prev) => [...prev, task.key]);
          continue;
        }

        const result = await task.fn(taskContainerRef.current, {
          presentationMode,
        });
        setSubmitting(true);
        try {
          await tasksApi.submit(sessionId, {
            task_name:         task.key,
            total_trials:      result.total_trials,
            hits:              result.hits,
            errors:            result.errors,
            omissions:         result.omissions,
            mean_rt_ms:        result.mean_rt_ms,
            raw_trials:        result.raw_trials,
            hardware_metadata: hardwareMetaRef.current,
          });
          nowDone.push(task.key);
          setDoneThisRound((prev) => [...prev, task.key]);
        } catch (err) {
          // 409 = já submetida — ignora e continua
          if (err.response?.status === 409) {
            nowDone.push(task.key);
            setDoneThisRound((prev) => [...prev, task.key]);
          } else {
            throw err;
          }
        } finally {
          setSubmitting(false);
        }
      }

      // Só marca sessão como concluída se as 3 tasks foram feitas
      const allThreeDone = ALL_TASKS.every((t) => nowDone.includes(t.key));
      if (allThreeDone) {
        await sessionsApi.complete(sessionId);
      }

      setAlreadyDone(nowDone);
      navigate(`/sessions/${sessionId}/results`);
    } catch (err) {
      setErrorMsg(err.message || "Erro durante a execução das tarefas");
      setPhase("error");
    }
  };

  useEffect(() => {
    if (phase === "running" && taskContainerRef.current && queue.length > 0) {
      runTasksWhenReady();
    }
  }, [phase, taskContainerRef.current, queue]);

  const allThreeDone = ALL_TASKS.every((t) => alreadyDone.includes(t.key));
  const visibleTasks = [
    ...selected,
    ...ALL_TASKS.map((t) => t.key).filter((key) => !selected.includes(key) && !alreadyDone.includes(key)),
    ...ALL_TASKS.map((t) => t.key).filter((key) => alreadyDone.includes(key)),
  ]
    .map((key) => ALL_TASKS.find((t) => t.key === key))
    .filter(Boolean);

  // ---- SELEÇÃO ----
  if (phase === "select") {
    if (loadingDone) return (
      <div className="page"><Navbar />
        <main className="container mt-4" style={{ maxWidth: 600 }}>
          <p className="text-muted text-small text-center">Carregando sessão...</p>
        </main>
        <SiteFooter />
      </div>
    );

    return (
      <div className="page">
        <Navbar />
        <main className="container mt-4" style={{ maxWidth: 600 }}>
          <FlowSteps
            sessionId={sessionId}
            current={allThreeDone ? "resultados" : "tarefas"}
            completed={["triagem", "recomendacoes", ...(allThreeDone ? ["tarefas"] : [])]}
          />

          <div className="card task-selection-card">
            <div className="section-card-header section-card-header--tight">
              <h2>Tarefa de Sensibilidade Visual</h2>
            </div>

            {!allThreeDone && (
              <div className="task-attention">
                <span className="task-attention__label">Atenção</span>
                <span>Mantenha esta aba aberta até concluir as tarefas</span>
              </div>
            )}

            <div className="task-order-list">
              {visibleTasks.map((t) => {
                const done = alreadyDone.includes(t.key);
                const on   = selected.includes(t.key) || done;
                const order = selected.indexOf(t.key);
                return (
                  <div
                    key={t.key}
                    className={`task-order-card ${on ? "is-selected" : ""} ${done ? "is-done" : ""}`}
                    onClick={() => setExpandedTaskKey((current) => current === t.key ? null : t.key)}
                  >
                    <button
                      type="button"
                      className={`task-order-card__select ${on ? "is-on" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleTask(t.key);
                      }}
                      disabled={done}
                      aria-label={on ? `Desmarcar ${t.label}` : `Selecionar ${t.label}`}
                    >
                      {on ? (done ? "✓" : order + 1) : ""}
                    </button>
                    <div className="task-order-card__content">
                      <span className="task-order-card__title">{t.label}</span>
                      {done && <span className="task-order-card__meta">Concluída</span>}
                      {expandedTaskKey === t.key && (
                        <p className="task-order-card__description">{t.description}</p>
                      )}
                    </div>
                    {on && !done && (
                      <div className="task-order-card__actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="task-order-card__move"
                          onClick={() => moveTask(t.key, -1)}
                          disabled={order <= 0}
                          aria-label={`Mover ${t.label} para cima`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="task-order-card__move"
                          onClick={() => moveTask(t.key, 1)}
                          disabled={order === selected.length - 1}
                          aria-label={`Mover ${t.label} para baixo`}
                        >
                          ↓
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
          {allThreeDone ? (
            <div className="flow-action-row flow-action-row--split">
              <button
                type="button"
                className="flow-secondary-button"
                onClick={() => navigate(`/sessions/${sessionId}/checklist?etapa=recomendacoes`)}
              >
                Voltar
              </button>
              <button className="flow-next-button flow-next-button--compact"
                onClick={() => navigate(`/sessions/${sessionId}/results`)}>
                Ver resultados
              </button>
            </div>
          ) : (
            <div className="flow-action-row flow-action-row--split">
              <button
                type="button"
                className="flow-secondary-button"
                onClick={() => navigate(`/sessions/${sessionId}/checklist?etapa=recomendacoes`)}
              >
                Voltar
              </button>
              <button
                className="flow-next-button flow-next-button--compact"
                onClick={startTasks}
                disabled={selected.length === 0}
              >
                Iniciar
              </button>
            </div>
          )}
        </main>
        <SiteFooter />
      </div>
    );
  }

  // ---- RUNNING ----
  if (phase === "running") {
    return (
      <div style={{
        position: "fixed", inset: 0,
        display: "flex", flexDirection: "column",
        background: "#000", zIndex: 9999,
      }}>
        <div style={{
          height: 36, background: "#111",
          borderBottom: "1px solid #222",
          display: "flex", alignItems: "center",
          padding: "0 1.5rem", gap: "1rem", flexShrink: 0,
        }}>
          <span style={{ fontSize: "0.8rem", color: "#888", flexShrink: 0 }}>
            Tarefa {currentTask + 1} de {queue.length}:{" "}
            <strong style={{ color: "#ccc" }}>{queue[currentTask]?.label}</strong>
          </span>
          <div style={{ flex: 1, height: 3, background: "#333", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(doneThisRound.length / queue.length) * 100}%`,
              background: "#2563A8", transition: "width 0.4s ease",
            }} />
          </div>
          {submitting && <span style={{ fontSize: "0.7rem", color: "#555" }}>Salvando...</span>}
        </div>
        <div
          ref={taskContainerRef}
          style={{ flex: 1, background: "#000", position: "relative", overflow: "hidden" }}
        />
      </div>
    );
  }

  // ---- ERROR ----
  return (
    <div className="page">
      <Navbar />
      <main className="container mt-4" style={{ maxWidth: 480 }}>
        <div className="card">
          <h2 className="mb-1" style={{ color: "var(--c-red-500)" }}>Erro nas tarefas</h2>
          <p className="text-muted text-small mb-3">{errorMsg}</p>
        </div>
          <div className="flow-action-row flow-action-row--split task-error-actions">
            <button className="flow-secondary-button" onClick={() => navigate("/")}>Voltar ao início</button>
            <button className="flow-next-button" onClick={() => {
              setPhase("select"); setDoneThisRound([]); setCurrentTask(0); setQueue([]);
            }}>Tentar novamente</button>
          </div>
      </main>
      <SiteFooter />
    </div>
  );
}
