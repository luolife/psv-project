import { COUNTRY_OPTIONS, getCityOptions, getStateOptions } from "../data/locations";
// frontend/src/pages/EditProfile.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
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
function maskCPF(value) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

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

export default function EditProfile() {
  const { professional, updateProfile } = useAuth();
  const navigate = useNavigate();
  const initialName = splitName(professional?.name || "");

  const [form, setForm] = useState({
    first_name:       initialName.first_name,
    last_name:        initialName.last_name,
    cpf:              professional?.cpf              || "",
    email:            professional?.email            || "",
    secondary_email:  professional?.secondary_email  || "",
    profession:       professional?.profession       || "",
    council:          professional?.council          || "",
    council_register: professional?.council_register || "",
    area:             professional?.area             || "",
    titulation:       professional?.titulation       || "",
    institution:      professional?.institution      || "",
    country:          professional?.country          || "",
    city:             professional?.city             || "",
    state:            professional?.state            || "",
    password:         "",
    password_confirm: "",
  });

  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "country" ? { state: "", city: "" } : {}),
      ...(name === "state" ? { city: "" } : {}),
    }));
    setSuccess(false);
    setError("");
  };

  const handleCPF = (e) => {
    setForm((prev) => ({ ...prev, cpf: maskCPF(e.target.value) }));
    setSuccess(false);
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = { ...form, name: joinName(form.first_name, form.last_name) };
      delete payload.first_name;
      delete payload.last_name;
      delete payload.password_confirm;
      await updateProfile(payload);
      setSuccess(true);
      setForm((f) => ({ ...f, password: "", password_confirm: "" }));
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const stateOptions = getStateOptions(form.country);
  const cityOptions = getCityOptions(form.country, form.state);

  return (
    <div className="page">
      <Navbar />
      <main className="container mt-4" style={{ maxWidth: 680 }}>
        <form className="participant-form-shell" onSubmit={submit}>
        <div className="card participant-form-card">
          <div className="participant-form-header">
            <span aria-hidden="true" />
            <h2 className="participant-form-title">Perfil do Profissional</h2>
            <span aria-hidden="true" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input className="form-input" name="first_name" value={form.first_name}
                  onChange={handle} required />
              </div>
              <div className="form-group">
                <label className="form-label">Sobrenome</label>
                <input className="form-input" name="last_name" value={form.last_name}
                  onChange={handle} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">CPF</label>
              <input className="form-input" name="cpf" value={form.cpf}
                onChange={handleCPF} inputMode="numeric" required />
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
                  value={form.city} onChange={handle} disabled={!form.state} required>
                  <option value="">Selecione...</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Profissão</label>
                <select className="form-select" name="profession"
                  value={form.profession} onChange={handle} required>
                  <option value="">Selecione...</option>
                  {PROFESSIONS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Área de Atuação</label>
                <select className="form-select" name="area"
                  value={form.area} onChange={handle} required>
                  <option value="">Selecione...</option>
                  {AREAS.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Conselho</label>
                <select className="form-select" name="council"
                  value={form.council} onChange={handle} required>
                  <option value="">Selecione...</option>
                  {COUNCILS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Número de Registro</label>
                <input className="form-input" name="council_register"
                  value={form.council_register} onChange={handle} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Titulação</label>
                <select className="form-select" name="titulation"
                  value={form.titulation} onChange={handle} required>
                  <option value="">Selecione...</option>
                  {TITULATIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Instituição</label>
                <input className="form-input" name="institution"
                  value={form.institution} onChange={handle} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" type="email" name="email"
                  value={form.email} onChange={handle} required />
              </div>
              <div className="form-group">
                <label className="form-label">
                  E-mail Secundário <span className="text-muted text-small">— opcional</span>
                </label>
                <input className="form-input" type="email" name="secondary_email"
                  value={form.secondary_email} onChange={handle} />
              </div>
            </div>

            <div className="form-divider" aria-hidden="true" />

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nova Senha</label>
                <input className="form-input" type="password" name="password"
                  value={form.password} onChange={handle} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar Senha</label>
                <input className="form-input" type="password" name="password_confirm"
                  value={form.password_confirm} onChange={handle} required />
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

          </div>
        </div>
            <div className="flow-action-row flow-action-row--split">
              <button type="button" className="flow-secondary-button" onClick={() => navigate("/")}>
                Cancelar
              </button>
              <button type="submit" className="flow-next-button" disabled={loading}>
                {loading ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
