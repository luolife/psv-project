import { COUNTRY_OPTIONS, getCityOptions, getStateOptions } from "../data/locations";
// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { participantsApi, sessionsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import pipTeaLogo from "../assets/pip-tea.png";

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
const TASK_LABELS = {
  contrast: "Contraste",
  motion: "Movimento",
  gabor: "Padrões Espaciais",
};

const REPORT_DATA_UNAVAILABLE = new Set(["expired", "anonymized_or_removed"]);

function splitName(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || "",
    last_name: parts.slice(1).join(" "),
  };
}

function joinName(firstName, lastName) {
  return [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(" ");
}

export default function Dashboard() {
  const { professional } = useAuth();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionSummaries, setSessionSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [startingParticipantId, setStartingParticipantId] = useState(null);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [deletingParticipantId, setDeletingParticipantId] = useState(null);
  const [expandedParticipantId, setExpandedParticipantId] = useState(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [editingParticipantId, setEditingParticipantId] = useState(null);
  const [savingParticipantId, setSavingParticipantId] = useState(null);
  const [participantForm, setParticipantForm] = useState({
    first_name: "",
    last_name: "",
    birthdate: "",
    sex: "M",
    country: "",
    state: "",
    city: "",
    diagnosis_cid: "",
    additional_diagnoses: [],
    medication_use: "",
    medication_notes: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([participantsApi.list(), sessionsApi.list()])
      .then(([p, s]) => { setParticipants(p); setSessions(s); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (sessions.length === 0) return;

    const missing = sessions.filter(
      (session) =>
        !sessionSummaries[session.id] &&
        !REPORT_DATA_UNAVAILABLE.has(session.report_data_status),
    );
    if (missing.length === 0) return;

    Promise.allSettled(missing.map((session) => sessionsApi.summary(session.id)))
      .then((results) => {
        setSessionSummaries((current) => {
          const next = { ...current };
          results.forEach((result, index) => {
            if (result.status === "fulfilled") {
              next[missing[index].id] = result.value;
            }
          });
          return next;
        });
      });
  }, [sessions, sessionSummaries]);

  const statusLabel = {
    in_progress: { text: "Em andamento", cls: "badge--blue" },
    completed:   { text: "Concluído",    cls: "badge--teal" },
    abandoned:   { text: "Abandonada",   cls: "badge--alto" },
  };

  const reportStatusLabel = {
    available: { text: "Relatório disponível", cls: "badge--teal" },
    expired: { text: "Relatório expirado", cls: "badge--medio" },
    anonymized_or_removed: {
      text: "Dados removidos após 60 dias",
      cls: "badge--blue",
    },
  };

  const displayName = (name) => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? `${parts[0]} ${parts[1]}` : parts[0] || "Participante";
  };

  const fullDisplayName = (name) => (name || "").trim() || "Participante";

  const participantInitials = (name) => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "PSV";
    const initials = parts.length === 1
      ? parts[0].slice(0, 2)
      : `${parts[0][0]}${parts[parts.length - 1][0]}`;
    return initials.toUpperCase();
  };

  const calcAge = (birthdate) => {
    if (!birthdate) return null;
    const birth = new Date(`${birthdate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const fullSexLabel = (sex) => (
    sex === "M" ? "Masculino" : sex === "F" ? "Feminino" : "Outro"
  );

  const sessionProgressLabel = (session) => {
    if (REPORT_DATA_UNAVAILABLE.has(session.report_data_status)) {
      return "Prazo de disponibilidade encerrado";
    }
    const summary = sessionSummaries[session.id];
    if (!summary) return "Carregando andamento";

    const doneTasks = summary.tasks || [];
    if (doneTasks.length > 0) {
      if (doneTasks.length >= 3) return "Resultados";
      return doneTasks.map((task) => TASK_LABELS[task.task_name] || task.task_name).join(" | ");
    }

    if (summary.checklist) return "Tarefas de Sensibilidade Visual";
    if (session.status === "completed") return "Resultados";
    return "Triagem Visual";
  };

  const openParticipant = (participant) => {
    setSelectedParticipantId((current) => current === participant.id ? null : participant.id);
    setEditingParticipantId(null);
  };

  const startEditParticipant = (participant) => {
    const participantName = splitName(participant.name || "");
    const diagnoses = (participant.diagnosis_cid || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);
    setSelectedParticipantId(participant.id);
    setEditingParticipantId(participant.id);
    setParticipantForm({
      first_name: participantName.first_name,
      last_name: participantName.last_name,
      birthdate: participant.birthdate || "",
      sex: participant.sex || "M",
      country: participant.country || "",
      state: participant.state || "",
      city: participant.city || "",
      diagnosis_cid: diagnoses[0] || "",
      additional_diagnoses: diagnoses.slice(1),
      medication_use: participant.medication_notes ? "Sim" : "",
      medication_notes: participant.medication_notes || "",
      notes: participant.notes || "",
    });
  };

  const saveParticipant = async (participantId) => {
    setSavingParticipantId(participantId);
    try {
      const diagnoses = [participantForm.diagnosis_cid, ...participantForm.additional_diagnoses]
        .filter(Boolean)
        .filter((item, index, arr) => arr.indexOf(item) === index);
      const { additional_diagnoses, medication_use, first_name, last_name, ...payload } = participantForm;
      const updated = await participantsApi.update(participantId, {
        ...payload,
        name: joinName(first_name, last_name),
        diagnosis_cid: diagnoses.join("; "),
        medication_notes: medication_use === "Sim" ? payload.medication_notes : "",
      });
      setParticipants((prev) => prev.map((participant) => (
        participant.id === participantId ? updated : participant
      )));
      setEditingParticipantId(null);
    } finally {
      setSavingParticipantId(null);
    }
  };

  const updateParticipantForm = (field, value) => {
    setParticipantForm((form) => {
      const next = { ...form, [field]: value };
      if (field === "country") {
        next.state = "";
        next.city = "";
      }
      if (field === "state") {
        next.city = "";
      }
      if (field === "diagnosis_cid") {
        next.additional_diagnoses = next.additional_diagnoses.filter((diagnosis) => diagnosis !== value);
      }
      if (field === "medication_use" && value !== "Sim") {
        next.medication_notes = "";
      }
      return next;
    });
  };

  const addAdditionalDiagnosis = () => {
    setParticipantForm((form) => ({
      ...form,
      additional_diagnoses: [...form.additional_diagnoses, ""],
    }));
  };

  const updateAdditionalDiagnosis = (index, value) => {
    setParticipantForm((form) => ({
      ...form,
      additional_diagnoses: form.additional_diagnoses.map((item, itemIndex) => (
        itemIndex === index ? value : item
      )),
    }));
  };

  const removeAdditionalDiagnosis = (index) => {
    setParticipantForm((form) => ({
      ...form,
      additional_diagnoses: form.additional_diagnoses.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const startAssessment = async (participantId) => {
    setStartingParticipantId(participantId);
    try {
      const session = await sessionsApi.create(participantId);
      navigate(`/sessions/${session.id}/checklist`);
    } finally {
      setStartingParticipantId(null);
    }
  };

  const deleteAssessment = async (sessionId) => {
    const ok = window.confirm("Excluir esta avaliação? Essa ação remove a triagem e tarefas já registradas nela.");
    if (!ok) return;

    setDeletingSessionId(sessionId);
    try {
      await sessionsApi.delete(sessionId);
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    } finally {
      setDeletingSessionId(null);
    }
  };

  const deleteParticipant = async (participantId) => {
    const participant = participants.find((p) => p.id === participantId);
    const ok = window.confirm(`Excluir ${displayName(participant?.name)}? Isso também remove as avaliações desse participante.`);
    if (!ok) return;

    setDeletingParticipantId(participantId);
    try {
      await participantsApi.delete(participantId);
      setParticipants((prev) => prev.filter((participant) => participant.id !== participantId));
      setSessions((prev) => prev.filter((session) => session.participant_id !== participantId));
      if (expandedParticipantId === participantId) setExpandedParticipantId(null);
      if (selectedParticipantId === participantId) setSelectedParticipantId(null);
    } finally {
      setDeletingParticipantId(null);
    }
  };

  const groupedSessions = Object.values(
    sessions.reduce((groups, session) => {
      const key = session.participant_id;
      if (!groups[key]) groups[key] = { participantId: key, sessions: [] };
      groups[key].sessions.push(session);
      return groups;
    }, {})
  )
    .map((group) => ({
      ...group,
      sessions: group.sessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    }))
    .sort((a, b) => new Date(b.sessions[0]?.created_at || 0) - new Date(a.sessions[0]?.created_at || 0))
    .slice(0, 10);
  const editingParticipant = participants.find((p) => p.id === editingParticipantId);
  const stateOptions = getStateOptions(participantForm.country);
  const cityOptions = getCityOptions(participantForm.country, participantForm.state);
  const hasDiagnosisOptions = DIAGNOSIS_OPTIONS.some((diagnosis) => (
    diagnosis !== participantForm.diagnosis_cid
    && !participantForm.additional_diagnoses.includes(diagnosis)
  ));

  const renderParticipantCard = (p) => {
    const age = calcAge(p.birthdate);
    const isSelected = selectedParticipantId === p.id;

    return (
      <li key={p.id} style={{
        borderRadius: "var(--radius-md)",
        border: `1.5px solid ${isSelected ? "var(--c-blue-100)" : "var(--c-border)"}`,
        overflow: "hidden",
        background: isSelected ? "var(--c-blue-50)" : "#fff",
      }}>
        <button
          type="button"
          onClick={() => openParticipant(p)}
          style={{
            width: "100%",
            border: 0,
            background: "transparent",
            padding: "0.75rem 0.875rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            textAlign: "left",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <span className="participant-card-summary">
            <span className="participant-card-summary__initials" aria-hidden="true">
              {participantInitials(p.name)}
            </span>
            <span className="participant-card-summary__text">
              <span className="participant-card-summary__name" title={fullDisplayName(p.name)}>
                {fullDisplayName(p.name)}
              </span>
              <span className="participant-card-summary__age">
                {age !== null ? `${age} anos` : "idade não informada"}
              </span>
            </span>
          </span>
          <span className={`participant-card-detail ${isSelected ? "is-open" : ""}`}>
            {isSelected ? "Fechar" : "Detalhes"}
          </span>
        </button>

        {isSelected && (
          <div className="participant-details-panel">
            <div className="participant-details-grid">
              {[
                ["Participante", p.name || "Não informado", "wide"],
                ["Nascimento", p.birthdate ? new Date(`${p.birthdate}T00:00:00`).toLocaleDateString("pt-BR") : "Não informado"],
                ["Sexo", fullSexLabel(p.sex)],
                ["Localização", [p.city, p.state, p.country].filter(Boolean).join(" · ") || "Não informado", "wide"],
                ["Diagnóstico", p.diagnosis_cid || "Não informado", "wide"],
                ["Medicação", p.medication_notes || "Não informado", "wide"],
              ].map(([label, value, variant]) => (
                <div key={label} className={`participant-details-item ${variant === "wide" ? "participant-details-item--wide" : ""}`}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {p.notes && (
              <div className="participant-details-notes">
                <span>Observações</span>
                <p>{p.notes}</p>
              </div>
            )}

            <div className="participant-details-actions">
              <button className="panel-action-button" onClick={() => startEditParticipant(p)} disabled={deletingParticipantId === p.id}>Editar Perfil</button>
              <button className="panel-action-button panel-action-button--primary" onClick={() => startAssessment(p.id)} disabled={startingParticipantId === p.id || deletingParticipantId === p.id}>
                {startingParticipantId === p.id ? "Abrindo..." : "Avaliar"}
              </button>
              <button className="panel-action-button panel-action-button--danger" onClick={() => deleteParticipant(p.id)} disabled={deletingParticipantId === p.id}>
                {deletingParticipantId === p.id ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        )}
      </li>
    );
  };

  const renderSessionActions = (session) => (
    <>
      {session.status === "completed" && !REPORT_DATA_UNAVAILABLE.has(session.report_data_status) && (
        <Link
          to={`/sessions/${session.id}/results`}
          className="panel-action-button"
        >
          Ver
        </Link>
      )}
      {session.status === "in_progress" && (
        <Link
          to={`/sessions/${session.id}/checklist`}
          className="panel-action-button panel-action-button--primary"
        >
          Continuar
        </Link>
      )}
      <button
        type="button"
        className="evaluation-delete-button"
        onClick={() => deleteAssessment(session.id)}
        disabled={deletingSessionId === session.id}
        aria-label="Excluir avaliação"
        title="Excluir avaliação"
      >
        {deletingSessionId === session.id ? "..." : "×"}
      </button>
    </>
  );

  return (
    <div className="page">
      <Navbar />
      <main className="container container--wide mt-4 dashboard-main">

        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1>Olá, {professional?.name?.split(" ")[0]}</h1>
          </div>
          <div className="dashboard-actions">
            <button
              className="flow-secondary-button flow-next-button--compact"
              onClick={() => navigate("/sessions/new?modo=participante")}
            >
              Cadastro do Participante
            </button>
            <button
              className="flow-next-button flow-next-button--compact"
              onClick={() => navigate("/sessions/new")}
            >
              Nova Avaliação
            </button>
          </div>
        </div>

        <div className="dashboard-content-grid">

          {/* Participantes */}
          <div className="card card--flat">
            <div className="flex justify-between items-center mb-2">
              <h2>Participantes</h2>
              <span className="badge badge--blue">{participants.length}</span>
            </div>
            {loading ? (
              <p className="text-muted text-small">Carregando...</p>
            ) : participants.length === 0 ? (
              <p className="text-muted text-small">Nenhum participante ainda.</p>
            ) : (
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {participants.map(renderParticipantCard)}
              </ul>
            )}
          </div>

          {/* Avaliações */}
          <div className="card card--flat">
            <h2 className="mb-2">Avaliações</h2>
            {loading ? (
              <p className="text-muted text-small">Carregando...</p>
            ) : sessions.length === 0 ? (
              <div className="dashboard-empty-state">
                <span className="dashboard-empty-state__mark">0</span>
                <p>As avaliações registradas aparecerão neste espaço.</p>
              </div>
            ) : (
              <div className="evaluation-list">
                {groupedSessions.map((group) => {
                  const participant = participants.find((p) => p.id === group.participantId);
                  const latest = group.sessions[0];
                  const expanded = expandedParticipantId === group.participantId;
                  const age = calcAge(participant?.birthdate);
                  const latestDate = new Date(latest.created_at).toLocaleDateString("pt-BR");

                  return (
                    <div key={group.participantId} className="evaluation-card">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedParticipantId(expanded ? null : group.participantId);
                        }}
                        className={`evaluation-card__header ${expanded ? "is-open" : ""} ${latest.status === "in_progress" ? "is-pending" : ""} ${latest.status === "completed" ? "is-completed" : ""}`}
                      >
                        <span className="evaluation-card__main">
                          <strong>
                            {fullDisplayName(participant?.name)}
                          </strong>
                          <span className="evaluation-card__meta">
                            <span>{age !== null ? `${age} anos` : "idade não informada"}</span>
                            <span>{fullSexLabel(participant?.sex)}</span>
                            <span className="evaluation-card__date">{latestDate}</span>
                          </span>
                        </span>
                        <span className="evaluation-card__status">
                          <span className="evaluation-card__count">
                            {group.sessions.length}
                          </span>
                          <span className={`participant-card-detail ${expanded ? "is-open" : ""}`}>
                            {expanded ? "Fechar" : "Detalhes"}
                          </span>
                        </span>
                      </button>

                      {expanded ? (
                        <div className="evaluation-card__list">
                          {group.sessions.map((session, index) => {
                            return (
                              <div key={session.id} className={`evaluation-card__row ${session.status === "in_progress" ? "is-pending" : ""} ${session.status === "completed" ? "is-completed" : ""}`}>
                                <span className="evaluation-card__row-index">{index + 1}</span>
                                <div className="evaluation-card__row-main">
                                  <strong className="evaluation-card__row-title">
                                    {sessionProgressLabel(session)}
                                  </strong>
                                  <span className="evaluation-card__row-date">
                                    {new Date(session.created_at).toLocaleDateString("pt-BR")}
                                  </span>
                                </div>
                                <div className="evaluation-card__row-statuses">
                                  {session.status !== "in_progress" && (
                                    <span className={`badge evaluation-card__row-status ${(statusLabel[session.status] || { cls: "" }).cls}`}>
                                      {(statusLabel[session.status] || { text: session.status }).text}
                                    </span>
                                  )}
                                  {reportStatusLabel[session.report_data_status] && (
                                    <span className={`badge evaluation-card__row-status ${reportStatusLabel[session.report_data_status].cls}`}>
                                      {reportStatusLabel[session.report_data_status].text}
                                    </span>
                                  )}
                                </div>
                                <div className="evaluation-card__row-actions">{renderSessionActions(session)}</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </main>
      <SiteFooter />
      {false && <footer className="dashboard-footer">
        <div className="dashboard-footer__inner">
          <div className="dashboard-footer__brand" aria-label="PIP-TEA">
            <img src={pipTeaLogo} alt="PIP-TEA" />
          </div>
          <p>
            Produto Técnico-Tecnológico derivado da pesquisa de Mestrado Profissional em Psicologia, Desenvolvimento e Políticas Públicas da Universidade Católica de Santos (UNISANTOS)
          </p>
          <div className="dashboard-footer__author">
            <strong>© 2026 PSV</strong>
          </div>
        </div>
      </footer>}
      {editingParticipant && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(17, 24, 39, 0.38)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.25rem",
          zIndex: 300,
        }}>
          <div className="card" style={{ width: "min(680px, 100%)", maxHeight: "92vh", overflow: "auto" }}>
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2>Participante</h2>
              </div>
              <button
                className="panel-action-button"
                onClick={() => setEditingParticipantId(null)}
                disabled={savingParticipantId === editingParticipant.id}
              >
                Fechar
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nome</label>
                  <input className="form-input" value={participantForm.first_name}
                    onChange={(event) => setParticipantForm((form) => ({ ...form, first_name: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Sobrenome</label>
                  <input className="form-input" value={participantForm.last_name}
                    onChange={(event) => setParticipantForm((form) => ({ ...form, last_name: event.target.value }))} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Data de Nascimento</label>
                  <input className="form-input" type="date" value={participantForm.birthdate}
                    onChange={(event) => setParticipantForm((form) => ({ ...form, birthdate: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Sexo</label>
                  <select className="form-select" value={participantForm.sex}
                    onChange={(event) => setParticipantForm((form) => ({ ...form, sex: event.target.value }))}>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="O">Outro</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">País</label>
                  <select className="form-select" value={participantForm.country}
                    onChange={(event) => updateParticipantForm("country", event.target.value)} required>
                    <option value="">Selecione...</option>
                    {COUNTRY_OPTIONS.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-select" value={participantForm.state}
                    onChange={(event) => updateParticipantForm("state", event.target.value)} required disabled={!participantForm.country}>
                    <option value="">Selecione...</option>
                    {stateOptions.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cidade</label>
                  <select className="form-select" value={participantForm.city}
                    onChange={(event) => updateParticipantForm("city", event.target.value)}
                    required disabled={!participantForm.state}>
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
                  <select className="form-select" value={participantForm.diagnosis_cid}
                    onChange={(event) => updateParticipantForm("diagnosis_cid", event.target.value)} required>
                    <option value="">Selecione...</option>
                    {DIAGNOSIS_OPTIONS.map((diagnosis) => (
                      <option key={diagnosis} value={diagnosis}>{diagnosis}</option>
                    ))}
                  </select>
                </div>

                {participantForm.additional_diagnoses.map((selectedDiagnosis, index) => (
                  <div className="form-group" key={`edit-additional-diagnosis-${index}`}>
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
                        diagnosis !== participantForm.diagnosis_cid
                        && (!participantForm.additional_diagnoses.includes(diagnosis) || diagnosis === selectedDiagnosis)
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
                    {participantForm.additional_diagnoses.length > 0 ? "+ Adicionar mais um diagnóstico" : "+ Adicionar Diagnóstico"}
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Medicação</label>
                  <select className="form-select" value={participantForm.medication_use}
                    onChange={(event) => updateParticipantForm("medication_use", event.target.value)} required>
                    <option value="">Selecione...</option>
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nome da Medicação</label>
                  <input className="form-input" value={participantForm.medication_notes}
                    onChange={(event) => updateParticipantForm("medication_notes", event.target.value)}
                    required={participantForm.medication_use === "Sim"}
                    disabled={participantForm.medication_use !== "Sim"}
                    style={participantForm.medication_use === "Sim" ? {} : {
                      background: "#f3f4f6",
                      borderColor: "#d1d5db",
                      color: "#9ca3af",
                      cursor: "not-allowed",
                    }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-input" rows={3} value={participantForm.notes}
                  onChange={(event) => setParticipantForm((form) => ({ ...form, notes: event.target.value }))}
                  style={{ resize: "vertical" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", paddingTop: "0.5rem" }}>
                <button
                  className="panel-action-button"
                  onClick={() => setEditingParticipantId(null)}
                  disabled={savingParticipantId === editingParticipant.id}
                >
                  Cancelar
                </button>
                <button
                  className="panel-action-button panel-action-button--primary"
                  onClick={() => saveParticipant(editingParticipant.id)}
                  disabled={savingParticipantId === editingParticipant.id}
                >
                  {savingParticipantId === editingParticipant.id ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
