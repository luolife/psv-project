# PSV — Protocolo Sensorial Visual

Sistema web para aplicação do Protocolo Sensorial Visual (PSV), incluindo
check-list de sensibilidade visual e tarefas psicofísicas computadorizadas.

## Estrutura

```
psv-project/
├── psv/              ← Backend Python (FastAPI)
└── psv-frontend/     ← Frontend React (Vite)
```

## Rodar localmente

**Backend:**
```bash
cd psv
pip install -r requirements.txt
cp .env.example .env   # edite com seus valores
uvicorn main:app --reload
```
Acesse: http://localhost:8000/docs

**Frontend:**
```bash
cd psv-frontend
npm install
npm run dev
```
Acesse: http://localhost:5173

## Deploy

Veja o arquivo `DEPLOY.md` para instruções completas de deploy no
Railway (backend) + Supabase (banco) + Vercel (frontend).

## Tarefas computadorizadas

- **Contrast Sensitivity** — detecção de grating senoidal em diferentes contrastes
- **Motion Coherence** — discriminação de direção de movimento (campo de pontos)
- **Gabor Patch** — discriminação de orientação (±45°)

Cada task: 10 trials de prática (com feedback) + 80 trials principais.
