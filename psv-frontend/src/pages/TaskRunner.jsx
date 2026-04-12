import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { tasksApi, sessionsApi } from "../api/client";
import { runContrastTask } from "../tasks/contrast";
import { runMotionTask }   from "../tasks/motion";
import { runGaborTask }    from "../tasks/gabor";

const TASKS = [
  { key: "contrast", label: "Sensibilidade ao Contraste",  fn: runContrastTask },
  { key: "motion",   label: "Percepção de Movimento",      fn: runMotionTask   },
  { key: "gabor",    label: "Discriminação de Padrões",    fn: runGaborTask    },
];

async function captureHardwareMeta() {
  const refreshRate = await new Promise((resolve) => {
    let last = null;
    let samples = [];
    let frame = 0;
    const measure = (ts) => {
      if (last !== null) samples.push(ts - last);
      last = ts;
      frame++;
      if (frame < 30) requestAnimationFrame(measure);
      else {
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        resolve(Math.round(1000 / avg));
      }
    };
    requestAnimationFrame(measure);
  });
  return {
    screen_width:           window.screen.width,
    screen_height:          window.screen.height,
    device_pixel_ratio:     window.devicePixelRatio || 1,
    estimated_refresh_rate: refreshRate,
    browser:    navigator.userAgent.split(") ")[0].split("(").pop() || "unknown",
    os:         navigator.platform || "unknown",
    user_agent: navigator.userAgent,
  };
}

export default function TaskRunner() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase]             = useState("intro");
  const [currentTask, setCurrentTask] = useState(0);
  const [completed, setCompleted]     = useState([]);
  const [errorMsg, setErrorMsg]       = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const taskContainerRef = useRef(null);
  const hardwareMetaRef  = useRef(null);

  const runAllTasks = () => {
    setPhase("running");
    // runTasksWhenReady vai disparar via useEffect quando o container estiver no DOM
  };

  const runTasksWhenReady = async () => {
    try {
      hardwareMetaRef.current = await captureHardwareMeta();
      for (let i = 0; i < TASKS.length; i++) {
        setCurrentTask(i);
        const task = TASKS[i];
        const result = await task.fn(taskContainerRef.current);
        setSubmitting(true);
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
        setSubmitting(false);
        setCompleted((prev) => [...prev, task.key]);
      }
      await sessionsApi.complete(sessionId);
      setPhase("done");
    } catch (err) {
      setErrorMsg(err.message || "Erro durante a execução das tarefas");
      setPhase("error");
    }
  };

  // Dispara as tasks só quando o container estiver montado no DOM
  useEffect(() => {
    if (phase === "running" && taskContainerRef.current) {
      runTasksWhenReady();
    }
  }, [phase, taskContainerRef.current]);

  // Fase de INTRO — com navbar normal
  if (phase === "intro") {
    return (
      <div className="page">
        <Navbar />
        <main className="container mt-4" style={{ maxWidth: 600 }}>
          <div className="stepper">
            {[
              { n: "✓", label: "Cadastro",    cls: "stepper__dot--done"    },
              { n: "✓", label: "Check-list",  cls: "stepper__dot--done"    },
              { n: 3,   label: "Tarefas",     cls: "stepper__dot--active"  },
              { n: 4,   label: "Resultados",  cls: "stepper__dot--pending" },
            ].map((s, i, arr) => (
              <div key={i} className="stepper__step">
                <div className={`stepper__dot ${s.cls}`}>{s.n}</div>
                <span className="stepper__label">{s.label}</span>
                {i < arr.length - 1 && <div className={`stepper__line ${i < 2 ? "stepper__line--done" : ""}`} />}
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="mb-1">Tarefas computadorizadas</h2>
            <p className="text-muted text-small mb-3">
              O participante realizará 3 tarefas visuais em sequência. Certifique-se de que o ambiente está adequado antes de iniciar.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {TASKS.map((t, i) => (
                <div key={t.key} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  border: "1px solid var(--c-border)", borderRadius: "var(--radius-md)",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "var(--c-blue-100)", color: "var(--c-blue-700)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.8rem", fontWeight: 600, flexShrink: 0,
                  }}>{i + 1}</div>
                  <span style={{ fontSize: "0.9rem" }}>{t.label}</span>
                </div>
              ))}
            </div>
            <div style={{
              padding: "0.75rem 1rem", background: "var(--c-amber-100)",
              borderRadius: "var(--radius-md)", marginBottom: "1.5rem",
            }}>
              <p style={{ fontSize: "0.85rem", color: "var(--c-amber-500)" }}>
                <strong>Atenção:</strong> não feche esta aba durante as tarefas.
              </p>
            </div>
            <button className="btn btn--primary btn--full btn--lg" onClick={runAllTasks}>
              Iniciar tarefas
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Fase RUNNING — fullscreen sem navbar
  if (phase === "running") {
    return (
      <div style={{
        position: "fixed", inset: 0,
        display: "flex", flexDirection: "column",
        background: "#000", zIndex: 9999,
      }}>
        {/* Barra de progresso fina no topo */}
        <div style={{
          height: 36, background: "#111",
          borderBottom: "1px solid #222",
          display: "flex", alignItems: "center",
          padding: "0 1.5rem", gap: "1rem", flexShrink: 0,
        }}>
          <span style={{ fontSize: "0.8rem", color: "#888", flexShrink: 0 }}>
            Tarefa {currentTask + 1} de {TASKS.length}:{" "}
            <strong style={{ color: "#ccc" }}>{TASKS[currentTask]?.label}</strong>
          </span>
          <div style={{ flex: 1, height: 3, background: "#333", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(completed.length / TASKS.length) * 100}%`,
              background: "#2563A8",
              transition: "width 0.4s ease",
            }} />
          </div>
          {submitting && <span style={{ fontSize: "0.7rem", color: "#555" }}>Salvando...</span>}
        </div>

        {/* Container fullscreen das tasks */}
        <div
          ref={taskContainerRef}
          style={{ flex: 1, background: "#000", position: "relative", overflow: "hidden" }}
        />
      </div>
    );
  }

  // Fase DONE
  if (phase === "done") {
    return (
      <div className="page">
        <Navbar />
        <main className="container mt-4" style={{ maxWidth: 480, textAlign: "center" }}>
          <div className="card">
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✓</div>
            <h2 className="mb-1">Avaliação concluída!</h2>
            <p className="text-muted text-small mb-3">
              Todas as tarefas foram realizadas e os dados foram salvos.
            </p>
            <button className="btn btn--primary btn--full btn--lg"
              onClick={() => navigate(`/sessions/${sessionId}/results`)}>
              Ver resultados →
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Fase ERROR
  return (
    <div className="page">
      <Navbar />
      <main className="container mt-4" style={{ maxWidth: 480 }}>
        <div className="card">
          <h2 className="mb-1" style={{ color: "var(--c-red-500)" }}>Erro nas tarefas</h2>
          <p className="text-muted text-small mb-3">{errorMsg}</p>
          <div className="flex gap-1">
            <button className="btn btn--ghost" onClick={() => navigate("/")}>Voltar ao início</button>
            <button className="btn btn--primary" onClick={() => {
              setPhase("intro"); setCompleted([]); setCurrentTask(0);
            }}>Tentar novamente</button>
          </div>
        </div>
      </main>
    </div>
  );
}
