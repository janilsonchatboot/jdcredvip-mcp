# Configuração de integrações

Crie arquivos `.json` nesta pasta (sempre fora do versionamento) com os tokens/URLs necessários para as integrações.

Exemplo (`nexxo.sample.json`):
```json
{
  "apiToken": "COLOQUE_AQUI_SEU_TOKEN_NEXXO",
  "baseUrl": "https://api.nexxo.com.br"
}
```

Ao iniciar o serviço, você pode carregar esse conteúdo e popular as variáveis de ambiente.

> **Importante:** nunca faça commit de arquivos com credenciais reais. A `.gitignore` já garante que `jdcredvip-mcp/integrations/*.json` fique fora do Git.
