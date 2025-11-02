# JD CRED VIP – Full Stack Workspace

Este repositório reúne os dois projetos complementares:

- **`jdcredvip-mcp/`** – backend (motor de triagem, automações e serviços). Contém os arquivos Node.js/Python originais e continua usando o mesmo `package.json`, `server.js` e configuração `.env` agora organizados dentro da pasta.
- **`jdtalk/`** – frontend / agente conversacional. Inclui o projeto `jdtalk-main` e scripts auxiliares usados no JD Talk.

## Como usar

1. Entre na pasta desejada (`cd jdcredvip-mcp` ou `cd jdtalk`) para instalar dependências e executar os scripts (`npm install`, `npm run dev`, etc.).
2. Defina as variáveis de ambiente sensíveis fora do Git (o `.gitignore` já ignora os arquivos `.env` em ambos os diretórios).
3. Mantenha os dois diretórios sincronizados para deploys completos (Hostinger para o backend e o serviço escolhido para o frontend).

Consulte os READMEs específicos em cada subpasta para instruções detalhadas.
