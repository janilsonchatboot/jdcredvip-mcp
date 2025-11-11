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
- Integrações Crefaz/Nexxo com armazenamento próprio para propostas, contratos e comissões.

Documenta??o: [`jdcredvip-mcp/README.md`](jdcredvip-mcp/README.md) + guia modular em [`docs/jdcredvip-modulos.md`](docs/jdcredvip-modulos.md)

### `jdtalk/` – Plataforma de Comunicação e IA
Aplicação full-stack (React + Express + Drizzle ORM) utilizada pelo time para atendimento e automações com IA. Dentro de `jdtalk/jdtalk-main/`:

- `client/`: frontend em React/Vite.
- `server/`: backend Node/Express com WebSocket e integrações.
- `agent-runtime/`: agente Codex (Supabase Realtime + OpenAI) com análise automática de extratos INSS.
- `shared/`: esquemas e tipos compartilhados (Zod/Drizzle).

Documentação: [`jdtalk/jdtalk-main/README.md`](jdtalk/jdtalk-main/README.md)

## Integrações disponíveis
- **Crefaz**: `POST /integracoes/crefaz/simular`, `POST /integracoes/crefaz/contratar`, `GET /integracoes/crefaz/propostas`
- **Nexxo**: `POST /integracoes/nexxo/sync`, `GET /integracoes/nexxo/contratos`, `GET /integracoes/nexxo/comissoes`, `GET /integracoes/status`

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

## Documentaýýo adicional
- Checklist de endpoints: [`docs/jdcredvip-endpoints-checklist.md`](docs/jdcredvip-endpoints-checklist.md)
- Material legado/auxiliar: [`docs/legacy/`](docs/legacy/)
- Observabilidade: logs de atividade ficam em `activity_logs` (ver seýýo abaixo).
- Importação de relatórios: consulte os endpoints /import/upload, /import/analisar e /import/historico.

## Observabilidade e Logs

- Toda requisiýýo tratada pelo backend gera um registro em `activity_logs`, incluindo rota, mýtodo, status HTTP, usuýrio (quando autenticado), origem (frontend, Postman, API) e um resumo sanitizado do payload.
- Os logs podem ser consultados direto no banco (`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 50;`) ou exportados para BI.
- Campos sensýveis (password, token, secret etc.) sýo automaticamente mascarados e cargas extensas sýo truncadas para manter o banco enxuto.
- Utilize esse histýrico para depurar operaýýes vindas do frontend (ex.: criaýýo de clientes, triagem, importaýýes) antes de atuar nos serviýos.

## Convenções e Git

- Arquivos sensíveis (planilhas, CSVs operacionais, PDFs internos, chaves JSON) continuam fora do repositório.
- O `.gitignore` cobre dist, caches, segredos e diretórios temporários gerados durante o desenvolvimento.
- Para comandos combinados há o `package.json` na raiz (ex.: `npm run start:backend`, `npm run dev:frontend`).

## Próximos Passos

1. Configure as variáveis de ambiente no Hostinger/Supabase conforme o guia em `docs/deploy-hostinger.md`.
2. Utilize o Postman com os novos tokens para validar os endpoints em produção.
3. Opcional: crie tags ou releases quando concluir milestones importantes do monorepo.

Vamos em frente! ????
