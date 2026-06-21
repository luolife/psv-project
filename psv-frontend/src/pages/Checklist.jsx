// frontend/src/pages/Checklist.jsx
// Substituído pelo fluxo: Triagem Visual → Recomendações Mínimas → Tarefas
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { checklistApi, sessionsApi } from "../api/client";

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------
function Stepper({ phase }) {
  // phase: "screening" | "recommendations" | "done"
  const steps = [
    { label: "Cadastro",        done: true  },
    { label: "Triagem Visual",  done: phase === "recommendations" || phase === "done", active: phase === "screening" },
    { label: "Recomendações",   done: phase === "done", active: phase === "recommendations" },
    { label: "Tarefas",         done: false, active: false },
    { label: "Resultados",      done: false, active: false },
  ];

  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <div key={s.label} className="stepper__step">
          <div className={`stepper__dot ${
            s.done   ? "stepper__dot--done"    :
            s.active ? "stepper__dot--active"  : "stepper__dot--pending"
          }`}>
            {s.done ? "✓" : i + 1}
          </div>
          <span className="stepper__label">{s.label}</span>
          {i < steps.length - 1 && (
            <div className={`stepper__line ${s.done ? "stepper__line--done" : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dados — Triagem Visual
// ---------------------------------------------------------------------------
const CORRECTION_TYPES = [
  "Miopia", "Hipermetropia", "Astigmatismo", "Presbiopia",
  "Não sabe informar", "Não se aplica", "Outro",
];

const CURRENT_CONDITIONS = [
  "Dor de cabeça", "Tontura", "Náusea", "Fadiga visual",
  "Desconforto significativo", "Sonolência", "Agitação importante", "Nenhuma", "Outro",
];

const YNI = [
  { value: "sim",             label: "Sim"              },
  { value: "nao",             label: "Não"              },
  { value: "nao_informado",   label: "Não sabe informar" },
];

const YNNA = [
  { value: "sim",             label: "Sim"              },
  { value: "nao",             label: "Não"              },
  { value: "nao_se_aplica",   label: "Não se aplica"    },
];

function RadioGroup({ name, options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.375rem" }}>
      {options.map((opt) => {
        const id = `${name}_${opt.value}`;
        const checked = value === opt.value;
        return (
          <label
            key={opt.value}
            htmlFor={id}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.4rem 0.75rem",
              border: `1.5px solid ${checked ? "var(--c-blue-500)" : "var(--c-border)"}`,
              borderRadius: "var(--radius-md)",
              background: checked ? "var(--c-blue-50)" : "transparent",
              cursor: "pointer", fontSize: "0.85rem",
              color: checked ? "var(--c-blue-500)" : "var(--c-text-2)",
              transition: "all 0.12s",
            }}
          >
            <input
              type="radio" id={id} name={name} value={opt.value}
              checked={checked} onChange={() => onChange(opt.value)}
              style={{ display: "none" }}
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

function CheckGroup({ name, options, values, onChange }) {
  const toggle = (val) => {
    const next = values.includes(val) ? values.filter((v) => v !== val) : [...values, val];
    onChange(next);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.375rem" }}>
      {options.map((opt) => {
        const checked = values.includes(opt);
        return (
          <label
            key={opt}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.4rem 0.75rem",
              border: `1.5px solid ${checked ? "var(--c-blue-500)" : "var(--c-border)"}`,
              borderRadius: "var(--radius-md)",
              background: checked ? "var(--c-blue-50)" : "transparent",
              cursor: "pointer", fontSize: "0.85rem",
              color: checked ? "var(--c-blue-500)" : "var(--c-text-2)",
              transition: "all 0.12s",
            }}
          >
            <input
              type="checkbox" checked={checked}
              onChange={() => toggle(opt)}
              style={{ display: "none" }}
            />
            {opt}
          </label>
        );
      })}
    </div>
  );
}

function SectionTitle({ n, children }) {
  return (
    <div style={{
      display: "flex", gap: "0.625rem", alignItems: "flex-start",
      paddingBottom: "0.75rem", borderBottom: "1px solid var(--c-border)",
      marginBottom: "0.25rem",
    }}>
      <span style={{
        flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
        background: "var(--c-blue-500)", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.75rem", fontWeight: 700, marginTop: 1,
      }}>{n}</span>
      <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--c-text-1)", lineHeight: 1.4 }}>
        {children}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Triagem Visual
// ---------------------------------------------------------------------------
function VisualScreening({ onNext }) {
  const [data, setData] = useState({
    uses_correction:         "",
    wearing_correction_now:  "",
    correction_type:         "",
    correction_type_other:   "",
    ophthalmic_followup:     "",
    ophthalmic_followup_desc:"",
    ocular_surgery:          "",
    ocular_surgery_desc:     "",
    color_blindness:         "",
    light_sensitivity:       "",
    photosensitive_epilepsy: "",
    current_conditions:      [],
    current_conditions_other:"",
    extra_notes:             "",
  });

  const set = (field, value) => setData((d) => ({ ...d, [field]: value }));

  const requiredFilled = () => {
    const r = [
      data.uses_correction,
      data.wearing_correction_now,
      data.ophthalmic_followup,
      data.ocular_surgery,
      data.color_blindness,
      data.light_sensitivity,
      data.photosensitive_epilepsy,
    ];
    return r.every((v) => v !== "");
  };

  return (
    <div className="card">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.25rem" }}>Triagem Visual</h2>
        <p className="text-muted text-small">
          Registre as condições visuais e o estado atual do participante antes da aplicação.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* 1 */}
        <div>
          <SectionTitle n={1}>
            O participante utiliza óculos de grau ou lentes de contato?
          </SectionTitle>
          <RadioGroup
            name="uses_correction"
            options={[{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }]}
            value={data.uses_correction}
            onChange={(v) => set("uses_correction", v)}
          />
        </div>

        {/* 2 */}
        <div>
          <SectionTitle n={2}>
            O participante está utilizando sua correção visual habitual neste momento?
          </SectionTitle>
          <RadioGroup
            name="wearing_correction_now"
            options={YNNA}
            value={data.wearing_correction_now}
            onChange={(v) => set("wearing_correction_now", v)}
          />
        </div>

        {/* 3 */}
        <div>
          <SectionTitle n={3}>
            Qual é o tipo de correção visual utilizada pelo participante?
          </SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.375rem" }}>
            {CORRECTION_TYPES.map((opt) => {
              const checked = data.correction_type === opt;
              return (
                <label key={opt} style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.4rem 0.75rem",
                  border: `1.5px solid ${checked ? "var(--c-blue-500)" : "var(--c-border)"}`,
                  borderRadius: "var(--radius-md)",
                  background: checked ? "var(--c-blue-50)" : "transparent",
                  cursor: "pointer", fontSize: "0.85rem",
                  color: checked ? "var(--c-blue-500)" : "var(--c-text-2)",
                  transition: "all 0.12s",
                }}>
                  <input type="radio" name="correction_type" value={opt}
                    checked={checked} onChange={() => set("correction_type", opt)}
                    style={{ display: "none" }} />
                  {opt}
                </label>
              );
            })}
          </div>
          {data.correction_type === "Outro" && (
            <input
              className="form-input" style={{ marginTop: "0.625rem" }}
              placeholder="Descreva"
              value={data.correction_type_other}
              onChange={(e) => set("correction_type_other", e.target.value)}
            />
          )}
        </div>

        {/* 4 */}
        <div>
          <SectionTitle n={4}>
            O participante possui diagnóstico ou acompanhamento oftalmológico atual?
          </SectionTitle>
          <RadioGroup name="ophthalmic_followup" options={YNI}
            value={data.ophthalmic_followup}
            onChange={(v) => set("ophthalmic_followup", v)} />
          {data.ophthalmic_followup === "sim" && (
            <input className="form-input" style={{ marginTop: "0.625rem" }}
              placeholder="Descreva"
              value={data.ophthalmic_followup_desc}
              onChange={(e) => set("ophthalmic_followup_desc", e.target.value)} />
          )}
        </div>

        {/* 5 */}
        <div>
          <SectionTitle n={5}>
            O participante possui histórico de cirurgia ocular ou procedimento oftalmológico relevante?
          </SectionTitle>
          <RadioGroup name="ocular_surgery" options={YNI}
            value={data.ocular_surgery}
            onChange={(v) => set("ocular_surgery", v)} />
          {data.ocular_surgery === "sim" && (
            <input className="form-input" style={{ marginTop: "0.625rem" }}
              placeholder="Descreva"
              value={data.ocular_surgery_desc}
              onChange={(e) => set("ocular_surgery_desc", e.target.value)} />
          )}
        </div>

        {/* 6 */}
        <div>
          <SectionTitle n={6}>
            O participante apresenta daltonismo ou dificuldade conhecida para diferenciar cores?
          </SectionTitle>
          <RadioGroup name="color_blindness" options={YNI}
            value={data.color_blindness}
            onChange={(v) => set("color_blindness", v)} />
        </div>

        {/* 7 */}
        <div>
          <SectionTitle n={7}>
            O participante apresenta sensibilidade importante à luz, reflexos ou ambientes muito iluminados?
          </SectionTitle>
          <RadioGroup name="light_sensitivity" options={YNI}
            value={data.light_sensitivity}
            onChange={(v) => set("light_sensitivity", v)} />
        </div>

        {/* 8 */}
        <div>
          <SectionTitle n={8}>
            O participante possui histórico de epilepsia fotossensível, crise desencadeada por luzes ou desconforto importante com luzes/padrões visuais?
          </SectionTitle>
          <RadioGroup name="photosensitive_epilepsy" options={YNI}
            value={data.photosensitive_epilepsy}
            onChange={(v) => set("photosensitive_epilepsy", v)} />
        </div>

        {/* 9 */}
        <div>
          <SectionTitle n={9}>
            No momento da aplicação, o participante apresenta alguma condição que possa interferir na realização das tarefas?
          </SectionTitle>
          <CheckGroup
            name="current_conditions"
            options={CURRENT_CONDITIONS}
            values={data.current_conditions}
            onChange={(v) => set("current_conditions", v)}
          />
          {data.current_conditions.includes("Outro") && (
            <input className="form-input" style={{ marginTop: "0.625rem" }}
              placeholder="Descreva"
              value={data.current_conditions_other}
              onChange={(e) => set("current_conditions_other", e.target.value)} />
          )}
        </div>

        {/* 10 */}
        <div>
          <SectionTitle n={10}>
            Há alguma observação relevante sobre o estado visual ou comportamental do participante antes da aplicação?
          </SectionTitle>
          <textarea
            className="form-input" rows={3} style={{ marginTop: "0.375rem", resize: "vertical" }}
            value={data.extra_notes}
            onChange={(e) => set("extra_notes", e.target.value)}
          />
        </div>

      </div>

      <div className="flex gap-1" style={{ marginTop: "2rem" }}>
        <button
          className="btn btn--primary"
          style={{ flex: 1 }}
          onClick={() => onNext(data)}
          disabled={!requiredFilled()}
        >
          Continuar para as Recomendações →
        </button>
      </div>
      {!requiredFilled() && (
        <p className="text-muted text-small" style={{ marginTop: "0.5rem", textAlign: "center" }}>
          Responda as perguntas obrigatórias (1–8) para continuar.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recomendações Mínimas
// ---------------------------------------------------------------------------
const MIN_RECOMMENDATIONS = [
  "Local silencioso, com iluminação estável e sem reflexos diretos na tela.",
  "Computador ou notebook em tela cheia, com brilho fixo e notificações desativadas.",
  "Tela sem modo noturno, filtro de luz azul, brilho automático ou economia de energia.",
  "Participante sentado de frente para a tela, a aproximadamente 50–60 cm de distância.",
  "Uso da correção visual habitual, quando necessário, como óculos ou lentes de contato.",
  "Não iniciar a aplicação em caso de dor de cabeça intensa, tontura, náusea, fadiga visual importante ou desconforto significativo.",
  "Interromper a aplicação se houver desconforto visual, mal-estar ou solicitação do participante.",
];

function MinRecommendations({ onConfirm, loading }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="card">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.25rem" }}>Recomendações Mínimas para Aplicação</h2>
        <p className="text-muted text-small">
          Confirme se as condições abaixo foram verificadas antes de iniciar as tarefas visuais.
        </p>
      </div>

      <div style={{
        border: "1px solid var(--c-border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        marginBottom: "1.5rem",
      }}>
        {MIN_RECOMMENDATIONS.map((rec, i) => (
          <div key={i} style={{
            display: "flex", gap: "0.75rem", alignItems: "flex-start",
            padding: "0.875rem 1rem",
            borderBottom: i < MIN_RECOMMENDATIONS.length - 1 ? "1px solid var(--c-border)" : "none",
          }}>
            <span style={{
              flexShrink: 0, color: "var(--c-teal-500)", fontWeight: 700, marginTop: 1,
            }}>✓</span>
            <span style={{ fontSize: "0.9rem", color: "var(--c-text-1)", lineHeight: 1.5 }}>
              {rec}
            </span>
          </div>
        ))}
      </div>

      <label style={{
        display: "flex", alignItems: "flex-start", gap: "0.75rem",
        padding: "1rem",
        border: `1.5px solid ${confirmed ? "var(--c-blue-500)" : "var(--c-border)"}`,
        borderRadius: "var(--radius-md)",
        background: confirmed ? "var(--c-blue-50)" : "transparent",
        cursor: "pointer",
        marginBottom: "1.5rem",
        transition: "all 0.15s",
      }}>
        <input
          type="checkbox" checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          style={{ marginTop: 3, flexShrink: 0, accentColor: "var(--c-blue-500)", width: 16, height: 16 }}
        />
        <span style={{ fontSize: "0.9rem", color: "var(--c-text-1)", lineHeight: 1.5 }}>
          Confirmo que as recomendações mínimas foram verificadas.
        </span>
      </label>

      <button
        className="btn btn--primary btn--full btn--lg"
        onClick={onConfirm}
        disabled={!confirmed || loading}
      >
        {loading ? "Registrando..." : "Confirmar e seguir para as tarefas →"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default function Checklist() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();
  const [phase,    setPhase]    = useState("screening");   // "screening" | "recommendations"
  const [screening, setScreening] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [checking, setChecking] = useState(true);

  // Se o checklist já foi submetido, pula direto para as tasks
  useEffect(() => {
    sessionsApi.summary(sessionId)
      .then((summary) => {
        if (summary.checklist) {
          navigate(`/sessions/${sessionId}/tasks`, { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [sessionId, navigate]);

  const handleScreeningNext = (screeningData) => {
    setScreening(screeningData);
    setPhase("recommendations");
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      // Salva a triagem como checklist (usando campo responses para compatibilidade)
      const payload = screening
        ? Object.fromEntries(Object.entries(screening).map(([k, v], i) => [i + 1, typeof v === "string" ? v : JSON.stringify(v)]))
        : { 1: "triagem_concluida" };
      await checklistApi.submit(sessionId, payload);
      navigate(`/sessions/${sessionId}/tasks`);
    } catch (err) {
      const detail = err.response?.data?.detail || "";
      if (detail.includes("já foi submetido")) {
        navigate(`/sessions/${sessionId}/tasks`);
      } else {
        setError(detail || "Erro ao registrar triagem");
        setLoading(false);
      }
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

  return (
    <div className="page">
      <Navbar />
      <main className="container mt-4" style={{ maxWidth: 680 }}>
        <Stepper phase={phase} />
        {error && (
          <p className="form-error" style={{ marginBottom: "1rem" }}>{error}</p>
        )}
        {phase === "screening" ? (
          <VisualScreening onNext={handleScreeningNext} />
        ) : (
          <MinRecommendations onConfirm={handleConfirm} loading={loading} />
        )}
      </main>
    </div>
  );
}
