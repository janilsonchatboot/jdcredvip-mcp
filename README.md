# JD CRED VIP – Full Stack Workspace

Este repositório unifica o backend operacional da JD CRED VIP e o frontend/agent do JDTalk. A organização atual segue uma estrutura de monorepo simples, com cada parte mantendo a sua própria documentação e dependências.

```
.
├── jdcredvip-mcp/   # backend: motor de triagem, automações e serviços
└── jdtalk/          # frontend + agent runtime do JDTalk
```

## Projetos

### `jdcredvip-mcp/` – Motor de Triagem e Automação
Backend em Node.js (Express + Knex) com scripts auxiliares escritos em ES Modules/Python. Principais recursos:

- Triagem de clientes (`POST /triagem`) com regras atualizadas de produtos JD CRED VIP.
- Publicação e consulta de metas (`/api/publicar-meta`, `/api/metas`, `/api/dashboard`), com persistência em banco relacional (Postgres ou MySQL).
- Dashboard web em `/dashboard` servindo os últimos dados publicados.
- Scripts em `scripts/` para normalizar planilhas, gerar assets de blog e publicar posts via Blogger API.

👉 Documentação completa: [`jdcredvip-mcp/README.md`](jdcredvip-mcp/README.md)

### `jdtalk/` – Plataforma de Comunicação e IA
Aplicação full-stack (React + Express + Drizzle ORM) utilizada pelo time para atendimento e automações com IA. As pastas principais dentro de `jdtalk/jdtalk-main/` são:

- `client/`: frontend em React/Vite.
- `server/`: backend Node/Express com WebSocket e integrações.
- `agent-runtime/`: agente Codex (Supabase Realtime + OpenAI) com análise automática de extratos INSS.
- `shared/`: esquemas e tipos compartilhados (Zod/Drizzle).

👉 Documentação completa: [`jdtalk/jdtalk-main/README.md`](jdtalk/jdtalk-main/README.md)

## Fluxo de Trabalho

1. **Instalação**  
   - Backend: `cd jdcredvip-mcp && npm install`  
   - Frontend: `cd jdtalk/jdtalk-main && npm install`

2. **Executar**  
   - Backend: `npm start` (porta padrão 8080, ver `.env.example`).  
   - Frontend/Agent: `npm run dev` ou scripts específicos descritos na documentação do JDTalk.

3. **Variáveis de ambiente**  
   - Nunca commitamos arquivos `.env`. Cada projeto possui seu `.env.example` com o que precisa ser preenchido.
   - Segredos (chaves Google, OpenAI, Hostinger etc.) ficam fora do repositório. Utilize os painéis de deploy (Hostinger, Render, Supabase, etc.) para configurá-los.

4. **Deploy**  
   - Hostinger (backend): configurar o diretório de execução como `jdcredvip-mcp/`, rodar `npm install` e `npm start`.
   - Frontend: seguir a estratégia do ambiente em que será servido (Vite build, Supabase Functions, etc.).
   - Postman/Testing: com o backend ativo, configure ambientes com as variáveis e o host em produção para validar os endpoints.

## Convenções e Git

- Não versionamos dados sensíveis (planilhas reais, CSVs operacionais, PDFs internos, chaves JSON). Eles permanecerão fora do Git.
- O `.gitignore` foi atualizado para cobrir dist, logs e diretórios temporários gerados durante o desenvolvimento.
- Após mudanças substanciais, favor atualizar também os READMEs específicos.

Sinta-se à vontade para abrir issues ou pull requests quando ajustes forem necessários. A meta do repositório é manter backend e frontend sincronizados para evoluções rápidas e deploys confiáveis. Vamos em frente! 💼🚀
