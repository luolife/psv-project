// frontend/src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function PsvLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      {/* Pétalas coloridas rotacionadas ao redor do centro */}
      <ellipse cx="24" cy="15" rx="6.5" ry="11" fill="#E53E3E" opacity="0.88" transform="rotate(0 24 24)"/>
      <ellipse cx="24" cy="15" rx="6.5" ry="11" fill="#ED8936" opacity="0.88" transform="rotate(45 24 24)"/>
      <ellipse cx="24" cy="15" rx="6.5" ry="11" fill="#ECC94B" opacity="0.88" transform="rotate(90 24 24)"/>
      <ellipse cx="24" cy="15" rx="6.5" ry="11" fill="#48BB78" opacity="0.88" transform="rotate(135 24 24)"/>
      <ellipse cx="24" cy="15" rx="6.5" ry="11" fill="#4299E1" opacity="0.88" transform="rotate(180 24 24)"/>
      <ellipse cx="24" cy="15" rx="6.5" ry="11" fill="#667EEA" opacity="0.88" transform="rotate(225 24 24)"/>
      <ellipse cx="24" cy="15" rx="6.5" ry="11" fill="#9F7AEA" opacity="0.88" transform="rotate(270 24 24)"/>
      <ellipse cx="24" cy="15" rx="6.5" ry="11" fill="#F687B3" opacity="0.88" transform="rotate(315 24 24)"/>
      {/* Esclera (branco do olho) */}
      <ellipse cx="24" cy="24" rx="9.5" ry="7.5" fill="white"/>
      {/* Íris */}
      <circle cx="24" cy="24" r="5.5" fill="#1A6FD8"/>
      {/* Pupila */}
      <circle cx="24" cy="24" r="2.8" fill="#0A1A3A"/>
      {/* Reflexo */}
      <circle cx="26.2" cy="21.8" r="1.3" fill="white" opacity="0.9"/>
    </svg>
  );
}

export { PsvLogo };

export default function Navbar() {
  const { professional, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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
            <>
              <span className="navbar__user">{professional.name}</span>
              <button className="btn btn--ghost btn--sm" onClick={handleLogout}>
                Sair
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
