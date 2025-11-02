# Codex Realtime Agent – JD CRED VIP

Agente IA em tempo real que escuta eventos do Supabase e executa ações comerciais (notificações, resumos, atualizações no JD Talk).

## Setup

1) Copie `env/.env.example` para `.env` na raiz do projeto e preencha:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY
- (opcional) JDTALK_API_URL, JDTALK_API_TOKEN
- AGENT_TABLES (ex.: fgts_saque_aniversario,inss,follow_ups)

2) Instale e rode:
```bash
npm install
npm run dev:agent      # modo dev
npm run build
npm run start:agent    # modo prod simples
```

### Módulo Extrato INSS
- Envie PDFs para o bucket `extratos_inss` no Supabase Storage.
- O agente detecta o upload, roda o handler `extrato-inss` (OCR/IA) e grava o resultado em `public.analise_extrato_inss`.
- Personalize regras em `jdcredvip_prompts/jdcredvip.extrato.md`.

## Produção com PM2

```bash
npm i -g pm2
npm run pm2:start
pm2 save
pm2 startup
```

Logs:
- `pm2 logs codex-realtime`
- `tail -f .logsrealtime.log`

## Integração Webhooks + Agent (opcional)
- Webhooks HTTP continuam valendo como redundância/auditoria.
- Realtime Agent reage via websocket sem depender de rotas externas.
- Use ambos para combinar registro histórico + ações imediatas.

## Próximos passos
1. Copie a pasta para o repositório desejado.
2. Preencha o `.env`.
3. No servidor Hostinger:
   ```bash
   chmod +x scripts/deploy-agent.sh
   ./scripts/deploy-agent.sh
   ```
4. Conferir logs: `pm2 logs codex-realtime --lines 200`.

## Testes locais do analisador de extrato
1. Execute o agente em modo dev: `npm run dev:agent`.
2. Faça upload de um PDF (via Supabase dashboard ou API REST) para `extratos_inss`.
3. Acompanhe o log `.logsrealtime.log` para ver a análise ser registrada.
4. Verifique a tabela `analise_extrato_inss` no Supabase para confirmar os dados.
