import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/client";

const PROFESSIONS = [
  "Terapeuta Ocupacional", "Psicólogo(a)", "Fonoaudiólogo(a)",
  "Neurologista", "Psiquiatra", "Neuropsicólogo(a)", "Outro",
];
const COUNCILS = ["CREFITO", "CRP", "CRFa", "CFM", "CRM", "Outro"];
const AREAS = [
  "ABA (Análise do Comportamento Aplicada)",
  "Neuropsicologia",
  "Reabilitação Sensorial",
  "Terapia Ocupacional Pediátrica",
  "Psicomotricidade",
  "Saúde Mental Infantil",
  "Outro",
];
const TITULATIONS = [
  "Graduação", "Especialização", "Mestrado", "Doutorado", "Pós-doutorado",
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", cpf: "", email: "", password: "",
    profession: "", council: "", council_register: "",
    area: "", titulation: "", institution: "",
  });
  const [term1, setTerm1] = useState(false);
  const [term2, setTerm2] = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!term1 || !term2) {
      setError("Você precisa aceitar os dois termos para continuar.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authApi.register(form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <div className="auth-header">
          <div className="auth-header__logo">PSV</div>
          <div className="auth-header__sub">Cadastro do profissional</div>
        </div>

        <form className="auth-form" onSubmit={submit}>

          {/* Dados pessoais */}
          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input className="form-input" name="name" value={form.name}
              onChange={handle} placeholder="Dr. Lucas Ferreira" required />
          </div>

          <div className="form-group">
            <label className="form-label">CPF</label>
            <input className="form-input" name="cpf" value={form.cpf}
              onChange={handle} placeholder="000.000.000-00" maxLength={14} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" name="email"
                value={form.email} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" name="password"
                value={form.password} onChange={handle}
                placeholder="Mín. 8 caracteres" required />
            </div>
          </div>

          {/* Dados profissionais */}
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
              <label className="form-label">Conselho</label>
              <select className="form-select" name="council"
                value={form.council} onChange={handle}>
                <option value="">Selecione...</option>
                {COUNCILS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Registro profissional</label>
            <input className="form-input" name="council_register"
              value={form.council_register} onChange={handle}
              placeholder="ex: 12345-TO" />
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
                Instituição <span className="text-muted text-small">— opcional</span>
              </label>
              <input className="form-input" name="institution"
                value={form.institution} onChange={handle}
                placeholder="USP, UNICAMP, Clínica..." />
            </div>
          </div>

          {/* Termos */}
          <div style={{
            background: "var(--c-bg)", border: "1px solid var(--c-border)",
            borderRadius: "var(--radius-md)", padding: "1rem",
            fontSize: "0.8rem", color: "var(--c-text-3)",
            maxHeight: 110, overflowY: "auto", lineHeight: 1.6,
          }}>
            <strong style={{ color: "var(--c-text-2)", display: "block", marginBottom: "0.375rem" }}>
              Termo de Uso e Participação na Pesquisa
            </strong>
            Ao criar uma conta no Protocolo Sensorial Visual (PSV), o profissional declara que:
            (1) está habilitado para aplicar instrumentos de avaliação sensorial em sua área de atuação;
            (2) utilizará os dados coletados exclusivamente para fins científicos e clínicos;
            (3) garantirá o consentimento livre e esclarecido dos participantes avaliados;
            (4) resguardará a privacidade e confidencialidade dos dados conforme a LGPD (Lei 13.709/2018);
            (5) compreende que os resultados gerados pelo PSV são dados de apoio diagnóstico e não substituem avaliação clínica completa.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem",
              fontSize: "0.85rem", color: "var(--c-text-2)", cursor: "pointer" }}>
              <input type="checkbox" checked={term1} onChange={(e) => setTerm1(e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0 }} />
              Declaro que sou responsável pelas informações inseridas no sistema e que atuação profissional está habilitada para uso do PSV.
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem",
              fontSize: "0.85rem", color: "var(--c-text-2)", cursor: "pointer" }}>
              <input type="checkbox" checked={term2} onChange={(e) => setTerm2(e.target.checked)}
                style={{ marginTop: 3, flexShrink: 0 }} />
              Concordo com os Termos de Uso e Política de Privacidade do PSV descritos acima.
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="btn btn--primary btn--full btn--lg"
            type="submit" disabled={loading}>
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <div className="auth-footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </div>
      </div>
    </div>
  );
}
