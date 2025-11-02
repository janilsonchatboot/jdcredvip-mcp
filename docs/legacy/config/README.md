# Credenciais Google Sheets

Para proteger a chave privada da conta de serviço, **não armazene arquivos reais de credencial neste repositório**. Utilize uma das opções abaixo:

1. **Variáveis de ambiente**  
   Defina no Render (ou em um arquivo `.env` local, que já está ignorado pelo Git) as variáveis:
   ```
   SHEETS_SPREADSHEET_ID=seu_id_da_planilha
   GOOGLE_SERVICE_ACCOUNT_EMAIL=sua-conta-de-servico@projeto.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
   - No painel do Render, cole a chave exatamente como o Google fornece; quebras de linha serão mantidas automaticamente.  
   - Se preferir armazenar tudo em uma única variável, preencha `GOOGLE_SERVICE_ACCOUNT` com o JSON completo fornecido pelo Google Cloud.

2. **Arquivo fora do controle de versão**  
   - Faça uma cópia do modelo `config/service-account.example.json`, preencha com seus dados reais e salve como `config/service-account.json`.  
   - O arquivo real está na `.gitignore`, então não será comitado.  
   - Informe o caminho com `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_PATH=config/service-account.json`.

O código em `src/config/env.js` aceita qualquer uma dessas abordagens e normaliza o conteúdo automaticamente.
