// frontend/src/api/client.js
import axios from "axios";

// Em desenvolvimento: baseURL vazia → proxy do Vite redireciona para localhost:8000
// Em produção (Vercel): VITE_API_URL aponta para o Railway
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: { "Content-Type": "application/json" },
});

// Injeta o token JWT em toda requisição autenticada
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("psv_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redireciona para login se o token expirar
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("psv_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authApi = {
  login: (email, password) =>
    api.post("/auth/login", { email, password }).then((r) => r.data),
  register: (data) =>
    api.post("/auth/register", data).then((r) => r.data),
  me: () =>
    api.get("/auth/me").then((r) => r.data),
  updateProfile: (data) =>
    api.patch("/auth/me", data).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Participantes
// ---------------------------------------------------------------------------
export const participantsApi = {
  list: () =>
    api.get("/participants").then((r) => r.data),
  get: (id) =>
    api.get(`/participants/${id}`).then((r) => r.data),
  create: (data) =>
    api.post("/participants", data).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Sessões
// ---------------------------------------------------------------------------
export const sessionsApi = {
  create: (participant_id) =>
    api.post("/sessions", { participant_id }).then((r) => r.data),
  list: () =>
    api.get("/sessions").then((r) => r.data),
  get: (id) =>
    api.get(`/sessions/${id}`).then((r) => r.data),
  complete: (id) =>
    api.patch(`/sessions/${id}/status`, { status: "completed" }).then((r) => r.data),
  abandon: (id) =>
    api.patch(`/sessions/${id}/status`, { status: "abandoned" }).then((r) => r.data),
  summary: (id) =>
    api.get(`/sessions/${id}/summary`).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------
export const checklistApi = {
  submit: (sessionId, responses) =>
    api.post(`/sessions/${sessionId}/checklist`, { responses }).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
export const tasksApi = {
  submit: (sessionId, taskData) =>
    api.post(`/sessions/${sessionId}/tasks`, taskData).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------
export const reportsApi = {
  download: async (sessionId, filename) => {
    const res = await api.get(`/sessions/${sessionId}/report`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `PSV_${sessionId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export default api;
