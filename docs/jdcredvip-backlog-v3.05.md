# JD CRED VIP – Backlog Operacional v3.05

Lista de tarefas derivadas do `docs/jdcredvip-roadmap-v3.05.md` para acompanhamento. Status possíveis: `todo`, `wip`, `done`. Datas baseiam-se no cronograma abaixo.

## Cronograma e Responsáveis

| Sprint | Janela sugerida | Squad principal | Suporte |
| ------ | --------------- | --------------- | ------- |
| Sprint 1 | 11–22 nov 2025 | Backend Squad (Segurança) | MCP Squad, DevOps |
| Sprint 2 | 25 nov – 6 dez 2025 | MCP + JDTalk Squad | Backend Squad |
| Sprint 3 | 9–20 dez 2025 | MCP Squad (Integrações) | Batch Agent, Ops |
| DevOps Contínuo | Recorrente | DevOps Squad | Todos os squads |

## Sprint 1 – Segurança + Fundamentos (JWT e CRUDs principais)

| ID | Status | Due | Tarefa | Owner sugerido | Dependências |
| -- | ------ | --- | ------ | -------------- | ------------- |
| S1-01 | wip | 13 nov | Modelar tabelas `users`, `sessions` e seeds iniciais | Backend Squad (Rafa) | - |
| S1-02 | todo | 15 nov | Implementar endpoints `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | Backend Squad (Rafa) | S1-01 |
| S1-03 | todo | 18 nov | Adicionar middleware JWT + roles (admin/promotor/supervisor) nas rotas existentes | Backend Squad (Rafa) | S1-02 |
| S1-04 | wip | 14 nov | Criar migrations/schemas `clientes`, `contratos`, `followups`, `promotoras`, `bancos` | MCP Squad (Ana) | S1-01 |
| S1-05 | todo | 20 nov | Entregar CRUDs `/api/clientes` e `/api/contratos` com filtros e paginação | MCP Squad (Ana) | S1-04 |
| S1-06 | todo | 22 nov | Entregar CRUDs `/api/followups`, `/api/promotoras`, `/api/bancos` | MCP Squad (Ana) | S1-04 |
| S1-07 | todo | 22 nov | Atualizar `.env.example` + documentação com novas variáveis JWT/DB | DevOps Squad (Camila) | S1-02 |

## Sprint 2 – Follow-ups e Dashboards Realtime

| ID | Status | Due | Tarefa | Owner sugerido | Dependências |
| -- | ------ | --- | ------ | -------------- | ------------- |
| S2-01 | todo | 27 nov | Conectar módulos frontend (clientes/contratos/followups) aos novos endpoints via React Query | JDTalk Squad (Bianca) | S1-05, S1-06 |
| S2-02 | todo | 29 nov | Implementar `GET /dashboard/resumo` (KPIs, produtos, promotoras, bancos, timeline) | Backend Squad (Rafa) | S1-05 |
| S2-03 | todo | 2 dez | Implementar `GET /dashboard/ranking` (promotores, bancos, follow-ups ativos) | Backend Squad (Rafa) | S1-05 |
| S2-04 | todo | 4 dez | Publicar eventos Supabase Realtime (clientes, contratos, followups, metas) | Backend Squad (Rafa) | S2-02, S2-03 |
| S2-05 | todo | 5 dez | Atualizar UI do dashboard (cards, gráficos, ranking) e validar snapshots | JDTalk Squad (Bianca) | S2-02, S2-03 |
| S2-06 | todo | 6 dez | Documentar KPIs no blueprint e checklist de endpoints | Docs Squad (Leo) | S2-02, S2-03 |

## Sprint 3 – Integrações Nexxo, WorkBank e Yuppie

| ID | Status | Due | Tarefa | Owner sugerido | Dependências |
| -- | ------ | --- | ------ | -------------- | ------------- |
| S3-01 | done | 10 dez | Criar endpoint `POST /import/upload` com detecção automática da promotora | MCP Squad (Ana) | S1-06 |
| S3-02 | done | 12 dez | Implementar serviço de parsing CSV/XLSX para Nexxo, WorkBank e Yuppie | MCP Squad (Ana) | S3-01 |
| S3-03 | done | 15 dez | Persistir dados em `nexxo_*`, `workbank_*`, `yuppie_*` e conciliar com clientes/contratos | MCP Squad (Ana) | S3-02 |
| S3-04 | todo | 17 dez | Expor rota `POST /import/conciliar` e atualizar `/integracoes/status` com métricas por promotora | MCP Squad (Ana) | S3-03 |
| S3-05 | todo | 18 dez | Criar scripts/cron (n8n) para sincronização periódica de cada promotora | Batch Agent Squad (Diego) | S3-03 |
| S3-06 | todo | 20 dez | Atualizar manual operacional e dashboards com dados importados | Ops Squad (Marina) | S3-04 |

## DevOps Contínuo – Segredos e QA/Deploy

| ID | Status | Due | Tarefa | Owner sugerido | Dependências |
| -- | ------ | --- | ------ | -------------- | ------------- |
| D1 | todo | 22 nov | Formalizar política de rotação de segredos (Supabase, Nexxo, WorkBank, Yuppie, OpenAI, Blogger) | DevOps Squad (Camila) | - |
| D2 | todo | 25 nov | Adicionar script `npm run deploy:qa` na raiz (testes → build → deploy Hostinger → Postman) | DevOps Squad (Camila) | S1-05 |
| D3 | todo | 27 nov | Atualizar `docs/deploy-hostinger.md` com checklist automatizado e registro QA | DevOps Squad (Camila) | D2 |
| D4 | todo | 6 dez | Configurar monitoramento/logs para capturar erros das integrações e dashboard | DevOps Squad (Camila) | S2-02, S3-03 |

Atualize este backlog ao final de cada sprint ou quando novas demandas surgirem.
