# Deploy no Hostinger

Este guia resume a configuração para publicar o backend (`jdcredvip-mcp`) no Hostinger e manter o frontend/agent do JDTalk em produção.

## 1. Estrutura de Pastas no Servidor

- Defina o diretório raiz do aplicativo Node como `<workspace>/jdcredvip-mcp`.
- Certifique-se de que os comandos de build/start usem o `package.json` dentro dessa pasta.
  - Instalação: `npm --prefix jdcredvip-mcp install`
  - Start: `npm --prefix jdcredvip-mcp run start` (ou configure o script padrão do Hostinger para `npm run start:backend` no `package.json` da raiz).

## 2. Variáveis de Ambiente (Backend)

Cadastre as variáveis abaixo no painel **Hostinger > Websites > Gerenciar > Ambiente**:

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta exposta pelo serviço (usar valor sugerido pelo Hostinger). |
| `TRIAGEM_URL` | URL pública que o Postman/integrações vão usar (ex.: `https://api.seudominio.com`). |
| `API_KEY` | Chave utilizada por serviços externos para autenticação. |
| `DB_CLIENT` | `pg` para PostgreSQL ou `mysql2` para MySQL. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexão com o banco gerenciado. |
| `DB_SSL` | `true` se a hospedagem exigir TLS. |
| `POSTMAN_API_KEY`, `APIHOSTGER_TOKEN` | Tokens usados para testes/integrações (caso necessário). |
| `BLOGGER_*` | Apenas se for utilizar os scripts de publicação automática de blog. |

**Importante:** Não suba arquivos `.env` ou JSONs de credencial para o repositório. Use apenas o painel de variáveis ou serviços secretos (ex.: Vault da Hostinger).

## 3. Banco de Dados

- Configure o banco (Postgres/MySQL) previamente e garanta que a porta esteja liberada para a hospedagem.
- Se usar SSL obrigatório, deixe `DB_SSL=true`.
- O projeto cria/atualiza as tabelas (`meta_publications`, `meta_products`) automaticamente ao subir.

## 4. Crontab / Scripts Auxiliares

Se for rodar scripts de automação (ex.: gerar CSVs, publicar posts), utilize cron jobs que chamem:

```bash
npm --prefix jdcredvip-mcp run start   # para serviços permanentes
node jdcredvip-mcp/scripts/<nome-do-script>.mjs ...  # tarefas pontuais
```

## 5. Monitoramento e Logs

- Configure logs do Hostinger para capturar stdout/stderr do processo Node.
- Caso utilize PM2 ou outro gerenciador, mantenha o arquivo de configuração dentro de `jdcredvip-mcp/` e ajuste os caminhos relativos.

## 6. Postman / QA

- Crie um ambiente no Postman com variáveis `{{baseUrl}}`, `{{API_KEY}}`, etc., apontando para a URL em produção.
- Antes de publicar uma nova versão, execute a coleção de testes usando as variáveis de produção para garantir que tudo responde como esperado.

---

Para o frontend JDTalk, siga o processo de build (Vite) e publique em um serviço adequado (ex.: Supabase, Vercel ou outra hospedagem de Node). As variáveis necessárias estão detalhadas em `jdtalk/jdtalk-main/README.md`.
