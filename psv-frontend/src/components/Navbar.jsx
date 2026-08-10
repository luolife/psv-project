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
  const initials = (professional?.name || "PSV")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PSV";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path);
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
        <Link to="/" className="navbar__brand" aria-label="PSV">
          <PsvLogo size={34} />
          <strong>PSV</strong>
        </Link>
        <div className="navbar__title">
          Protocolo Sensorial Visual
        </div>
        <div className="navbar__actions">
          {professional && (
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                className="navbar-profile-trigger"
                onClick={() => setMenuOpen((v) => !v)}
                title="Perfil do Profissional"
                aria-label="Abrir menu do profissional"
              >
                <span className="navbar-profile-trigger__name">{professional.name}</span>
                <span className="navbar-profile-trigger__button" aria-hidden="true">
                  {initials}
                </span>
              </button>

              {menuOpen && (
                <div className="navbar-menu">
                  <button
                    className="navbar-menu__item"
                    onClick={() => goTo("/profile")}
                  >
                    Perfil do Profissional
                  </button>
                  <button
                    className="navbar-menu__item"
                    onClick={() => goTo("/manual-tecnico")}
                  >
                    Manual Técnico
                  </button>
                  <button
                    className="navbar-menu__item"
                    onClick={() => goTo("/documentos")}
                  >
                    Documentos
                  </button>
                  <button
                    className="navbar-menu__item"
                    onClick={() => goTo("/sobre")}
                  >
                    Sobre
                  </button>
                  <div style={{ height: 1, background: "rgba(148, 163, 184, 0.22)" }} />
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="navbar-menu__item navbar-menu__item--muted"
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
