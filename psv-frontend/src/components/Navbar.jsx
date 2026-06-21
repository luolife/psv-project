// frontend/src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useRef, useEffect } from "react";
import logoSrc from "../assets/logo.png.png";

function PsvLogo({ size = 32 }) {
  return (
    <img src={logoSrc} width={size} height={size} alt="PSV Logo"
      style={{ objectFit: "contain", display: "block" }} />
  );
}

export { PsvLogo };

export default function Navbar() {
  const { professional, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Fecha o menu ao clicar fora
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <nav className="navbar">
      <div className="navbar__rainbow" />
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          <PsvLogo size={34} />
          PSV <span>Protocolo Sensorial Visual</span>
        </Link>
        <div className="navbar__actions">
          {professional && (
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                className="navbar__user navbar__user--btn"
                onClick={() => setMenuOpen((v) => !v)}
                title="Editar perfil"
              >
                {professional.name}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                  style={{ marginLeft: 5, opacity: 0.5 }}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {menuOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 6px)",
                  background: "var(--c-surface)", border: "1px solid var(--c-border)",
                  borderRadius: "var(--radius-md)", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  minWidth: 180, zIndex: 200, overflow: "hidden",
                }}>
                  <button
                    onClick={() => { setMenuOpen(false); navigate("/profile"); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "0.75rem 1rem", background: "none", border: "none",
                      fontSize: "0.875rem", color: "var(--c-text-1)", cursor: "pointer",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--c-blue-50)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    Editar perfil
                  </button>
                  <div style={{ height: 1, background: "var(--c-border)" }} />
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "0.75rem 1rem", background: "none", border: "none",
                      fontSize: "0.875rem", color: "var(--c-text-2)", cursor: "pointer",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--c-blue-50)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
