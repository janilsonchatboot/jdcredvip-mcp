# Credenciais Google Sheets

- Coloque o arquivo da service account no formato JSON nesta pasta.  
  Exemplo: `config/coherent-voice-471209-h7-e49e0f0ede89.json`.
- No `.env` ou nas variáveis da Render, defina:
  ```
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_PATH=config/coherent-voice-471209-h7-e49e0f0ede89.json
  ```
- Se preferir usar a credencial inline, deixe o arquivo fora do repositório e preencha
  `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` com o JSON completo em uma linha (`\n` para quebras).
- O código já interpreta o JSON para obter `client_email` e `private_key`, tanto a partir do
  arquivo quanto da variável inline.
