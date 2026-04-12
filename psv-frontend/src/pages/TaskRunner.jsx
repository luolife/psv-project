// frontend/src/pages/TaskRunner.jsx
//
// Orquestra as três tasks computadorizadas em sequência.
// Cada task é implementada em src/tasks/ como função que recebe
// um container DOM e retorna uma Promise com os resultados.
//
// A captura de hardware metadata acontece uma vez, antes das tasks.

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

// Captura metadados de hardware via browser APIs
async function captureHardwareMeta() {
  // Estima refresh rate via requestAnimationFrame
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
    screen_width:            window.screen.width,
    screen_height:           window.screen.height,
    device_pixel_ratio:      window.devicePixelRatio || 1,
    estimated_refresh_rate:  refreshRate,
    browser:    navigator.userAgent.split(") ")[0].split("(").pop() || "unknown",
    os:         navigator.platform || "unknown",
    user_agent: navigator.userAgent,
  };
}

export default function TaskRunner() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase]           = useState("intro");   // intro | running | done | error
  const [currentTask, setCurrentTask] = useState(0);
  const [completed, setCompleted]   = useState([]);
  const [errorMsg, setErrorMsg]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const taskContainerRef = useRef(null);
  const hardwareMetaRef  = useRef(null);

  const runAllTasks = async () => {
    setPhase("running");

    try {
      // Captura hardware uma vez antes de começar
      hardwareMetaRef.current = await captureHardwareMeta();

      for (let i = 0; i < TASKS.length; i++) {
        setCurrentTask(i);
        const task = TASKS[i];

        // Executa a task — retorna resultado estruturado
        const result = await task.fn(taskContainerRef.current);

        // Envia para a API imediatamente (não espera todas terminarem)
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

      // Marca sessão como concluída
      await sessionsApi.complete(sessionId);
      setPhase("done");

    } catch (err) {
      setErrorMsg(err.message || "Erro durante a execução das tarefas");
      setPhase("error");
    }
  };

  return (
    <div className="page">
      <Navbar />

      {phase === "intro" && (
        <main className="container mt-4" style={{ maxWidth: 600 }}>
          {/* Stepper */}
          <div className="stepper">
            <div className="stepper__step">
              <div className="stepper__dot stepper__dot--done">✓</div>
              <span className="stepper__label">Cadastro</span>
            </div>
            <div className="stepper__line stepper__line--done" />
            <div className="stepper__step">
              <div className="stepper__dot stepper__dot--done">✓</div>
              <span className="stepper__label">Check-list</span>
            </div>
            <div className="stepper__line stepper__line--done" />
            <div className="stepper__step">
              <div className="stepper__dot stepper__dot--active">3</div>
              <span className="stepper__label">Tarefas</span>
            </div>
            <div className="stepper__line" />
            <div className="stepper__step">
              <div className="stepper__dot stepper__dot--pending">4</div>
              <span className="stepper__label">Resultados</span>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-1">Tarefas computadorizadas</h2>
            <p className="text-muted text-small mb-3">
              O participante realizará 3 tarefas visuais em sequência.
              Certifique-se de que o ambiente está adequado antes de iniciar.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {TASKS.map((t, i) => (
                <div key={t.key} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  border: "1px solid var(--c-border)",
                  borderRadius: "var(--radius-md)",
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
              padding: "0.75rem 1rem",
              background: "var(--c-amber-100)",
              borderRadius: "var(--radius-md)",
              marginBottom: "1.5rem",
            }}>
              <p style={{ fontSize: "0.85rem", color: "var(--c-amber-500)" }}>
                <strong>Atenção:</strong> não feche esta aba durante as tarefas.
                Os dados são enviados automaticamente ao final de cada tarefa.
              </p>
            </div>

            <button className="btn btn--primary btn--full btn--lg" onClick={runAllTasks}>
              Iniciar tarefas
            </button>
          </div>
        </main>
      )}

      {phase === "running" && (
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Barra de progresso das tasks */}
          <div style={{
            padding: "1rem 1.5rem",
            background: "var(--c-surface)",
            borderBottom: "1px solid var(--c-border)",
            display: "flex", alignItems: "center", gap: "1rem",
          }}>
            <span style={{ fontSize: "0.875rem", color: "var(--c-text-2)", flexShrink: 0 }}>
              Tarefa {currentTask + 1} de {TASKS.length}:{" "}
              <strong>{TASKS[currentTask]?.label}</strong>
            </span>
            <div style={{ flex: 1, height: 4, background: "var(--c-border)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(completed.length / TASKS.length) * 100}%`,
                background: "var(--c-teal-500)",
                transition: "width 0.4s ease",
              }} />
            </div>
            {submitting && (
              <span style={{ fontSize: "0.75rem", color: "var(--c-text-4)" }}>
                Salvando...
              </span>
            )}
          </div>

          {/* Container onde as tasks renderizam */}
          <div
            ref={taskContainerRef}
            style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}
          />
        </main>
      )}

      {phase === "done" && (
        <main className="container mt-4" style={{ maxWidth: 480, textAlign: "center" }}>
          <div className="card">
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✓</div>
            <h2 className="mb-1">Avaliação concluída!</h2>
            <p className="text-muted text-small mb-3">
              Todas as tarefas foram realizadas e os dados foram salvos com sucesso.
            </p>
            <button
              className="btn btn--primary btn--full btn--lg"
              onClick={() => navigate(`/sessions/${sessionId}/results`)}
            >
              Ver resultados →
            </button>
          </div>
        </main>
      )}

      {phase === "error" && (
        <main className="container mt-4" style={{ maxWidth: 480 }}>
          <div className="card">
            <h2 className="mb-1" style={{ color: "var(--c-red-500)" }}>Erro nas tarefas</h2>
            <p className="text-muted text-small mb-3">{errorMsg}</p>
            <div className="flex gap-1">
              <button className="btn btn--ghost" onClick={() => navigate("/")}>
                Voltar ao início
              </button>
              <button className="btn btn--primary" onClick={() => {
                setPhase("intro");
                setCompleted([]);
                setCurrentTask(0);
              }}>
                Tentar novamente
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
