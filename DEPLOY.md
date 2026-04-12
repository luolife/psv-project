# PSV — Guia de Deploy
## Railway (backend) + Supabase (banco) + Vercel (frontend)

---

## Pré-requisitos

- Conta no GitHub (gratuita): https://github.com
- Conta no Railway (gratuita): https://railway.app
- Conta no Supabase (gratuita): https://supabase.com
- Conta no Vercel (gratuita): https://vercel.com

---

## Passo 1 — Preparar o repositório no GitHub

Estrutura esperada no repositório:
```
psv-project/
├── psv/                  ← backend Python
│   ├── main.py
│   ├── requirements.txt
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── core/
│   └── routers/
└── psv-frontend/         ← frontend React
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
```

No terminal:
```bash
git init
git add .
git commit -m "PSV inicial"
git remote add origin https://github.com/SEU_USUARIO/psv-project.git
git push -u origin main
```

---

## Passo 2 — Banco de dados no Supabase

1. Acesse https://supabase.com e crie um projeto
2. Escolha região: South America (São Paulo)
3. Defina uma senha forte para o banco
4. Aguarde o projeto inicializar (~2 min)
5. Vá em: Settings → Database → Connection string → URI
6. Copie a URI — será parecida com:
   ```
   postgresql://postgres:[SENHA]@db.xxxx.supabase.co:5432/postgres
   ```
7. Guarde essa string — vai usar no próximo passo

---

## Passo 3 — Backend no Railway

1. Acesse https://railway.app e faça login com o GitHub
2. Clique em "New Project" → "Deploy from GitHub repo"
3. Selecione seu repositório
4. Railway vai detectar Python automaticamente

### Configurar o diretório raiz
Em Settings → Source:
- Root Directory: `psv`

### Configurar variáveis de ambiente
Em Variables, adicione:

```
DATABASE_URL    = postgresql://postgres:[SENHA]@db.xxxx.supabase.co:5432/postgres
SECRET_KEY      = (gere com: python -c "import secrets; print(secrets.token_hex(32))")
DEBUG           = false
ALLOWED_ORIGINS = ["https://psv-frontend.vercel.app"]
ACCESS_TOKEN_EXPIRE_MINUTES = 480
```

### Configurar o comando de start
Em Settings → Deploy:
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Verificar o deploy
Após o deploy, Railway gera uma URL pública tipo:
`https://psv-production-xxxx.up.railway.app`

Teste acessando: `https://sua-url.railway.app/health`
Deve retornar: `{"status": "ok", "version": "0.1.0"}`

---

## Passo 4 — Frontend no Vercel

### Atualizar a URL da API no frontend
Antes de fazer deploy, edite `psv-frontend/src/api/client.js`:

```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  // ...
});
```

O `VITE_API_URL` será configurado como variável de ambiente no Vercel.

### Deploy no Vercel
1. Acesse https://vercel.com e faça login com GitHub
2. Clique em "New Project"
3. Importe seu repositório
4. Configure:
   - Framework Preset: Vite
   - Root Directory: `psv-frontend`
   - Build Command: `npm run build` (mas ajuste o outDir!)
   - Output Directory: `dist`

**Importante:** para o Vercel, o `vite.config.js` precisa de outDir diferente:
```javascript
build: {
  outDir: "dist",  // Vercel usa dist, não ../psv/static
}
```

Crie um segundo config ou use variável de ambiente para distinguir.

### Variáveis de ambiente no Vercel
Em Settings → Environment Variables:
```
VITE_API_URL = https://sua-url.railway.app
```

### SPA routing — criar vercel.json
Crie `psv-frontend/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
Isso garante que rotas como `/sessions/123/checklist` funcionem ao recarregar.

---

## Passo 5 — Atualizar CORS no Railway

Após o Vercel gerar a URL do frontend (ex: `https://psv-abc123.vercel.app`),
atualize a variável no Railway:

```
ALLOWED_ORIGINS = ["https://psv-abc123.vercel.app"]
```

---

## Resultado final

```
Profissional acessa → https://psv-abc123.vercel.app
                              ↓
                    Vercel serve o React
                              ↓
              React chama → https://psv-xxxx.railway.app
                              ↓
                    Railway roda FastAPI
                              ↓
                    Supabase PostgreSQL
```

---

## Domínio personalizado (opcional)

Tanto Railway quanto Vercel permitem conectar um domínio próprio gratuitamente.
Ex: `psv.seusite.com.br` → aponta para o Vercel
    `api.psv.seusite.com.br` → aponta para o Railway

---

## Limites dos planos gratuitos

| Serviço  | Limite gratuito                        | Quando pagar          |
|----------|----------------------------------------|-----------------------|
| Railway  | 500h/mês + 1GB RAM                     | Uso intenso contínuo  |
| Supabase | 500MB banco + 50MB storage             | Banco grande          |
| Vercel   | Sem limite para projetos pessoais      | Time/organização      |

Para uso clínico inicial (dezenas de avaliações/mês), os tiers gratuitos
são suficientes por tempo indeterminado.
