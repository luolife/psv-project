// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { participantsApi, sessionsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { professional } = useAuth();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([participantsApi.list(), sessionsApi.list()])
      .then(([p, s]) => { setParticipants(p); setSessions(s); })
      .finally(() => setLoading(false));
  }, []);

  const statusLabel = {
    in_progress: { text: "Em andamento", cls: "badge--blue" },
    completed:   { text: "Concluída",    cls: "badge--teal" },
    abandoned:   { text: "Abandonada",   cls: "badge--alto" },
  };

  return (
    <div className="page">
      <Navbar />
      <main className="container container--wide mt-4">

        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1>Olá, {professional?.name?.split(" ")[0]}</h1>
            <p className="text-muted text-small mt-1">
              {participants.length} participante(s) cadastrado(s)
            </p>
          </div>
          <button
            className="btn btn--primary"
            onClick={() => navigate("/sessions/new")}
          >
            + Nova avaliação
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1.5rem", marginTop: "1.5rem" }}>

          {/* Participantes */}
          <div className="card card--flat">
            <h2 className="mb-2">Participantes</h2>
            {loading ? (
              <p className="text-muted text-small">Carregando...</p>
            ) : participants.length === 0 ? (
              <p className="text-muted text-small">Nenhum participante ainda.</p>
            ) : (
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {participants.map((p) => (
                  <li key={p.id} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "0.625rem 0.75rem",
                    borderRadius: "var(--radius-md)", border: "1px solid var(--c-border)",
                  }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{p.initials}</span>
                      <span className="text-muted text-small" style={{ marginLeft: "0.5rem" }}>
                        {p.age} anos · {p.sex === "M" ? "Masc." : p.sex === "F" ? "Fem." : "Outro"}
                      </span>
                    </div>
                    <button
                      className="btn btn--outline btn--sm"
                      onClick={() => navigate("/sessions/new", { state: { participantId: p.id } })}
                    >
                      Avaliar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sessões recentes */}
          <div className="card card--flat">
            <h2 className="mb-2">Avaliações recentes</h2>
            {loading ? (
              <p className="text-muted text-small">Carregando...</p>
            ) : sessions.length === 0 ? (
              <p className="text-muted text-small">Nenhuma avaliação ainda.</p>
            ) : (
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Participante</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 10).map((s) => {
                    const participant = participants.find((p) => p.id === s.participant_id);
                    const st = statusLabel[s.status] || { text: s.status, cls: "" };
                    return (
                      <tr key={s.id}>
                        <td>{participant?.initials || "—"}</td>
                        <td className="mono text-small">
                          {new Date(s.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td>
                          <span className={`badge ${st.cls}`}>{st.text}</span>
                        </td>
                        <td>
                          {s.status === "completed" && (
                            <Link
                              to={`/sessions/${s.id}/results`}
                              className="btn btn--ghost btn--sm"
                            >
                              Ver
                            </Link>
                          )}
                          {s.status === "in_progress" && (
                            <Link
                              to={`/sessions/${s.id}/checklist`}
                              className="btn btn--ghost btn--sm"
                            >
                              Continuar
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
