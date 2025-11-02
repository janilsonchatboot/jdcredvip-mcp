# JD CRED VIP – Full Stack Workspace

Este repositório reúne o backend operacional da JD CRED VIP e o frontend/agent do JDTalk. Cada subprojeto mantém suas dependências e documentação próprias dentro do monorepo.

```
.
+-- jdcredvip-mcp/   # backend: motor de triagem, automações e serviços auxiliares
+-- jdtalk/          # frontend + agent runtime do JDTalk
```

## Projetos

### `jdcredvip-mcp/` – Motor de Triagem e Automação
Backend em Node.js (Express + Knex) com scripts auxiliares (ES Modules/Python). Recursos principais:

- Triagem de clientes (`POST /triagem`) com regras atualizadas de produtos JD CRED VIP.
- Publicação/consulta de metas (`/api/publicar-meta`, `/api/metas`, `/api/dashboard`) com persistência em banco relacional (Postgres ou MySQL).
- Dashboard web em `/dashboard` servindo os dados mais recentes.
- Scripts em `scripts/` para normalizar planilhas, gerar assets de blog e publicar posts via Blogger API.

Documentação: [`jdcredvip-mcp/README.md`](jdcredvip-mcp/README.md)

### `jdtalk/` – Plataforma de Comunicação e IA
Aplicação full-stack (React + Express + Drizzle ORM) utilizada pelo time para atendimento e automações com IA. Dentro de `jdtalk/jdtalk-main/`:

- `client/`: frontend em React/Vite.
- `server/`: backend Node/Express com WebSocket e integrações.
- `agent-runtime/`: agente Codex (Supabase Realtime + OpenAI) com análise automática de extratos INSS.
- `shared/`: esquemas e tipos compartilhados (Zod/Drizzle).

Documentação: [`jdtalk/jdtalk-main/README.md`](jdtalk/jdtalk-main/README.md)

## Fluxo de Trabalho

1. **Instalação**
   - Backend: `cd jdcredvip-mcp && npm install`
   - Frontend: `cd jdtalk/jdtalk-main && npm install`
   - Também é possível usar o `package.json` da raiz: `npm run install:all`

2. **Executar**
   - Backend: `npm --prefix jdcredvip-mcp run start` (porta padrão 8080, ver `.env.example`).
   - Frontend/Agent: `npm --prefix jdtalk/jdtalk-main run dev` (ou os scripts descritos no README do JDTalk).

3. **Variáveis de ambiente**
   - Não versionamos `.env`. Cada projeto traz um `.env.example` com o que precisa ser preenchido.
   - Segredos (Google, OpenAI, Hostinger etc.) devem ser cadastrados apenas nos painéis de deploy ou cofres secretos.

4. **Deploy**
   - Hostinger (backend): aponte o diretório de execução para `jdcredvip-mcp/`, rode `npm install` e `npm start`.
   - Frontend: gere build Vite e publique no serviço escolhido (Supabase, Vercel, etc.).
   - QA/Postman: configure um ambiente com o host em produção para validar os endpoints.
   - Guia detalhado: [`docs/deploy-hostinger.md`](docs/deploy-hostinger.md)

## Documentação adicional
- Checklist de endpoints: [`docs/jdcredvip-endpoints-checklist.md`](docs/jdcredvip-endpoints-checklist.md)
- Material legado/auxiliar: [`docs/legacy/`](docs/legacy/)

## Convenções e Git

- Arquivos sensíveis (planilhas, CSVs operacionais, PDFs internos, chaves JSON) continuam fora do repositório.
- O `.gitignore` cobre dist, caches, segredos e diretórios temporários gerados durante o desenvolvimento.
- Para comandos combinados há o `package.json` na raiz (ex.: `npm run start:backend`, `npm run dev:frontend`).

## Próximos Passos

1. Configure as variáveis de ambiente no Hostinger/Supabase conforme o guia em `docs/deploy-hostinger.md`.
2. Utilize o Postman com os novos tokens para validar os endpoints em produção.
3. Opcional: crie tags ou releases quando concluir milestones importantes do monorepo.

Vamos em frente! ????
