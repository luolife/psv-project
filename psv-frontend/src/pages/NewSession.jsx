import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { participantsApi, sessionsApi } from "../api/client";

const SEX_LABELS = { M: "Masculino", F: "Feminino", O: "Outro" };

function calcAge(birthdate) {
  if (!birthdate) return null;
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

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

function SelectParticipant({ participants, onSelect, onNew }) {
  const [search, setSearch] = useState("");
  const filtered = participants.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="card">
      <h2 className="mb-1">Selecionar participante</h2>
      <p className="text-muted text-small mb-2">
        Escolha um participante já cadastrado ou crie um novo.
      </p>
      <div className="form-group mb-2">
        <input className="form-input" placeholder="Buscar por nome..."
          value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
      </div>
      {filtered.length === 0 ? (
        <p className="text-muted text-small" style={{ marginBottom: "1rem" }}>
          {search ? `Nenhum resultado para "${search}".` : "Nenhum participante cadastrado ainda."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          {filtered.map((p) => {
            const age = calcAge(p.birthdate);
            return (
              <li key={p.id} onClick={() => onSelect(p)} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--c-border)", cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--c-blue-500)"; e.currentTarget.style.background = "var(--c-blue-50)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--c-border)"; e.currentTarget.style.background = "transparent"; }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  <span className="text-muted text-small" style={{ marginLeft: "0.75rem" }}>
                    {age !== null ? `${age} anos` : ""}
                    {p.sex ? ` · ${SEX_LABELS[p.sex] || p.sex}` : ""}
                    {p.diagnosis_cid ? ` · ${p.diagnosis_cid}` : ""}
                    {p.city ? ` · ${p.city}` : ""}
                  </span>
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--c-blue-500)", fontWeight: 500 }}>
                  Selecionar →
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div style={{ borderTop: "1px solid var(--c-border)", paddingTop: "1rem",
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="text-muted text-small">Participante não está na lista?</span>
        <button className="btn btn--primary btn--sm" onClick={onNew}>+ Novo participante</button>
      </div>
    </div>
  );
}

function ConfirmParticipant({ participant, onConfirm, onBack, loading }) {
  const age = calcAge(participant.birthdate);
  return (
    <div className="card">
      <h2 className="mb-1">Confirmar participante</h2>
      <p className="text-muted text-small mb-3">Verifique os dados antes de iniciar.</p>
      <div style={{
        background: "var(--c-blue-50)", border: "1.5px solid var(--c-blue-100)",
        borderRadius: "var(--radius-md)", padding: "1.25rem",
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "0.75rem 1.5rem", marginBottom: "1.5rem",
      }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <div className="text-muted text-small">Nome</div>
          <div style={{ fontWeight: 500, fontSize: "1.05rem" }}>{participant.name}</div>
        </div>
        <div>
          <div className="text-muted text-small">Nascimento</div>
          <div style={{ fontWeight: 500 }}>
            {participant.birthdate
              ? new Date(participant.birthdate + 'T00:00:00').toLocaleDateString("pt-BR")
              : "—"}
            {age !== null
              ? <span className="text-muted text-small" style={{ marginLeft: "0.5rem" }}>({age} anos)</span>
              : ""}
          </div>
        </div>
        <div>
          <div className="text-muted text-small">Sexo</div>
          <div style={{ fontWeight: 500 }}>{SEX_LABELS[participant.sex] || participant.sex}</div>
        </div>
        {participant.diagnosis_cid && (
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="text-muted text-small">Diagnóstico (CID)</div>
            <div style={{ fontWeight: 500 }}>{participant.diagnosis_cid}</div>
          </div>
        )}
        {(participant.city || participant.state || participant.country) && (
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="text-muted text-small">Localização</div>
            <div style={{ fontWeight: 500 }}>
              {[participant.city, participant.state, participant.country].filter(Boolean).join(" · ")}
            </div>
          </div>
        )}
        {participant.notes && (
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="text-muted text-small">Observações</div>
            <div style={{ fontSize: "0.9rem" }}>{participant.notes}</div>
          </div>
        )}
      </div>
      <div className="flex gap-1">
        <button className="btn btn--ghost" onClick={onBack}>← Voltar</button>
        <button className="btn btn--primary" style={{ flex: 1 }}
          onClick={() => onConfirm(participant.id)} disabled={loading}>
          {loading ? "Abrindo sessão..." : "Iniciar avaliação →"}
        </button>
      </div>
    </div>
  );
}

function NewParticipantForm({ onCreated, onBack, loading, error }) {
  const [form, setForm] = useState({
    name: "", birthdate: "", sex: "M",
    diagnosis_cid: "",
    city: "", state: "", country: "Brasil",
    notes: "",
  });
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const age = calcAge(form.birthdate);

  return (
    <div className="card">
      <h2 className="mb-1">Novo participante</h2>
      <form style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}
        onSubmit={(e) => { e.preventDefault(); onCreated(form); }}>

        <div className="form-group">
          <label className="form-label">Nome completo</label>
          <input className="form-input" name="name" value={form.name}
            onChange={handle} placeholder="Nome completo do participante" required autoFocus />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data de nascimento</label>
            <input className="form-input" type="date" name="birthdate"
              value={form.birthdate} onChange={handle} required />
            {age !== null && <span className="form-hint">{age} anos</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Sexo</label>
            <select className="form-select" name="sex" value={form.sex} onChange={handle}>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="O">Outro</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Diagnóstico (CID) <span className="text-muted text-small">— opcional</span></label>
          <input className="form-input" name="diagnosis_cid" value={form.diagnosis_cid}
            onChange={handle} placeholder="ex: F84.0, F90.0" />
          <span className="form-hint">CID-10 ou CID-11</span>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Cidade <span className="text-muted text-small">— opcional</span></label>
            <input className="form-input" name="city" value={form.city}
              onChange={handle} placeholder="São Paulo" />
          </div>
          <div className="form-group">
            <label className="form-label">Estado <span className="text-muted text-small">— opcional</span></label>
            <input className="form-input" name="state" value={form.state}
              onChange={handle} placeholder="SP" maxLength={50} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">País</label>
          <input className="form-input" name="country" value={form.country}
            onChange={handle} placeholder="Brasil" />
        </div>

        <div className="form-group">
          <label className="form-label">Observações <span className="text-muted text-small">— opcional</span></label>
          <textarea className="form-input" name="notes" value={form.notes}
            onChange={handle} rows={3}
            placeholder="Informações relevantes para a avaliação..."
            style={{ resize: "vertical" }} />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="flex gap-1" style={{ marginTop: "0.5rem" }}>
          <button type="button" className="btn btn--ghost" onClick={onBack}>← Voltar</button>
          <button type="submit" className="btn btn--primary" disabled={loading} style={{ flex: 1 }}>
            {loading ? "Criando sessão..." : "Cadastrar e iniciar →"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewSession() {
  const navigate = useNavigate();
  const [step, setStep]               = useState("select");
  const [participants, setParticipants] = useState([]);
  const [selected, setSelected]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError]             = useState("");

  useEffect(() => {
    participantsApi.list().then(setParticipants).finally(() => setLoadingList(false));
  }, []);

  const openSession = async (participantId) => {
    setLoading(true); setError("");
    try {
      const session = await sessionsApi.create(participantId);
      navigate(`/sessions/${session.id}/checklist`);
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao iniciar sessão");
      setLoading(false);
    }
  };

  const createAndOpen = async (formData) => {
    setLoading(true); setError("");
    try {
      const participant = await participantsApi.create(formData);
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
          <div className="card"><p className="text-muted text-small text-center">Carregando...</p></div>
        ) : step === "select" ? (
          <SelectParticipant participants={participants}
            onSelect={(p) => { setSelected(p); setStep("confirm"); }}
            onNew={() => setStep("new")} />
        ) : step === "confirm" ? (
          <ConfirmParticipant participant={selected}
            onConfirm={openSession}
            onBack={() => { setStep("select"); setSelected(null); }}
            loading={loading} />
        ) : (
          <NewParticipantForm onCreated={createAndOpen}
            onBack={() => setStep("select")}
            loading={loading} error={error} />
        )}
      </main>
    </div>
  );
}
