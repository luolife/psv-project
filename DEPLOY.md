# Publicacao do PSV

Este roteiro separa a aplicacao em frontend, API e banco de dados. O GitHub
armazena apenas o codigo; dados de profissionais e participantes devem ficar em
um banco de producao protegido.

## 1. Enviar ao GitHub

Crie um repositorio privado e envie somente o conteudo desta pasta. Antes do
primeiro envio, confirme que `git status` nao apresenta `.env`, bancos `.db`,
logs, capturas ou arquivos da dissertacao.

```bash
git init
git add .
git commit -m "Versao inicial do PSV"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

## 2. Banco PostgreSQL

Crie um banco PostgreSQL gerenciado e guarde sua URL de conexao. Nao registre a
senha no GitHub. A API cria e atualiza as tabelas ao iniciar.

Variavel necessaria:

```text
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:5432/BANCO
```

## 3. Publicar a API

No servico Python escolhido, conecte o repositorio e defina `psv` como
diretorio raiz. O `Dockerfile` dessa pasta pode ser usado diretamente.

Comando de inicializacao, quando solicitado pela plataforma:

```text
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Configure as variaveis:

```text
DATABASE_URL=URL_DO_POSTGRESQL
SECRET_KEY=CHAVE_ALEATORIA_LONGA_E_EXCLUSIVA
DEBUG=false
ACCESS_TOKEN_EXPIRE_MINUTES=480
ALLOWED_ORIGINS=["https://DOMINIO-DO-FRONTEND"]
```

Depois, confirme que `https://DOMINIO-DA-API/health` retorna o estado `ok`.

## 4. Publicar a interface

Na hospedagem do frontend, conecte o mesmo repositorio e configure:

```text
Diretorio raiz: psv-frontend
Comando de instalacao: npm ci
Comando de build: npm run build
Diretorio de saida: dist
```

Variavel necessaria:

```text
VITE_API_URL=https://DOMINIO-DA-API
```

O arquivo `vercel.json` ja preserva as rotas internas da aplicacao em uma
hospedagem Vercel.

## 5. Revisao antes de liberar o acesso

- Manter o repositorio privado durante a configuracao inicial.
- Usar uma `SECRET_KEY` nova, forte e nunca reutilizada.
- Manter `DEBUG=false` em producao.
- Restringir `ALLOWED_ORIGINS` ao dominio oficial do frontend.
- Confirmar HTTPS no frontend, na API e no banco.
- Criar uma conta nova e testar cadastro, login e edicao do perfil.
- Testar cadastro e exclusao de participante.
- Testar triagem, tarefas, resultados e os dois tipos de relatorio.
- Conferir Termo de Uso, Politica de Privacidade e Manual Tecnico.
- Confirmar o prazo de disponibilidade de 60 dias dos relatorios.
- Definir rotina de backup, monitoramento e resposta a incidentes.

