// frontend/src/pages/EditProfile.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const PROFESSIONS = [
  "Terapeuta Ocupacional", "Psicólogo(a)", "Fonoaudiólogo(a)",
  "Neurologista", "Psiquiatra", "Neuropsicólogo(a)", "Outro",
];
const COUNCILS = ["CREFITO", "CRP", "CRFa", "CFM", "CRM", "Outro"];
const AREAS = [
  "ABA (Análise do Comportamento Aplicada)",
  "Neuropsicologia", "Reabilitação Sensorial",
  "Terapia Ocupacional Pediátrica", "Psicomotricidade",
  "Saúde Mental Infantil", "Outro",
];
const TITULATIONS = [
  "Graduação", "Especialização", "Mestrado", "Doutorado", "Pós-doutorado",
];

export default function EditProfile() {
  const { professional, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:             professional?.name             || "",
    email:            professional?.email            || "",
    profession:       professional?.profession       || "",
    council:          professional?.council          || "",
    council_register: professional?.council_register || "",
    area:             professional?.area             || "",
    titulation:       professional?.titulation       || "",
    institution:      professional?.institution      || "",
    city:             professional?.city             || "",
    state:            professional?.state            || "",
    password:         "",
    password_confirm: "",
  });

  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSuccess(false);
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.password_confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.password) {
        delete payload.password;
        delete payload.password_confirm;
      } else {
        delete payload.password_confirm;
      }
      await updateProfile(payload);
      setSuccess(true);
      setForm((f) => ({ ...f, password: "", password_confirm: "" }));
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Navbar />
      <main className="container mt-4" style={{ maxWidth: 580 }}>
        <div className="card">
          <div style={{ marginBottom: "1.5rem" }}>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => navigate("/")}
              style={{ marginBottom: "1rem" }}
            >
              ← Voltar
            </button>
            <h2>Editar perfil</h2>
            <p className="text-muted text-small" style={{ marginTop: "0.25rem" }}>
              Revise e atualize seus dados cadastrais.
            </p>
          </div>

          <form style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}
            onSubmit={submit}>

            <div className="form-group">
              <label className="form-label">Nome completo</label>
              <input className="form-input" name="name" value={form.name}
                onChange={handle} required />
            </div>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" name="email"
                value={form.email} onChange={handle} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Profissão</label>
                <select className="form-select" name="profession"
                  value={form.profession} onChange={handle}>
                  <option value="">Selecione...</option>
                  {PROFESSIONS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Conselho</label>
                <select className="form-select" name="council"
                  value={form.council} onChange={handle}>
                  <option value="">Selecione...</option>
                  {COUNCILS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Número de registro</label>
              <input className="form-input" name="council_register"
                value={form.council_register} onChange={handle} />
            </div>

            <div className="form-group">
              <label className="form-label">Área de atuação</label>
              <select className="form-select" name="area"
                value={form.area} onChange={handle}>
                <option value="">Selecione...</option>
                {AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Titulação <span className="text-muted text-small">— opcional</span>
                </label>
                <select className="form-select" name="titulation"
                  value={form.titulation} onChange={handle}>
                  <option value="">Selecione...</option>
                  {TITULATIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Instituição/serviço <span className="text-muted text-small">— opcional</span>
                </label>
                <input className="form-input" name="institution"
                  value={form.institution} onChange={handle} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Cidade <span className="text-muted text-small">— opcional</span>
                </label>
                <input className="form-input" name="city"
                  value={form.city} onChange={handle} />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Estado <span className="text-muted text-small">— opcional</span>
                </label>
                <input className="form-input" name="state"
                  value={form.state} onChange={handle} maxLength={50} />
              </div>
            </div>

            <div style={{
              borderTop: "1px solid var(--c-border)",
              paddingTop: "1rem",
              marginTop: "0.25rem",
            }}>
              <p className="text-muted text-small" style={{ marginBottom: "0.75rem" }}>
                Alterar senha — deixe em branco para manter a senha atual.
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nova senha</label>
                  <input className="form-input" type="password" name="password"
                    value={form.password} onChange={handle}
                    placeholder="Mín. 8 caracteres" />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar senha</label>
                  <input className="form-input" type="password" name="password_confirm"
                    value={form.password_confirm} onChange={handle} />
                </div>
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}
            {success && (
              <p style={{
                color: "var(--c-teal-500)", fontSize: "0.875rem",
                background: "var(--c-teal-50,#f0fdf4)", padding: "0.625rem 0.875rem",
                borderRadius: "var(--radius-md)", border: "1px solid var(--c-teal-100,#bbf7d0)",
              }}>
                Perfil atualizado com sucesso.
              </p>
            )}

            <div className="flex gap-1" style={{ marginTop: "0.25rem" }}>
              <button type="button" className="btn btn--ghost" onClick={() => navigate("/")}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={loading} style={{ flex: 1 }}>
                {loading ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
