# PSV - Protocolo Sensorial Visual

Aplicacao web do Protocolo Sensorial Visual (PSV), composta por uma API em
FastAPI e uma interface em React. O sistema permite cadastro profissional,
gestao de participantes, triagem visual, tarefas computadorizadas, consulta de
documentos e emissao de relatorios.

## Estrutura

```text
PSV_SITE_GITHUB/
|-- psv/              # API, banco, regras e geradores de PDF
|-- psv-frontend/     # Interface React e documentos publicos finais
|-- .gitignore        # Impede o envio de dados e arquivos pessoais
|-- DEPLOY.md         # Roteiro de publicacao
`-- README.md
```

Esta versao nao inclui banco de dados local, contas de teste, arquivos `.env`,
capturas da dissertacao, documentos editaveis, logs, dependencias instaladas,
ferramentas locais ou versoes intermediarias dos PDFs.

## Desenvolvimento local

### API

```bash
cd psv
python -m venv .venv
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Interface

```bash
cd psv-frontend
npm ci
npm run dev
```

A interface fica em `http://127.0.0.1:5173` e a API em
`http://127.0.0.1:8000`.

## Publicacao

Consulte [DEPLOY.md](DEPLOY.md). A configuracao prevista usa:

- GitHub para armazenar o codigo;
- PostgreSQL gerenciado para o banco de dados;
- um servico Python para a API;
- uma hospedagem de frontend compativel com Vite.

## Protecao de dados

Nunca envie ao GitHub arquivos `.env`, bancos locais, relatorios gerados ou
dados de profissionais e participantes. Antes da publicacao real, utilize uma
chave secreta exclusiva, HTTPS, banco de producao e origens CORS restritas ao
dominio oficial.

Copyright 2026 PSV. Todos os direitos reservados.

