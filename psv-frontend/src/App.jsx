// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login        from "./pages/Login";
import Register     from "./pages/Register";
import Dashboard    from "./pages/Dashboard";
import NewSession   from "./pages/NewSession";
import Checklist    from "./pages/Checklist";
import TaskRunner   from "./pages/TaskRunner";
import Results      from "./pages/Results";
import EditProfile  from "./pages/EditProfile";

function PrivateRoute({ children }) {
  const { professional, loading } = useAuth();
  if (loading) return <div className="loading-screen">Carregando...</div>;
  return professional ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protegidas */}
          <Route path="/" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="/sessions/new" element={
            <PrivateRoute><NewSession /></PrivateRoute>
          } />
          <Route path="/sessions/:sessionId/checklist" element={
            <PrivateRoute><Checklist /></PrivateRoute>
          } />
          <Route path="/sessions/:sessionId/tasks" element={
            <PrivateRoute><TaskRunner /></PrivateRoute>
          } />
          <Route path="/sessions/:sessionId/results" element={
            <PrivateRoute><Results /></PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute><EditProfile /></PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
