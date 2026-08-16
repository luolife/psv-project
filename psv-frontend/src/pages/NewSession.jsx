import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { participantsApi, sessionsApi } from "../api/client";
import { COUNTRY_OPTIONS, getCityOptions, getStateOptions } from "../data/locations";
import { isPresentationModeEnabled } from "../utils/presentationMode";
import { useAuth } from "../context/AuthContext";

const SEX_LABELS = { M: "Masculino", F: "Feminino", O: "Outro" };
const DIAGNOSIS_OPTIONS = [
  "Transtorno do Espectro Autista",
  "TDAH",
  "Deficiência Intelectual",
  "Atraso Global do Desenvolvimento",
  "Transtorno do Desenvolvimento da Coordenação",
  "Transtorno de Ansiedade",
  "Epilepsia",
  "Paralisia Cerebral",
  "Síndrome Genética",
  "Transtorno de Aprendizagem",
  "Outro",
];
function calcAge(birthdate) {
  if (!birthdate) return null;
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function joinName(firstName, lastName) {
  return [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(" ");
}

function Stepper() {
  const steps = [
    { n: 1, label: "Triagem", active: true },
    { n: 2, label: "Recomendações", active: false },
    { n: 3, label: "Tarefas", active: false },
    { n: 4, label: "Resultados", active: false },
  ];
  return (
    <div className="evaluation-preview-steps">
      {steps.map((s) => (
        <div key={s.n} className={`evaluation-preview-steps__item ${s.active ? "is-active" : ""}`}>
          <div className="evaluation-preview-steps__dot">
            {s.n}
          </div>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function SelectParticipant({ participants, onSelect, onNew, onBack }) {
  const [search, setSearch] = useState("");
  const filtered = participants.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="card participant-form-card">
      <div className="participant-form-header">
        <span aria-hidden="true" />
        <h2 className="participant-form-title">Nova Avaliação</h2>
        <span aria-hidden="true" />
      </div>
      <div className="form-group mb-2">
        <input className="form-input" placeholder="Buscar por nome..."
          value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
      </div>
      {filtered.length === 0 ? (
        <p className="text-muted text-small" style={{ marginBottom: "1rem" }}>
          {search ? `Nenhum resultado para "${search}".` : "Nenhum participante cadastrado ainda."}
        </p>
      ) : (
        <ul className="participant-select-list">
          {filtered.map((p) => {
            return (
              <li key={p.id} onClick={() => onSelect(p)} className="participant-select-card">
                <div className="participant-select-card__main">
                  <span className="participant-select-card__name">{p.name}</span>
                </div>
                <span className="participant-select-card__action">Selecionar</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
      <div className="flow-action-row flow-action-row--split">
        <button type="button" className="flow-secondary-button flow-next-button--compact" onClick={onBack}>
          Voltar
        </button>
        <button className="flow-next-button flow-next-button--compact" onClick={onNew}>Cadastro do Participante</button>
      </div>
    </>
  );
}

function ConfirmParticipant({ participant, onConfirm, onBack, loading }) {
  const age = calcAge(participant.birthdate);
  const patientDetails = [
    {
      label: "Nascimento",
      value: participant.birthdate
        ? `${new Date(participant.birthdate + "T00:00:00").toLocaleDateString("pt-BR")}${age !== null ? ` · ${age} anos` : ""}`
        : "—",
    },
    { label: "Sexo", value: SEX_LABELS[participant.sex] || participant.sex || "—" },
    participant.diagnosis_cid ? { label: "Diagnóstico", value: participant.diagnosis_cid } : null,
    participant.medication_notes ? { label: "Medicação", value: participant.medication_notes } : null,
    (participant.city || participant.state || participant.country)
      ? { label: "Localização", value: [participant.city, participant.state, participant.country].filter(Boolean).join(" · ") }
      : null,
    participant.notes ? { label: "Observações", value: participant.notes } : null,
  ].filter(Boolean);

  return (
    <>
    <div className="card participant-form-card">
      <div className="section-card-header section-card-header--compact">
        <h2>Confirmar Participante</h2>
      </div>

      <div className="participant-confirm-card">
        <div className="participant-confirm-card__name">
          <span>Nome e Sobrenome</span>
          <strong>{participant.name}</strong>
        </div>
        <div className="participant-confirm-card__grid">
          {patientDetails.map((item) => (
            <div className="participant-confirm-card__item" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

    </div>
      <div className="flow-action-row flow-action-row--split">
        <button className="flow-secondary-button" onClick={onBack}>Voltar</button>
        <button className="flow-next-button"
          onClick={() => onConfirm(participant.id)} disabled={loading}>
          {loading ? "Abrindo..." : "Iniciar"}
        </button>
      </div>
    </>
  );
}

function NewParticipantForm({ onCreated, onBack, loading, error, submitLabel }) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", birthdate: "", sex: "M",
    diagnosis_cid: "", additional_diagnoses: [],
    city: "", state: "", country: "",
    medication_use: "",
    medication_notes: "",
    notes: "",
  });
  const handle = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "country") {
        next.state = "";
        next.city = "";
      }
      if (name === "state") {
        next.city = "";
      }
      if (name === "medication_use" && value !== "Sim") {
        next.medication_notes = "";
      }
      return next;
    });
  };
  const addAdditionalDiagnosis = () => {
    setForm((prev) => ({
      ...prev,
      additional_diagnoses: [...prev.additional_diagnoses, ""],
    }));
  };
  const updateAdditionalDiagnosis = (index, value) => {
    setForm((prev) => ({
      ...prev,
      additional_diagnoses: prev.additional_diagnoses.map((item, itemIndex) => (
        itemIndex === index ? value : item
      )),
    }));
  };
  const removeAdditionalDiagnosis = (index) => {
    setForm((prev) => ({
      ...prev,
      additional_diagnoses: prev.additional_diagnoses.filter((_, itemIndex) => itemIndex !== index),
    }));
  };
  const submit = (e) => {
    e.preventDefault();
    const diagnoses = [form.diagnosis_cid, ...form.additional_diagnoses]
      .filter(Boolean)
      .filter((item, index, arr) => arr.indexOf(item) === index);
    const { additional_diagnoses, medication_use, first_name, last_name, ...payload } = form;
    onCreated({ ...payload, name: joinName(first_name, last_name), diagnosis_cid: diagnoses.join("; ") });
  };
  const age = calcAge(form.birthdate);
  const stateOptions = getStateOptions(form.country);
  const cityOptions = getCityOptions(form.country, form.state);
  const hasDiagnosisOptions = DIAGNOSIS_OPTIONS.some((diagnosis) => (
    diagnosis !== form.diagnosis_cid && !form.additional_diagnoses.includes(diagnosis)
  ));

  return (
    <form className="participant-form-shell" onSubmit={submit}>
    <div className="card participant-form-card">
      <div className="participant-form-header">
        <span aria-hidden="true" />
        <h2 className="participant-form-title">Cadastro do Participante</h2>
        <span aria-hidden="true" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input className="form-input" name="first_name" value={form.first_name}
              onChange={handle} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Sobrenome</label>
            <input className="form-input" name="last_name" value={form.last_name}
              onChange={handle} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label form-label--inline">
              <span>Data de Nascimento</span>
              {age !== null && <span className="form-label__hint">{age} anos</span>}
            </label>
            <input className="form-input" type="date" name="birthdate"
              value={form.birthdate} onChange={handle} required />
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

        <div className="location-grid">
          <div className="form-group">
            <label className="form-label">País</label>
            <select className="form-select" name="country"
              value={form.country} onChange={handle} required>
              <option value="">Selecione...</option>
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" name="state"
              value={form.state} onChange={handle} required disabled={!form.country}>
              <option value="">Selecione...</option>
              {stateOptions.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cidade</label>
            <select className="form-select" name="city"
              value={form.city} onChange={handle} required disabled={!form.state}>
              <option value="">Selecione...</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div className="form-group">
            <label className="form-label">Diagnóstico</label>
            <select className="form-select" name="diagnosis_cid"
              value={form.diagnosis_cid} onChange={handle} required>
              <option value="">Selecione...</option>
              {DIAGNOSIS_OPTIONS.map((diagnosis) => (
                <option key={diagnosis} value={diagnosis}>{diagnosis}</option>
              ))}
            </select>
          </div>

          {form.additional_diagnoses.map((selectedDiagnosis, index) => (
            <div className="form-group" key={`additional-diagnosis-${index}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  {index === 0 ? "Diagnóstico Adicional" : `Diagnóstico Adicional ${index + 1}`}
                </label>
                <button
                  type="button"
                  className="panel-action-button"
                  onClick={() => removeAdditionalDiagnosis(index)}
                >
                  Remover
                </button>
              </div>
              <select className="form-select"
                value={selectedDiagnosis}
                onChange={(event) => updateAdditionalDiagnosis(index, event.target.value)}>
                <option value="">Selecione...</option>
                {DIAGNOSIS_OPTIONS.filter((diagnosis) => (
                  diagnosis !== form.diagnosis_cid
                  && (!form.additional_diagnoses.includes(diagnosis) || diagnosis === selectedDiagnosis)
                )).map((diagnosis) => (
                  <option key={diagnosis} value={diagnosis}>{diagnosis}</option>
                ))}
              </select>
            </div>
          ))}

          {hasDiagnosisOptions && (
            <button
              type="button"
              className="panel-action-button"
              onClick={addAdditionalDiagnosis}
              style={{ alignSelf: "flex-start" }}
            >
              {form.additional_diagnoses.length > 0 ? "+ Adicionar mais um diagnóstico" : "+ Adicionar Diagnóstico"}
            </button>
          )}
        </div>

        <div className="medication-grid">
          <div className="form-group">
            <label className="form-label">Medicação</label>
            <select className="form-select" name="medication_use"
              value={form.medication_use} onChange={handle} required>
              <option value="">Selecione...</option>
              <option value="Não">Não</option>
              <option value="Sim">Sim</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nome da Medicação</label>
            <input className="form-input" name="medication_notes" value={form.medication_notes}
              onChange={handle} required={form.medication_use === "Sim"}
              disabled={form.medication_use !== "Sim"}
              style={form.medication_use === "Sim" ? {} : {
                background: "#f3f4f6",
                borderColor: "#d1d5db",
                color: "#9ca3af",
                cursor: "not-allowed",
              }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Observações <span className="text-muted text-small">— opcional</span></label>
          <textarea className="form-input" name="notes" value={form.notes}
            onChange={handle} rows={3}
            style={{ resize: "vertical" }} />
        </div>

        {error && <p className="form-error">{error}</p>}

      </div>
    </div>
      <div className="flow-action-row flow-action-row--split">
        <button type="button" className="flow-secondary-button" onClick={onBack}>
          Voltar
        </button>
        <button type="submit" className="flow-next-button" disabled={loading}>
          {loading ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function NewSession() {
  const { professional } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const participantOnly = searchParams.get("modo") === "participante";
  const [step, setStep]               = useState(participantOnly ? "new" : "select");
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
      const session = await sessionsApi.create(
        participantId,
        Boolean(professional?.is_admin && isPresentationModeEnabled()),
      );
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
      if (participantOnly) {
        navigate("/");
        return;
      }
      await openSession(participant.id);
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao criar participante");
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <main className="container mt-4" style={{ maxWidth: step === "new" ? 680 : 580 }}>
        {loadingList ? (
          <div className="card"><p className="text-muted text-small text-center">Carregando...</p></div>
        ) : step === "select" ? (
          <SelectParticipant participants={participants}
            onSelect={(p) => { setSelected(p); setStep("confirm"); }}
            onNew={() => setStep("new")}
            onBack={() => navigate("/")} />
        ) : step === "confirm" ? (
          <ConfirmParticipant participant={selected}
            onConfirm={openSession}
            onBack={() => { setStep("select"); setSelected(null); }}
            loading={loading} />
        ) : (
          <NewParticipantForm onCreated={createAndOpen}
            onBack={() => participantOnly ? navigate("/") : setStep("select")}
            loading={loading} error={error}
            submitLabel={participantOnly ? "Cadastrar" : "Cadastrar e iniciar"} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
