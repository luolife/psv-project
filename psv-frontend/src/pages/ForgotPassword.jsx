import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-screen-title">Recuperar Senha</h2>
        </div>

        {sent ? (
          <div className="auth-message">
            Se houver uma conta vinculada a este e-mail, a solicitação de recuperação será encaminhada.
          </div>
        ) : (
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
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="E-mail"
                  aria-label="E-mail"
                  required
                />
              </div>
            </div>

            <button className="btn btn--primary btn--full btn--lg" type="submit">
              Solicitar Recuperação
            </button>
          </form>
        )}

        <div className="auth-footer">
          <Link to="/login">Voltar ao Login</Link>
        </div>
      </div>
    </div>
  );
}
