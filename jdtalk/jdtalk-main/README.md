# JDTalk — Plataforma de Comunicação e Gestão de Clientes

JDTalk é uma aplicação full-stack (React + Express + Drizzle ORM) voltada para atendimento via WhatsApp, pipeline de vendas e automações com IA. O projeto é dividido em três pastas principais:

- `client/` - frontend em React + Vite
- `server/` - backend em Node/Express com WebSocket e integrações externas
- `shared/` - esquemas/tipos compartilhados (Drizzle ORM + Zod)
- `agent-runtime/` - agente Codex (Supabase Realtime + OpenAI) com análise automática de extratos INSS

## Requisitos

- Node.js 18 ou superior
- NPM 9+ (instalado com o Node)
- Banco Postgres (Supabase recomendado) com string de conexão (`DATABASE_URL`)
- Credenciais WhatsApp Business API (opcional em dev, necessárias em produção)
- Chave OpenAI (opcional – para recursos de IA)

## Configuração de Ambiente

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
2. Preencha os campos obrigatórios no `.env`:
   - `DATABASE_URL`: string de conexão do Supabase (ou Postgres local)
   - `SESSION_SECRET` e `JWT_SECRET`: defina chaves fortes
   - Integrações opcionais (`OPENAI_API_KEY`, variáveis do WhatsApp)
3. No Supabase, crie um banco Postgres e copie a string `postgresql://` (modo pooling funciona bem em produção).

## Rodando em Desenvolvimento (Windows / macOS / Linux)

```bash
npm install
npm run db:push      # aplica o schema no banco configurado
npm run dev          # inicia API + Vite (porta 5000)
```

- O servidor sobe na porta **5000** (`http://localhost:5000`).
- O seed automático cria um usuário padrão `agent / agent123` e dados demo.
- Logs do backend e build do frontend aparecem no mesmo terminal.

## Fluxo de Build e Produção

```bash
npm run build        # gera artefatos em dist/
npm run start        # inicia o servidor em modo produção (porta 5000)
```

Para deploy na Hostinger (VPS):

1. Configure as variáveis de ambiente (`DATABASE_URL`, `SESSION_SECRET`, etc.) no serviço ou no arquivo `.env` do servidor.
2. Certifique-se de que a porta 5000 está liberada no firewall (ou ajuste o código se quiser outra porta).
3. Execute `npm install --production`, `npm run build` e `npm run start` via PM2/systemd.
4. Use o Supabase como banco Postgres externo (mesma string de conexão do dev, se desejar).

## Integrações

- **WhatsApp Business**: preencha variáveis `WHATSAPP_*` e configure o webhook apontando para `https://seu-dominio.com/api/webhook`.
- **OpenAI**: defina `OPENAI_API_KEY` para respostas automáticas, categorização e resumo de conversas.
- **Plugins**: a API `/api/plugins` permite instalar/ativar módulos externos definidos na pasta `server/plugins`.

## Próximos Passos Sugeridos

- Ajustar as chaves e secrets antes de publicar.
- Configurar HTTPS/reverse proxy (Nginx) na VPS.
- Configurar pipeline CI/CD GitHub → Hostinger.

Qualquer dúvida sobre a configuração ou deploy, basta abrir uma issue ou entrar em contato.
