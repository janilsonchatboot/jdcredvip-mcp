# Arquitetura Modular JD CRED VIP

Este guia resume como o backend (MCP) e o frontend (JD Talk) foram reorganizados para a arquitetura modular. Ele serve como referencia rapida para criar novos modulos, localizar arquivos e habilitar/desabilitar o modo legado.

## Backend (jdcredvip-mcp)

- **Core compartilhado** (`src/core`) concentra `env`, `database`, `logger` e os middlewares de autenticacao (`authenticateRequest`, `requiresRole`, `ensureIntegrationAuthorized`, `actorFromRequest`).
- **Modulos** vivem em `src/modules/<dominio>`. Cada modulo possui `*.routes.js`, `*.controller.js` e `*.service.js`. Exemplos:
  - `modules/clientes` -> `/api/clientes`
  - `modules/importacao` -> `/import/*` (upload, historico e limpeza)
  - `modules/dashboard` -> `/api/dashboard`, `/api/dashboard/resumo`, `/api/dashboard/ranking`, `/api/dashboard/trend`
  - `modules/configuracoes` -> `/api/config/<bancos|promotoras|produtos>`
  - `modules/core-status` -> `/api/core/status` (manifest GAIA + uptime/memoria)
- **Agregador** (`src/routes.js`) registra todos os modulos no Express. O novo `src/server.js` usa esse agregador e mantem aliases legados (ex.: `/dashboard/ranking`, `/api/publicar-meta`) enquanto `FEATURE_MODULAR_ROUTES=true`.
- **Feature flag**:
  - `.env` ou `.env.example` agora possuem `FEATURE_MODULAR_ROUTES=true`.
  - Ajuste para `false` caso precise subir o servidor antigo (`src/legacy/server-legacy.js`), util para rollback.
  - Ao iniciar (`npm start`), o bootstrap verifica a flag antes de carregar o servidor modular.
- **Caches inteligentes**: `dashboard.service` e `metas.service` utilizam `createTtlCache` (10 min) para dashboard/resumo/ranking e sao invalidados automaticamente quando novas metas sao publicadas.
- **Logs estruturados**: `modules/auditoria/integration-log.service.js` grava JSON com contexto (origem, modulo, ator, payload, requestId). Esse formato e reutilizado no dashboard e na Central de Logs.

### Convencoes

1. **Imports absolutizados**: `package.json` define o campo `imports` (`#core`, `#modules`, `#utils`, `#importers`) para evitar caminhos relativos quebradicos.
2. **Controllers finos**: validam entrada, chamam servicos e retornam a resposta no mesmo contrato usado antes da refatoracao.
3. **Compatibilidade**: novos endpoints residem em `/api/<modulo>`, mas aliases antigos permanecem ate o proximo ciclo de release.

## Frontend (jdtalk-main)

- **Estrutura**: todas as paginas CRM vivem em `client/src/modules/<dominio>/<Componente>Page.tsx`.
- **Servicos por modulo**: cada modulo expoe um arquivo `services/*.api.ts` responsavel por:
  - centralizar chamadas a API (`backendJson/backendPostJson` etc.);
  - exportar os tipos usados pelas paginas (ex.: `RankingResumo`, `MetaItem`, `ImportHistoryItem`);
  - construir query strings / payloads sem duplicacao.
- **Roteamento lazy**: `client/src/routes/index.tsx` faz o lazy import (`React.lazy`) de cada modulo e aplica o mesmo `ProtectedRoute`. `App.tsx` apenas carrega providers (Auth + DashboardFilter + Theme + Tooltip + Toast).
- **Padrao de consulta**: componentes utilizam `useQuery` ou `useSuspenseQuery` com funcoes vindas dos servicos (`fetchDashboardTrend`, `fetchIntegrationLogs`, `listMetas`, etc.), mantendo a mesma logica de cache/invalidação.
- **Novidades GAIA v3.05**:
  - `modules/dashboard` ganhou `components/` e `hooks/useDashboardData.ts` com Suspense, DateRangePicker global e widgets (cards com tooltips e variacoes, grafico de produtos com icones, Trend comparativo, Top 5 e painel de logs com modal).
  - `modules/logs/LogsPage.tsx` e a nova Central de Logs (filtros, busca textual e exportacao CSV) consumindo `/api/auditoria/integracoes`.
  - `modules/configuracoes/ConfiguracoesPage.tsx` consome `/api/core/status` para listar o manifest GAIA diretamente no CRM.

### Servicos implementados

- `modules/clientes/services/clientes.api.ts`
- `modules/contratos/services/contratos.api.ts`
- `modules/dashboard/services/dashboard.api.ts`
- `modules/followups/services/followups.api.ts`
- `modules/importacao/services/importacao.api.ts`
- `modules/metas/services/metas.api.ts`
- `modules/ranking/services/ranking.api.ts`
- `modules/configuracoes/services/configuracoes.api.ts` (bancos, promotoras, produtos e status GAIA)

## Build e testes

```bash
# Backend
npm --prefix jdcredvip-mcp test

# Frontend (gera dist/ e valida chunking)
npm --prefix jdtalk/jdtalk-main run build
```

Durante o build do frontend, o `vite.config.ts` esta configurado com `manualChunks` para manter os bundles principais abaixo de 500 kB. Ajuste `chunkSizeWarningLimit` somente se for realmente necessario.

## Proximos passos sugeridos

- Ao criar um novo dominio, copie a estrutura `modules/<dominio>` (service/controller/routes) no MCP.
- No frontend, sempre acompanhe o modulo com um `services/*.api.ts` equivalente para que as paginas permaneçam enxutas.
- Documente novos endpoints adicionando-os a este arquivo e, quando aplicavel, ao `docs/jdcredvip-endpoints-checklist.md`.
