# JD CRED VIP – Roadmap Técnico v3.05

Documento alinhado ao `JD_CRED_VIP_Riscos_e_Proximos_Passos_v3.05.txt` e às recomendações do relatório geral. Serve como plano operacional para o trimestre, conectando backend (`jdcredvip-mcp`), frontend/agent (JDTalk) e automações MCP/cron.

## Visão Geral de Prioridades

| Prioridade | Frente | Objetivo | Responsáveis sugeridos |
| ---------- | ------ | -------- | ---------------------- |
| 🔴 Alta | Segurança & Acesso | JWT + roles (admin, promotor, supervisor) e higiene de segredos | Backend / DevOps |
| 🔴 Alta | CRUDs Core | Endpoints e tabelas de clientes, contratos, follow-ups, promotoras e bancos | Backend / MCP |
| 🟠 Média | Dashboards Analíticos | `/dashboard/resumo` e `/dashboard/ranking` com Supabase Realtime | Backend + JDTalk |
| 🟠 Média | Integrações Promotoras | Fluxo de importação Nexxo, WorkBank e Yuppie (upload → parsing → conciliação) | MCP / Batch Agent |
| 🟡 Baixa | QA & Deploy | Política de `.env`, comando `npm run deploy:qa`, checklist Hostinger/Postman | DevOps |

---

## 1. Segurança e Autenticação

- **Entrega**: middleware JWT com roles `admin`, `promotor`, `supervisor`, suporte a refresh tokens e cookies HTTPOnly quando necessário.
- **Tarefas**:
  - Definir schema `users`/`sessions` (Knex/Drizzle) e migrations.
  - Implementar endpoints `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
  - Atualizar `.env.example` com `JWT_SECRET`, `JWT_EXPIRES_IN`, `COOKIE_SECRET`, `REFRESH_TOKEN_TTL`.
  - Propagar controle de acesso nas rotas existentes (metas, triagem, integrações).
- **Critérios de aceite**:
  - Todos os endpoints sensíveis exigem header `Authorization: Bearer <token>`.
  - Tokens rotacionados e invalidação via blacklist/versão em base.
  - Documentação atualizada em `docs/jdcredvip-endpoints-checklist.md` e README.

## 2. CRUDs Core (Clientes, Contratos, Follow-ups, Promotoras, Bancos)

- **Entrega**: desbloquear módulos placeholder do frontend e permitir persistência única no MCP.
- **Endpoints alvo**:
  - `GET/POST /api/clientes`, `GET/PUT/DELETE /api/clientes/:id`
  - `GET/POST /api/contratos`, `PUT /api/contratos/:id`
  - `GET/POST /api/followups`, `PUT /api/followups/:id`
  - `GET/POST /api/promotoras`, `PUT/DELETE /api/promotoras/:id`
  - `GET/POST /api/bancos`, `PUT/DELETE /api/bancos/:id`
- **Requisitos técnicos**:
  - Migrations Knex + schemas Drizzle (para compartilhamento com JDTalk).
  - Validações Zod (campos obrigatórios, formatação CPF/CNPJ, status).
  - Suporte a filtros (`?promotora=`, `?status=`, `?produto=`) e paginação.
- **Integração frontend**:
  - Atualizar hooks/queries React Query em `jdtalk/jdtalk-main` para consumir os novos endpoints.
  - Configurar Supabase Realtime channels `clientes`, `contratos`, `followups`.

## 3. Dashboards Analíticos

- **Entrega**: KPIs e rankings para alimentar cards, gráficos e metas do CRM.
- **Endpoints**:
  - `GET /dashboard/resumo`: retorna blocos `metrics`, `produtos`, `promotoras`, `bancos`, `timeline`.
  - `GET /dashboard/ranking`: ranking de promotores, bancos e follow-ups ativos.
- **Implementação**:
  - Criar serviço de agregação (Knex) com cache local opcional em `cache/dashboard.json`.
  - Emitir eventos para Supabase (ou WebSocket fallback) quando metas/contratos forem atualizados.
  - Atualizar `docs/jdcredvip_blueprint.json` e `docs/jdcredvip_front_blueprint_v3.04.json` com status “implementado”.
- **Testes**:
  - Rotinas Postman colecionando KPIs reais.
  - Snapshot front (JDTalk) validando cards e gráficos.

## 4. Integrações das Promotoras (Nexxo, WorkBank e Yuppie)

- **Entrega**: pipeline único de importação (upload → parsing → conciliação → persistência) cobrindo as três promotoras oficiais.
- **Fluxo proposto**:
  1. `POST /import/upload` recebe CSV/XLSX, identifica promotora automaticamente (nome do arquivo ou campo).
  2. Serviço de parsing normaliza campos (cliente, contrato, status, volume, comissão).
  3. `POST /import/conciliar` grava/atualiza tabelas `nexxo_contracts`, `workbank_contracts`, `yuppie_contracts` e vincula clientes/contratos internos.
  4. Job cron/n8n chama `/import/<promotora>` periodicamente para sincronização full.
- **Itens específicos**:
  - Yuppie deve seguir o mesmo template (mesmo que não exista tabela ainda, criar `yuppie_*`).
  - Logs e métricas expostos em `GET /integracoes/status` com contadores por promotora.
  - Scripts auxiliares em `jdcredvip-mcp/scripts/` para rodar manualmente (CSV → JSON).

## 5. Gestão de Segredos e QA/Deploy

- **Segredos**:
  - Manter somente `.env.example` no repositório; credenciais reais em Hostinger secrets/Supabase.
  - Definir processo de rotação trimestral (Supabase, Nexxo, WorkBank, Yuppie, OpenAI, Blogger).
- **QA/Deploy**:
  - Criar comando `npm run deploy:qa` na raiz que execute:
    1. `npm run test` (ou suíte Postman via CLI).
    2. `npm run build:frontend` + verificação do backend (`node --check server.js`).
    3. Deploy Hostinger (`npm --prefix jdcredvip-mcp install && npm --prefix jdcredvip-mcp run start`).
    4. Execução automática da coleção Postman apontando para produção.
  - Atualizar `docs/deploy-hostinger.md` com o fluxo e um checklist para registro de QA.

---

### Próximos Passos Imediatos

1. **Sprint 1**: Autenticação + CRUD clientes/contratos + promotoras/bancos.
2. **Sprint 2**: Follow-ups + dashboards resumo/ranking (com eventos Realtime).
3. **Sprint 3**: Módulo de importação completo (Nexxo, WorkBank, Yuppie) + cron/batch.
4. **DevOps contínuo**: política de segredos, `deploy:qa` e monitoramento Hostinger/Postman.

Atualize este roadmap conforme cada entrega for concluída (versão atual: v3.05 – Novembro/2025).

