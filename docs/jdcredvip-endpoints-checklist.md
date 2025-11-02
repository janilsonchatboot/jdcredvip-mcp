# JD CRED VIP – Revisão de Endpoints (Nov/2025)

Documento de referência para validar o arquivo original **“JD CRED VIP – API de Backend (Endpoints)”** e apontar o que já existe no `jdcredvip-mcp`, o que precisa ser planejado e o que pode ser removido do escopo atual.

## Legenda
- ✅ Implementado no `jdcredvip-mcp`
- 🧱 Planejado / precisa ser modelado
- ❌ Não se aplica ao escopo atual (ou depende de outra equipe/sistema)

## 1. Autenticação e Usuários
| Método | Endpoint | Status | Observações |
|--------|----------|--------|-------------|
| POST | `/auth/login` | 🧱 | Necessário definir modelo de usuários e política JWT (não existe hoje). |
| POST | `/auth/register` | 🧱 | Idem: depende de cadastro e perfis. |
| GET | `/auth/me` | 🧱 | Após login, retornar dados do usuário autenticado. |
| POST | `/auth/logout` | ❌ | Backend stateless. Logout pode ser tratado no cliente invalidando token. |

## 2. Clientes
| Método | Endpoint | Status | Observações |
|--------|----------|--------|-------------|
| GET | `/clientes` | 🧱 | Precisa modelar tabela `clientes` com filtros (produto, promotora, status, data). |
| GET | `/clientes/:id` | 🧱 | Depende do mesmo modelo. |
| POST | `/clientes` | 🧱 | Criar cliente manual/API. |
| PUT | `/clientes/:id` | 🧱 | Atualização de dados. |
| DELETE | `/clientes/:id` | 🧱 | Soft delete (flag `deleted_at`). |
| POST | `/clientes/importar` | ❌ | Ideal implementar como job/worker; fora do escopo MVP. |
| GET | `/clientes/exportar` | ❌ | Pode ser feito via consultas ou BI; deixar para etapa posterior. |

## 3. Contratos e Propostas
| Método | Endpoint | Status | Observações |
|--------|----------|--------|-------------|
| GET | `/contratos` | 🧱 | Necessário definir esquema `contratos`. |
| GET | `/contratos/:id` | 🧱 | Idem. |
| POST | `/contratos` | 🧱 | Depende de integração com promotoras (Nexxo, WorkBank). |
| PUT | `/contratos/:id` | 🧱 | Atualização de status. |
| GET | `/contratos/promotora/:nome` | ❌ | Pode ser atendido com query param em `/contratos` (`?promotora=`). |
| GET | `/contratos/produto/:tipo` | ❌ | Idem acima (`?produto=`). |
| POST | `/contratos/sincronizar` | ❌ | Estratégia preferida: jobs específicos por integradora. |

## 4. Comissões
| Método | Endpoint | Status | Observações |
|--------|----------|--------|-------------|
| GET | `/comissoes` | 🧱 | Requer tabela `comissoes`. |
| POST | `/comissoes/calcular` | 🧱 | Pode ser script/serviço interno que atualiza dados. |
| PUT | `/comissoes/:id` | 🧱 | Ajuste manual. |
| GET | `/comissoes/resumo` | 🧱 | Dashboard resumido (somatórios). |

## 5. Follow-ups e Agenda
| Método | Endpoint | Status | Observações |
|--------|----------|--------|-------------|
| GET | `/followups` | 🧱 | Cadastro de follow-ups relacionado a clientes/contratos. |
| POST | `/followups` | 🧱 | Criar follow-up. |
| PUT | `/followups/:id` | 🧱 | Atualizar status/observação. |
| GET | `/followups/hoje` | ❌ | Pode ser filtro `?data=hoje` em `/followups`. |
| POST | `/followups/gerar` | ❌ | Sugestão: processo batch/cron, não endpoint público. |

## 6. Dashboard e Metas
Endpoints existentes:
- ✅ `POST /api/publicar-meta`
- ✅ `GET /api/metas`
- ✅ `GET /api/metas/:id`
- ✅ `GET /api/dashboard`
- ✅ `GET /dashboard`

Pendências sugeridas:
| Método | Endpoint | Status | Observações |
|--------|----------|--------|-------------|
| GET | `/dashboard/resumo` | 🧱 | Sumários por período/produto. Pode reutilizar `metaService`. |
| GET | `/dashboard/ranking` | 🧱 | Ranking por promotora/corretor. |

## 7. Integrações Externas
| Método | Endpoint | Status | Observações |
|--------|----------|--------|-------------|
| POST | `/integracoes/nexxo/sync` | 🧱 | Job para buscar dados Nexxo. Requer tokens e Mapeamentos. |
| POST | `/integracoes/workbank/sync` | 🧱 | Importar CSV ou consumir API WorkBank. |
| POST | `/integracoes/crefaz/simular` | ❌ | Escopo fora do backend atual (depende de regras Crefaz). |
| POST | `/integracoes/crefaz/contratar` | ❌ | Igual acima. |
| GET | `/integracoes/status` | ❌ | Pode ser substituído por `/health/integracoes` quando integrações existirem. |

## 8. Triagem Automática
- ✅ `POST /triagem`
- ❌ `GET /triagem/:id` – triagem atual é stateless (não armazena histórico). Se quisermos armazenar resultados, precisamos de tabela `triagens` ou usar `clientes`.

Sugestão: criar `POST /triagem/simular` e opcionalmente `GET /triagem/historico?clienteId=...` quando houver armazenamento.

## 9. Promotoras
| Método | Endpoint | Status | Observações |
|--------|----------|--------|-------------|
| GET | `/promotoras` | 🧱 | Requer tabela `promotoras`. Pode servir para combos/formulários. |
| GET | `/promotoras/:id` | 🧱 | Detalhes (tokens, contatos). |
| POST | `/promotoras` | 🧱 | Cadastrar promotora; sensível → guardar apenas metadados (tokens em vault). |
| PUT | `/promotoras/:id` | 🧱 | Atualização. |
| DELETE | `/promotoras/:id` | 🧱 | Soft delete. |

## 10. Bancos (novo módulo)
| Método | Endpoint | Status | Observações |
|--------|----------|--------|-------------|
| GET | `/bancos` | 🧱 | Tabela `bancos` com informações básicas. |
| GET | `/bancos/:id` | 🧱 | Detalhe (coeficientes, documentos). |
| POST | `/bancos` | 🧱 | Cadastro manual. |
| PUT | `/bancos/:id` | 🧱 | Atualizar regras/coeficientes. |
| DELETE | `/bancos/:id` | 🧱 | Soft delete. |

## Conclusões
1. **Existentes**: `/`, `/triagem`, `/api/publicar-meta`, `/api/metas`, `/api/metas/:id`, `/api/dashboard`, `/dashboard`.
2. **Prioridades imediatas**:
   - Modelar usuários/autenticação (JWT).
   - CRUD de clientes e contratos (essencial para o CRM).
   - Estrutura de follow-ups e promotoras.
3. **Para posterior**:
   - Importações em massa (CSV/Excel).
   - Integrações profundas (Nexxo, WorkBank, Crefaz).
   - Histórico de triagens e ranking avançado.

Este checklist pode ser usado como backlog técnico. Conforme cada módulo for modelado (migration/serviço), atualize a tabela e o README oficial.
