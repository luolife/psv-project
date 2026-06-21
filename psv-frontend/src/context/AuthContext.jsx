// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [professional, setProfessional] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ao montar, verifica se já há token válido
  useEffect(() => {
    const token = localStorage.getItem("psv_token");
    if (!token) { setLoading(false); return; }

    authApi.me()
      .then(setProfessional)
      .catch(() => localStorage.removeItem("psv_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { access_token } = await authApi.login(email, password);
    localStorage.setItem("psv_token", access_token);
    const user = await authApi.me();
    setProfessional(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem("psv_token");
    setProfessional(null);
  };

  const updateProfile = async (data) => {
    const updated = await authApi.updateProfile(data);
    setProfessional(updated);
    return updated;
  };

  return (
    <AuthContext.Provider value={{ professional, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
