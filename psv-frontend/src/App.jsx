// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login        from "./pages/Login";
import Register     from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard    from "./pages/Dashboard";
import NewSession   from "./pages/NewSession";
import Checklist    from "./pages/Checklist";
import TaskRunner   from "./pages/TaskRunner";
import Results      from "./pages/Results";
import EditProfile  from "./pages/EditProfile";
import DocumentViewer from "./pages/DocumentViewer";
import Documents from "./pages/Documents";
import About from "./pages/About";
import ManualTechnical from "./pages/ManualTechnical";

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
          <Route path="/forgot-password" element={<ForgotPassword />} />

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
          <Route path="/manual-tecnico" element={
            <PrivateRoute><ManualTechnical /></PrivateRoute>
          } />
          <Route path="/manual-tecnico/visualizar" element={
            <PrivateRoute>
              <DocumentViewer
                title="Manual Técnico do Protocolo Sensorial Visual"
                subtitle=""
                src="/documents/manual-tecnico.pdf?v=20260725-v23-final"
                filename="Manual_Tecnico_PSV.pdf"
                backTo="/manual-tecnico"
              />
            </PrivateRoute>
          } />
          <Route path="/documentos" element={
            <PrivateRoute><Documents /></PrivateRoute>
          } />
          <Route path="/contrato" element={
            <PrivateRoute>
              <DocumentViewer
                title="Termo de Uso Profissional"
                subtitle=""
                apiSrc="/sessions/documents/contract"
                filename="Termo_Uso_Profissional_PSV.pdf"
              />
            </PrivateRoute>
          } />
          <Route path="/politica-privacidade" element={
            <PrivateRoute>
              <DocumentViewer
                title="Política de Privacidade"
                subtitle=""
                apiSrc="/sessions/documents/privacy"
                filename="Politica_Privacidade_PSV.pdf"
              />
            </PrivateRoute>
          } />
          <Route path="/sobre" element={
            <PrivateRoute><About /></PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
