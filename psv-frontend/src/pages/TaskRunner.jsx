import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { tasksApi, sessionsApi } from "../api/client";
import { runContrastTask } from "../tasks/contrast";
import { runMotionTask }   from "../tasks/motion";
import { runGaborTask }    from "../tasks/gabor";

const ALL_TASKS = [
  { key: "contrast", label: "Sensibilidade ao Contraste", fn: runContrastTask },
  { key: "motion",   label: "Percepção de Movimento",     fn: runMotionTask   },
  { key: "gabor",    label: "Discriminação de Padrões",   fn: runGaborTask    },
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
  const taskContainerRef = useRef(null);
  const hardwareMetaRef  = useRef(null);

  // Carrega quais tasks já foram feitas nesta sessão
  useEffect(() => {
    sessionsApi.summary(sessionId)
      .then((s) => {
        const done = s.tasks.map((t) => t.task_name);
        setAlreadyDone(done);
        // Pré-seleciona apenas as que faltam
        const remaining = ALL_TASKS.filter((t) => !done.includes(t.key)).map((t) => t.key);
        setSelected(remaining.length > 0 ? remaining : []);
      })
      .catch(() => {})
      .finally(() => setLoadingDone(false));
  }, [sessionId]);

  const toggleTask = (key) => {
    // Não permite desmarcar tasks já feitas
    if (alreadyDone.includes(key)) return;
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const startTasks = () => {
    // Filtra selected removendo qualquer task já concluída (proteção extra)
    const q = ALL_TASKS.filter((t) => selected.includes(t.key) && !alreadyDone.includes(t.key));
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

        const result = await task.fn(taskContainerRef.current);
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
      setPhase("done");
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
  const remaining    = ALL_TASKS.filter((t) => !alreadyDone.includes(t.key));

  // ---- SELEÇÃO ----
  if (phase === "select") {
    if (loadingDone) return (
      <div className="page"><Navbar />
        <main className="container mt-4" style={{ maxWidth: 600 }}>
          <p className="text-muted text-small text-center">Carregando sessão...</p>
        </main>
      </div>
    );

    return (
      <div className="page">
        <Navbar />
        <main className="container mt-4" style={{ maxWidth: 600 }}>
          <div className="stepper">
            {[
              { n: "✓", label: "Cadastro",   cls: "stepper__dot--done"   },
              { n: "✓", label: "Check-list", cls: "stepper__dot--done"   },
              { n: allThreeDone ? "✓" : 3, label: "Tarefas", cls: allThreeDone ? "stepper__dot--done" : "stepper__dot--active" },
              { n: 4,   label: "Resultados", cls: allThreeDone ? "stepper__dot--active" : "stepper__dot--pending"},
            ].map((s, i, arr) => (
              <div key={i} className="stepper__step">
                <div className={`stepper__dot ${s.cls}`}>{s.n}</div>
                <span className="stepper__label">{s.label}</span>
                {i < arr.length - 1 && (
                  <div className={`stepper__line ${i < 2 || (i === 2 && allThreeDone) ? "stepper__line--done" : ""}`} />
                )}
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="mb-1">Tarefas computadorizadas</h2>
            <p className="text-muted text-small mb-3">
              {allThreeDone
                ? "Todas as tarefas foram concluídas nesta sessão."
                : remaining.length < 3
                  ? `${remaining.length} tarefa(s) pendente(s). Selecione quais aplicar agora.`
                  : "Selecione quais tarefas aplicar nesta sessão."
              }
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {ALL_TASKS.map((t, i) => {
                const done = alreadyDone.includes(t.key);
                const on   = selected.includes(t.key) || done;
                return (
                  <div
                    key={t.key}
                    onClick={() => toggleTask(t.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.875rem",
                      padding: "0.875rem 1rem",
                      border: `1.5px solid ${done ? "var(--c-teal-500)" : on ? "var(--c-blue-500)" : "var(--c-border)"}`,
                      borderRadius: "var(--radius-md)",
                      background: done ? "var(--c-teal-50)" : on ? "var(--c-blue-50)" : "transparent",
                      cursor: done ? "default" : "pointer",
                      opacity: done ? 0.8 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${done ? "var(--c-teal-500)" : on ? "var(--c-blue-500)" : "var(--c-border-md)"}`,
                      background: done ? "var(--c-teal-500)" : on ? "var(--c-blue-500)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {on && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: on ? 500 : 400 }}>{t.label}</span>
                      {done && <span className="text-small text-muted" style={{ marginLeft: "0.5rem" }}>— concluída</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {allThreeDone ? (
              <button className="btn btn--primary btn--full btn--lg"
                onClick={() => navigate(`/sessions/${sessionId}/results`)}>
                Ver resultados →
              </button>
            ) : (
              <>
                {selected.length === 0 && (
                  <p className="form-error mb-2">Selecione ao menos uma tarefa.</p>
                )}
                <div style={{
                  padding: "0.75rem 1rem", background: "var(--c-amber-100)",
                  borderRadius: "var(--radius-md)", marginBottom: "1.5rem",
                  fontSize: "0.85rem", color: "var(--c-amber-500)",
                }}>
                  <strong>Atenção:</strong> não feche esta aba durante as tarefas.
                </div>
                <button
                  className="btn btn--primary btn--full btn--lg"
                  onClick={startTasks}
                  disabled={selected.length === 0}
                >
                  {(() => {
                const count = selected.filter(k => !alreadyDone.includes(k)).length;
                return `Iniciar ${count} tarefa${count !== 1 ? "s" : ""}`;
              })()}
                </button>
              </>
            )}
          </div>
        </main>
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

  // ---- DONE ----
  if (phase === "done") {
    const allNowDone = ALL_TASKS.every((t) => alreadyDone.includes(t.key));
    return (
      <div className="page">
        <Navbar />
        <main className="container mt-4" style={{ maxWidth: 480, textAlign: "center" }}>
          <div className="card">
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
              {allNowDone ? "✓" : "⏳"}
            </div>
            <h2 className="mb-1">
              {allNowDone ? "Avaliação concluída!" : "Tarefas parcialmente concluídas"}
            </h2>
            <p className="text-muted text-small mb-3">
              {allNowDone
                ? "Todas as tarefas foram realizadas. Os dados foram salvos."
                : `${ALL_TASKS.filter(t => !alreadyDone.includes(t.key)).length} tarefa(s) ainda pendente(s). Você pode aplicá-las agora ou em outro momento.`
              }
            </p>
            <div className="flex gap-1">
              {!allNowDone && (
                <button className="btn btn--outline" style={{ flex: 1 }}
                  onClick={() => { setPhase("select"); setQueue([]); }}>
                  Aplicar restantes
                </button>
              )}
              <button
                className={`btn btn--primary ${allNowDone ? "btn--full" : ""}`}
                style={{ flex: 1 }}
                onClick={() => navigate(`/sessions/${sessionId}/results`)}
              >
                {allNowDone ? "Ver resultados →" : "Ver parcial →"}
              </button>
            </div>
          </div>
        </main>
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
          <div className="flex gap-1">
            <button className="btn btn--ghost" onClick={() => navigate("/")}>Voltar ao início</button>
            <button className="btn btn--primary" onClick={() => {
              setPhase("select"); setDoneThisRound([]); setCurrentTask(0); setQueue([]);
            }}>Tentar novamente</button>
          </div>
        </div>
      </main>
    </div>
  );
}
