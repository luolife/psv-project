// frontend/src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/client";

const PROFESSIONS = ["Terapeuta Ocupacional", "Psicólogo(a)", "Fonoaudiólogo(a)", "Neurologista", "Outro"];
const COUNCILS    = ["CREFITO", "CRP", "CRFa", "CFM", "Outro"];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    profession: "", council: "", council_register: "",
  });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
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
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-header">
          <div className="auth-header__logo">PSV</div>
          <div className="auth-header__sub">Cadastro do profissional</div>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input className="form-input" name="name" value={form.name}
              onChange={handle} placeholder="Dra. Ana Silva" required />
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
            <label className="form-label">Registro profissional</label>
            <input className="form-input" name="council_register"
              value={form.council_register} onChange={handle}
              placeholder="ex: 12345-TO" />
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
