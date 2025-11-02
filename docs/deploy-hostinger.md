# Deploy no Hostinger

Este guia resume a configuracao para publicar o backend (`jdcredvip-mcp`) no Hostinger e manter o frontend/agent do JDTalk em producao.

## 1. Estrutura de Pastas no Servidor

- Defina o diretorio raiz do aplicativo Node como `<workspace>/jdcredvip-mcp`.
- Certifique-se de que os comandos de build/start usem o `package.json` dentro dessa pasta.
  - Instalacao: `npm --prefix jdcredvip-mcp install`
  - Start: `npm --prefix jdcredvip-mcp run start` (ou configure o script padrao do Hostinger para `npm run start:backend` no `package.json` da raiz).

## 2. Variaveis de Ambiente (Backend)

Cadastre as variaveis abaixo no painel **Hostinger > Websites > Gerenciar > Ambiente**:

| Variavel | Descricao |
|----------|-----------|
| `PORT` | Porta exposta pelo servico (usar valor sugerido pelo Hostinger). |
| `TRIAGEM_URL` | URL publica que o Postman/integrações vao usar (ex.: `https://api.seudominio.com`). |
| `API_KEY` | Chave utilizada por servicos externos para autenticacao. |
| `DB_CLIENT` | `pg` para PostgreSQL ou `mysql2` para MySQL. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexao com o banco gerenciado. |
| `DB_SSL` | `true` se a hospedagem exigir TLS. |
| `POSTMAN_API_KEY`, `APIHOSTGER_TOKEN` | Tokens usados para testes/integrações (caso necessario). |
| `BLOGGER_*` | Apenas se for utilizar os scripts de publicacao automatica de blog. |
| `CREFAZ_API_BASE_URL`, `CREFAZ_API_KEY`, `CREFAZ_WEBHOOK_SECRET` | Credenciais/segredos da financeira Crefaz. |
| `NEXXO_API_BASE_URL`, `NEXXO_API_TOKEN` | Token da promotora Nexxo para sincronizar contratos/comissoes. |

**Importante:** Nao suba arquivos `.env` ou JSONs de credencial para o repositorio. Use apenas o painel de variaveis ou servicos secretos (ex.: Vault da Hostinger).

## 3. Banco de Dados

- Configure o banco (Postgres/MySQL) previamente e garanta que a porta esteja liberada para a hospedagem.
- Se usar SSL obrigatorio, deixe `DB_SSL=true`.
- O projeto cria/atualiza as tabelas (`meta_publications`, `meta_products`, `crefaz_proposals`, `nexxo_contracts`, `nexxo_commissions`) automaticamente ao subir.

## 4. Crontab / Scripts Auxiliares

Se for rodar scripts de automacao (ex.: gerar CSVs, publicar posts), utilize cron jobs que chamem:

```bash
npm --prefix jdcredvip-mcp run start   # para servicos permanentes
node jdcredvip-mcp/scripts/<nome-do-script>.mjs ...  # tarefas pontuais
```

Para a sincronizacao Nexxo periodica, considere criar um job chamando:
```bash
curl -X POST https://<seu-servico>.onrender.com/integracoes/nexxo/sync \
  -H "x-api-key: $NEXXO_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contracts":[],"commissions":[]}'
```
(Atualize o payload de acordo com a integracao real.)

## 5. Monitoramento e Logs

- Configure logs do Hostinger para capturar stdout/stderr do processo Node.
- Caso utilize PM2 ou outro gerenciador, mantenha o arquivo de configuracao dentro de `jdcredvip-mcp/` e ajuste os caminhos relativos.

## 6. Postman / QA

- Crie um ambiente no Postman com variaveis `{{baseUrl}}`, `{{API_KEY}}`, `{{NEXXO_API_TOKEN}}`, etc., apontando para a URL em producao.
- Antes de publicar uma nova versao, execute a colecao de testes usando as variaveis de producao para garantir que tudo responde como esperado.

---

Para o frontend JDTalk, siga o processo de build (Vite) e publique em um servico adequado (ex.: Supabase, Vercel ou outra hospedagem de Node). As variaveis necessarias estao detalhadas em `jdtalk/jdtalk-main/README.md`.
