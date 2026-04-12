// frontend/src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { professional, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
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
