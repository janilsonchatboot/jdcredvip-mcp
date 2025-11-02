# JD CRED VIP MCP
Motor oficial da JD CRED VIP para triagem de clientes, publicacao de metas e dashboard conectado a banco relacional (MySQL ou PostgreSQL).

## Visao geral
- API Express com rotas de triagem (`/triagem`) e metas (`/api/publicar-meta`, `/api/metas`, `/api/dashboard`).
- Dados persistidos em banco relacional via Knex (sem dependencia do Google Sheets).
- Dashboard web em `/dashboard` com graficos Chart.js lendo diretamente do banco.
- Ferramentas auxiliares em `scripts/` (ex.: exportacao de planilhas para CSV/Supabase).

## Requisitos
- Node.js 18 ou superior
- Banco MySQL 8+ **ou** PostgreSQL 13+ acessivel

## Configurar o banco
Crie um banco chamado `jdcredvip` (ou ajuste via ambiente).

### PostgreSQL
```sql
CREATE DATABASE jdcredvip
  WITH ENCODING 'UTF8'
  TEMPLATE template0;
```

### MySQL
```sql
CREATE DATABASE jdcredvip
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

As tabelas `meta_publications` e `meta_products` sao criadas automaticamente ao iniciar o servidor.

## Variaveis de ambiente
Copie `.env.example` para `.env` e ajuste:

| Variavel       | Descricao                                                          |
| -------------- | ------------------------------------------------------------------ |
| `PORT`         | Porta HTTP (padrao `8080`).                                        |
| `TRIAGEM_URL`  | URL usada por `triagem.js` (integracoes).                          |
| `API_KEY`      | Chave utilizada por integracoes externas.                          |
| `DB_CLIENT`    | `pg` para PostgreSQL ou `mysql2` para MySQL.                       |
| `DB_HOST`      | Host do banco (ex.: `127.0.0.1`).                                  |
| `DB_PORT`      | Porta (`5432` Postgres / `3306` MySQL).                             |
| `DB_NAME`      | Nome do banco.                                                     |
| `DB_USER`      | Usuario com permissao de leitura/escrita.                          |
| `DB_PASSWORD`  | Senha do usuario.                                                  |
| `DB_SSL`       | `true` para conexoes com SSL (Render, Railway etc.), senao `false`. |

## Executar localmente
```bash
npm install
npm start
```

Ao iniciar, o servidor garante as tabelas e fica disponivel em `http://localhost:8080`.

## Endpoints principais
- `GET /` - status do motor.
- `POST /triagem` - identifica produto ideal, limite estimado, upsell etc.
- `POST /api/publicar-meta` - publica meta com metricas e produtos.
- `GET /api/metas` - lista metas (paginacao via `limit`/`offset`).
- `GET /api/metas/:id` - detalha meta especifica.
- `GET /api/dashboard` - retorna meta mais recente com resumo e produtos.
- `GET /dashboard` - dashboard web (Chart.js) com dados do banco.

## Exportar planilha para CSV (Supabase)
`scripts/extract-and-normalize-sheets.mjs` le a planilha `JD_CRED_VIP_Planilha_3.02.xlsx` (ou outra informada), normaliza cabecalhos (snake_case sem acento/espaco) e salva cada aba elegivel como CSV separado (padrao em `data/`). Abas de parametros, painel, importar etc sao ignoradas automaticamente.

```bash
# Usa caminhos padrao (entrada e saida)
node scripts/extract-and-normalize-sheets.mjs

# Informar planilha e diretorio de saida customizados
node scripts/extract-and-normalize-sheets.mjs ./planilhas/JD_CRED_VIP.xlsx ./saida_csv
```

Adapte o array `SHEET_ALIASES` no script caso queira slugs fixos para cada aba.

## Exemplo de payload: POST /api/publicar-meta
```json
{
  "titulo": "Meta Semana 44",
  "dataReferencia": "2025-10-31",
  "publicadoPor": "Ana Souza",
  "metrics": {
    "totalContratos": 386,
    "volumeBruto": 914427.33,
    "volumeLiquido": 748984.01,
    "comissaoTotal": 18654.53
  },
  "produtos": [
    {
      "produto": "INSS",
      "quantidade": 108,
      "volumeLiquido": 514435.73,
      "volumeBruto": 677750.48,
      "comissao": 7220.25
    }
  ]
}
```

## Deploy (Render, Railway etc.)
- Build: `npm install`
- Start: `npm start`
- Configure as variaveis de ambiente anteriores (Google Sheets nao e mais necessario).

## Desenvolvimento
- `node --check server.js` valida rapidamente a sintaxe do servidor.
- Ajuste `public/dashboard.css` e `public/dashboard.js` para customizar visual e graficos.
- Para popular o dashboard, publique ao menos uma meta com `/api/publicar-meta`.
