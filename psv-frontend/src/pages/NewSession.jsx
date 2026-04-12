// frontend/src/pages/NewSession.jsx
//
// Fluxo corrigido:
//   1. Carrega lista de participantes do profissional
//   2. Profissional escolhe: selecionar existente OU cadastrar novo
//   3. Em ambos os casos, abre sessão com o participant_id e navega para checklist

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { participantsApi, sessionsApi } from "../api/client";

const SEX_LABELS = { M: "Masculino", F: "Feminino", O: "Outro" };

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------
function Stepper() {
  return (
    <div className="stepper">
      {[
        { n: 1, label: "Participante", active: true  },
        { n: 2, label: "Check-list",   active: false },
        { n: 3, label: "Tarefas",      active: false },
        { n: 4, label: "Resultados",   active: false },
      ].map((s, i, arr) => (
        <div key={s.n} className="stepper__step">
          <div className={`stepper__dot ${s.active ? "stepper__dot--active" : "stepper__dot--pending"}`}>
            {s.n}
          </div>
          <span className="stepper__label">{s.label}</span>
          {i < arr.length - 1 && <div className="stepper__line" />}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel A: lista de participantes existentes
// ---------------------------------------------------------------------------
function SelectParticipant({ participants, onSelect, onNew }) {
  const [search, setSearch] = useState("");

  const filtered = participants.filter((p) =>
    p.initials.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="card">
      <h2 className="mb-1">Selecionar participante</h2>
      <p className="text-muted text-small mb-2">
        Escolha um participante já cadastrado ou crie um novo.
      </p>

      <div className="form-group mb-2">
        <input
          className="form-input"
          placeholder="Buscar por iniciais..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted text-small" style={{ marginBottom: "1rem" }}>
          {search ? `Nenhum resultado para "${search}".` : "Nenhum participante cadastrado ainda."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          {filtered.map((p) => (
            <li
              key={p.id}
              onClick={() => onSelect(p)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--c-border)", cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--c-blue-500)";
                e.currentTarget.style.background  = "var(--c-blue-50)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--c-border)";
                e.currentTarget.style.background  = "transparent";
              }}
            >
              <div>
                <span style={{ fontWeight: 500 }}>{p.initials}</span>
                <span className="text-muted text-small" style={{ marginLeft: "0.75rem" }}>
                  {p.age} anos · {SEX_LABELS[p.sex] || p.sex}
                </span>
                {p.notes && (
                  <span className="text-muted text-small" style={{ marginLeft: "0.5rem" }}>
                    · {p.notes.slice(0, 40)}{p.notes.length > 40 ? "…" : ""}
                  </span>
                )}
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--c-blue-500)", fontWeight: 500 }}>
                Selecionar →
              </span>
            </li>
          ))}
        </ul>
      )}

      <div style={{
        borderTop: "1px solid var(--c-border)", paddingTop: "1rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span className="text-muted text-small">Participante não está na lista?</span>
        <button className="btn btn--primary btn--sm" onClick={onNew}>
          + Novo participante
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel B: confirmar participante selecionado
// ---------------------------------------------------------------------------
function ConfirmParticipant({ participant, onConfirm, onBack, loading }) {
  return (
    <div className="card">
      <h2 className="mb-1">Confirmar participante</h2>
      <p className="text-muted text-small mb-3">
        Verifique os dados antes de iniciar a avaliação.
      </p>

      <div style={{
        background: "var(--c-blue-50)", border: "1.5px solid var(--c-blue-100)",
        borderRadius: "var(--radius-md)", padding: "1.25rem",
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "0.75rem 1.5rem", marginBottom: "1.5rem",
      }}>
        <div>
          <div className="text-muted text-small">Iniciais</div>
          <div style={{ fontWeight: 500, fontSize: "1.1rem" }}>{participant.initials}</div>
        </div>
        <div>
          <div className="text-muted text-small">Idade</div>
          <div style={{ fontWeight: 500 }}>{participant.age} anos</div>
        </div>
        <div>
          <div className="text-muted text-small">Sexo</div>
          <div style={{ fontWeight: 500 }}>{SEX_LABELS[participant.sex] || participant.sex}</div>
        </div>
        <div>
          <div className="text-muted text-small">Cadastrado em</div>
          <div style={{ fontWeight: 500, fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
            {new Date(participant.created_at).toLocaleDateString("pt-BR")}
          </div>
        </div>
        {participant.notes && (
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="text-muted text-small">Observações</div>
            <div style={{ fontSize: "0.9rem" }}>{participant.notes}</div>
          </div>
        )}
      </div>

      <div className="flex gap-1">
        <button className="btn btn--ghost" onClick={onBack}>← Voltar</button>
        <button
          className="btn btn--primary" style={{ flex: 1 }}
          onClick={() => onConfirm(participant.id)} disabled={loading}
        >
          {loading ? "Abrindo sessão..." : "Iniciar avaliação →"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel C: cadastrar novo participante
// ---------------------------------------------------------------------------
function NewParticipantForm({ onCreated, onBack, loading, error }) {
  const [form, setForm] = useState({ initials: "", age: "", sex: "M", notes: "" });
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="card">
      <h2 className="mb-1">Novo participante</h2>
      <p className="text-muted text-small mb-2">
        Identificação por iniciais — nenhum dado nominal é armazenado.
      </p>

      <form
        style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}
        onSubmit={(e) => {
          e.preventDefault();
          onCreated({ ...form, age: parseInt(form.age, 10) });
        }}
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Iniciais</label>
            <input
              className="form-input" name="initials" value={form.initials}
              onChange={handle} placeholder="ex: M.S." maxLength={10} required autoFocus
            />
            <span className="form-hint">Apenas iniciais do nome</span>
          </div>
          <div className="form-group">
            <label className="form-label">Idade</label>
            <input
              className="form-input" type="number" name="age"
              value={form.age} onChange={handle} min={0} max={120} required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Sexo</label>
          <select className="form-select" name="sex" value={form.sex} onChange={handle}>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
            <option value="O">Outro</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Observações (opcional)</label>
          <textarea
            className="form-input" name="notes" value={form.notes} onChange={handle}
            rows={3} placeholder="Informações relevantes para a avaliação..."
            style={{ resize: "vertical" }}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="flex gap-1" style={{ marginTop: "0.5rem" }}>
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            ← Voltar
          </button>
          <button type="submit" className="btn btn--primary" disabled={loading} style={{ flex: 1 }}>
            {loading ? "Criando sessão..." : "Cadastrar e iniciar →"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function NewSession() {
  const navigate = useNavigate();

  // "select" | "confirm" | "new"
  const [step, setStep]               = useState("select");
  const [participants, setParticipants] = useState([]);
  const [selected, setSelected]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError]             = useState("");

  useEffect(() => {
    participantsApi.list()
      .then(setParticipants)
      .finally(() => setLoadingList(false));
  }, []);

  // Abre sessão para um participant_id já existente
  const openSession = async (participantId) => {
    setLoading(true);
    setError("");
    try {
      const session = await sessionsApi.create(participantId);
      navigate(`/sessions/${session.id}/checklist`);
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao iniciar sessão");
      setLoading(false);
    }
  };

  // Cria participante novo e já abre sessão
  const createAndOpen = async (formData) => {
    setLoading(true);
    setError("");
    try {
      const participant = await participantsApi.create(formData);
      // Adiciona à lista local para o histórico do profissional
      setParticipants((prev) => [participant, ...prev]);
      await openSession(participant.id);
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao criar participante");
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <main className="container mt-4" style={{ maxWidth: 580 }}>
        <Stepper />

        {loadingList ? (
          <div className="card">
            <p className="text-muted text-small text-center">Carregando participantes...</p>
          </div>
        ) : step === "select" ? (
          <SelectParticipant
            participants={participants}
            onSelect={(p) => { setSelected(p); setStep("confirm"); }}
            onNew={() => setStep("new")}
          />
        ) : step === "confirm" ? (
          <ConfirmParticipant
            participant={selected}
            onConfirm={openSession}
            onBack={() => { setStep("select"); setSelected(null); }}
            loading={loading}
          />
        ) : (
          <NewParticipantForm
            onCreated={createAndOpen}
            onBack={() => setStep("select")}
            loading={loading}
            error={error}
          />
        )}
      </main>
    </div>
  );
}
