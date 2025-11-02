# JD CRED VIP - Revisao de Endpoints (Nov/2025)

Documento de referencia para validar o arquivo original "JD CRED VIP - API de Backend (Endpoints)" e apontar o que ja existe no `jdcredvip-mcp`, o que precisa ser planejado e o que pode ser removido do escopo atual.

## Legenda
- ? Implementado no `jdcredvip-mcp`
- ?? Planejado / precisa ser modelado
- ? Nao se aplica ao escopo atual (ou depende de outra equipe/sistema)

## 1. Autenticacao e Usuarios
| Metodo | Endpoint | Status | Observacoes |
|--------|----------|--------|-------------|
| POST | `/auth/login` | ?? | Necessario definir modelo de usuarios e politica JWT (nao existe hoje). |
| POST | `/auth/register` | ?? | Idem: depende de cadastro e perfis. |
| GET | `/auth/me` | ?? | Apos login, retornar dados do usuario autenticado. |
| POST | `/auth/logout` | ? | Backend stateless. Logout pode ser tratado no cliente invalidando token. |

## 2. Clientes
| Metodo | Endpoint | Status | Observacoes |
|--------|----------|--------|-------------|
| GET | `/clientes` | ?? | Precisa modelar tabela `clientes` com filtros (produto, promotora, status, data). |
| GET | `/clientes/:id` | ?? | Depende do mesmo modelo. |
| POST | `/clientes` | ?? | Criar cliente manual/API. |
| PUT | `/clientes/:id` | ?? | Atualizacao de dados. |
| DELETE | `/clientes/:id` | ?? | Soft delete (flag `deleted_at`). |
| POST | `/clientes/importar` | ? | Ideal implementar como job/worker; fora do escopo MVP. |
| GET | `/clientes/exportar` | ? | Pode ser feito via consultas ou BI; deixar para etapa posterior. |

## 3. Contratos e Propostas
| Metodo | Endpoint | Status | Observacoes |
|--------|----------|--------|-------------|
| GET | `/contratos` | ?? | Necessario definir esquema `contratos`. |
| GET | `/contratos/:id` | ?? | Idem. |
| POST | `/contratos` | ?? | Depende de integracao com promotoras (Nexxo, WorkBank). |
| PUT | `/contratos/:id` | ?? | Atualizacao de status. |
| GET | `/contratos/promotora/:nome` | ? | Pode ser atendido com query param em `/contratos` (`?promotora=`). |
| GET | `/contratos/produto/:tipo` | ? | Idem acima (`?produto=`). |
| POST | `/contratos/sincronizar` | ? | Estrategia preferida: jobs especificos por integradora. |

## 4. Comissoes
| Metodo | Endpoint | Status | Observacoes |
|--------|----------|--------|-------------|
| GET | `/comissoes` | ?? | Requer tabela `comissoes`. |
| POST | `/comissoes/calcular` | ?? | Pode ser script/servico interno que atualiza dados. |
| PUT | `/comissoes/:id` | ?? | Ajuste manual. |
| GET | `/comissoes/resumo` | ?? | Dashboard resumido (somatorios). |

## 5. Follow-ups e Agenda
| Metodo | Endpoint | Status | Observacoes |
|--------|----------|--------|-------------|
| GET | `/followups` | ?? | Cadastro de follow-ups relacionado a clientes/contratos. |
| POST | `/followups` | ?? | Criar follow-up. |
| PUT | `/followups/:id` | ?? | Atualizar status/observacao. |
| GET | `/followups/hoje` | ? | Pode ser filtro `?data=hoje` em `/followups`. |
| POST | `/followups/gerar` | ? | Sugestao: processo batch/cron, nao endpoint publico. |

## 6. Dashboard e Metas
Endpoints existentes:
- ? `POST /api/publicar-meta`
- ? `GET /api/metas`
- ? `GET /api/metas/:id`
- ? `GET /api/dashboard`
- ? `GET /dashboard`

Pendencias sugeridas:
| Metodo | Endpoint | Status | Observacoes |
|--------|----------|--------|-------------|
| GET | `/dashboard/resumo` | ?? | Sumarizar por periodo/produto. Pode reutilizar `metaService`. |
| GET | `/dashboard/ranking` | ?? | Ranking por promotora/corretor. |

## 7. Integracoes Externas
| Metodo | Endpoint | Status | Observacoes |
|--------|----------|--------|-------------|
| POST | `/integracoes/nexxo/sync` | ? | Recebe contratos/comissoes e persiste nas tabelas `nexxo_*`. |
| GET | `/integracoes/nexxo/contratos` | ? | Consulta contratos sincronizados (filtros por status, produto, cliente). |
| GET | `/integracoes/nexxo/comissoes` | ? | Consulta comissoes sincronizadas. |
| POST | `/integracoes/workbank/sync` | ?? | Importar CSV ou consumir API WorkBank. |
| POST | `/integracoes/crefaz/simular` | ? | Simulacao basica persistida em `crefaz_proposals`. |
| POST | `/integracoes/crefaz/contratar` | ? | Atualiza proposta para contratado/esteira. |
| GET | `/integracoes/crefaz/propostas` | ? | Lista propostas com filtros. |
| GET | `/integracoes/status` | ? | Resumo geral das integracoes (contadores + ultimos logs). |

## 8. Triagem Automatica
- ? `POST /triagem`
- ? `GET /triagem/:id` – triagem atual e stateless (nao armazena historico). Se quisermos armazenar resultados, precisamos de tabela `triagens` ou usar `clientes`.

Sugestao: criar `POST /triagem/simular` e opcionalmente `GET /triagem/historico?clienteId=...` quando houver armazenamento.

## 9. Promotoras
| Metodo | Endpoint | Status | Observacoes |
|--------|----------|--------|-------------|
| GET | `/promotoras` | ?? | Requer tabela `promotoras`. Pode servir para combos/formularios. |
| GET | `/promotoras/:id` | ?? | Detalhes (tokens, contatos). |
| POST | `/promotoras` | ?? | Cadastrar promotora; sensivel – guardar apenas metadados (tokens em vault). |
| PUT | `/promotoras/:id` | ?? | Atualizacao. |
| DELETE | `/promotoras/:id` | ?? | Soft delete. |

## 10. Bancos (novo modulo)
| Metodo | Endpoint | Status | Observacoes |
|--------|----------|--------|-------------|
| GET | `/bancos` | ?? | Tabela `bancos` com informacoes basicas. |
| GET | `/bancos/:id` | ?? | Detalhe (coeficientes, documentos). |
| POST | `/bancos` | ?? | Cadastro manual. |
| PUT | `/bancos/:id` | ?? | Atualizar regras/coeficientes. |
| DELETE | `/bancos/:id` | ?? | Soft delete. |

## Conclusoes
1. **Existentes**: `/`, `/triagem`, `/api/publicar-meta`, `/api/metas`, `/api/metas/:id`, `/api/dashboard`, `/dashboard`, `/integracoes/crefaz/*`, `/integracoes/nexxo/*`, `/integracoes/status`.
2. **Prioridades imediatas**:
   - Modelar usuarios/autenticacao (JWT).
   - CRUD de clientes e contratos (essencial para o CRM).
   - Estrutura de follow-ups e promotoras.
3. **Para posterior**:
   - Importacoes em massa (CSV/Excel) e sincronizacao WorkBank.
   - Historicos/analises avancadas (`/dashboard/resumo`, `/dashboard/ranking`).
   - Armazenamento de historico da triagem.

Este checklist pode ser usado como backlog tecnico. Conforme cada modulo for modelado (migration/servico), atualize a tabela e o README oficial.
