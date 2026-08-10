// frontend/src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PsvLogo } from "../components/Navbar";
import pipTeaLogo from "../assets/pip-tea.png";
import unisantosLogo from "../assets/unisantos-symbol-white.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "E-mail ou senha incorretos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page--login">
      <div className="login-shell">
        <section className="login-card" aria-label="Entrar no PSV">
          <div className="login-card__rainbow" aria-hidden="true" />
          <div className="login-card__header">
            <h1>Entrar</h1>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <div className="form-group">
              <div className="login-input">
                <span className="login-input__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M4 6h16v12H4z" />
                    <path d="m4 7 8 6 8-6" />
                  </svg>
                </span>
                <span className="login-input__divider" aria-hidden="true" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handle}
                  placeholder="E-mail"
                  aria-label="E-mail"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="login-input">
                <span className="login-input__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M7 11h10v8H7z" />
                    <path d="M9 11V8a3 3 0 0 1 6 0v3" />
                  </svg>
                </span>
                <span className="login-input__divider" aria-hidden="true" />
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handle}
                  placeholder="Senha"
                  aria-label="Senha"
                  required
                />
              </div>
            </div>

            <div className="login-card__meta">
              <Link className="auth-link" to="/forgot-password">
                Esqueci minha senha
              </Link>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button
              className="btn btn--primary btn--full btn--lg"
              type="submit"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="auth-footer">
            Não tem conta?{" "}
            <Link to="/register">Cadastre-se</Link>
          </div>
        </section>

        <div className="login-panel" aria-hidden="true">
          <div className="login-panel__glow login-panel__glow--top" />
          <div className="login-panel__glow login-panel__glow--bottom" />
          <div className="login-panel__inner">
            <div className="login-panel__topline">
              <span>Produto Técnico</span>
              <span>Tecnologia Social</span>
              <span>CAPES</span>
            </div>
            <div className="login-panel__content">
              <div className="login-panel__brand">
                <div className="login-panel__logo">
                  <PsvLogo size={74} />
                </div>
                <div className="login-panel__mark">PSV</div>
              </div>
              <div className="login-panel__copy">
                <h2>Protocolo Sensorial Visual</h2>
                <p className="login-panel__lead">
                  Precisão, tecnologia e cuidado
                </p>
                <p className="login-panel__description">
                  Plataforma digital desenvolvida para apoiar a aplicação, o registro e o acompanhamento de tarefas de processamento sensorial visual, favorecendo uma análise mais organizada e padronizada dos dados.
                </p>
              </div>
            </div>
            <div className="login-panel__author">
              <img className="login-panel__institution login-panel__institution--unisantos" src={unisantosLogo} alt="UNISANTOS" />
              <div className="login-panel__author-text">
                <strong>Ferreira, L. H. A. S.</strong>
                <span>luizhenrique@unisantos.br</span>
              </div>
              <img className="login-panel__institution login-panel__institution--pip" src={pipTeaLogo} alt="PIP-TEA" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
