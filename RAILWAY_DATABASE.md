# Ajuste da conexao do Railway

Quando a API e o PostgreSQL estiverem no mesmo projeto Railway, a API deve
receber a URL interna do banco por uma variavel de referencia.

Na aba `Variables` do servico da API, configure:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Use o nome real do servico PostgreSQL caso ele nao se chame `Postgres`. A forma
mais segura e escolher `Add Reference` e selecionar a variavel `DATABASE_URL`
do servico de banco.

Nao cole `DATABASE_PUBLIC_URL` nem uma URL contendo `.proxy.rlwy.net` para a
comunicacao entre servicos do mesmo projeto. O endereco publico e destinado a
conexoes externas e pode mudar quando o banco for recriado.

Depois de salvar a referencia:

1. confirme que o servico PostgreSQL esta ativo;
2. aplique as alteracoes pendentes;
3. reinicie ou publique novamente a API;
4. teste o endpoint `/health` da API;
5. teste o cadastro e o login pelo frontend.

