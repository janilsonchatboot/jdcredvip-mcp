# Motor de Triagem JD CRED VIP

Bem-vindo(a) ao hub que concentra a inteligência comercial e o acesso a dados internos da JD CRED VIP. Esta API facilita a triagem de clientes, consulta o painel no Google Sheets e prepara integrações com outros serviços da empresa.

## Visão Geral
- **Transparência:** códigos e regras bem descritos para que toda a equipe entenda como o atendimento decide o melhor produto.
- **Acolhimento:** respostas amigáveis para monitorar a saúde do serviço e orientar o time comercial.
- **Solução rápida:** scripts prontos para buscar métricas e iniciar o servidor em poucos comandos.

## Estrutura Principal
- `src/app.js` – cria a aplicação Express com rotas de saúde, dashboard e triagem.
- `src/server.js` – inicia o servidor HTTP local (porta padrão 3000).
- `src/routes/` – rotas HTTP separadas por responsabilidade.
- `src/modules/triage/engine.js` – regras de triagem e cálculo de comissão estimada.
- `src/services/googleSheets.js` – consulta o painel no Google Sheets com autenticação de serviço.
- `scripts/fetch-dashboard.mjs` – script em linha de comando para puxar métricas do dashboard.

## Pré-requisitos
- Node.js 18 ou superior.
- Conta de serviço no Google Cloud com acesso leitura ao Google Sheets do dashboard.

## Como começar
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure as variáveis de ambiente (veja lista abaixo).
3. Rode o servidor local:
   ```bash
   npm run api
   ```
4. Faça uma chamada de saúde para garantir que está tudo certo:
   ```bash
   curl http://localhost:3000/
   ```

## Variáveis de Ambiente
A API aceita diferentes formatos para as credenciais do Google. Defina pelo menos um dos caminhos abaixo:

| Nome | Descrição |
|------|-----------|
| `SHEETS_SPREADSHEET_ID` | ID da planilha com o dashboard.
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | E-mail da conta de serviço.
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Chave privada (cole exatamente como o Google fornece; o Render mantém as quebras de linha).
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_PATH` | Caminho para um arquivo `.json` com as credenciais completas (opcional, substitui o campo acima).
| `GOOGLE_SERVICE_ACCOUNT` | JSON completo da credencial (alternativa às variáveis separadas).

> Dica: Em desenvolvimento, você pode criar um arquivo `.env` na raiz do projeto com essas variáveis.

### Configuração no Render

1. Abra **Render > Dashboard > Environment** do serviço.
2. Cadastre as variáveis `SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` e `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`.
   - Copie a chave privada exatamente como aparece no JSON do Google (com as quebras de linha). O Render armazena o conteúdo sem necessidade de escapes.
   - Se preferir usar o JSON completo, cadastre apenas a variável `GOOGLE_SERVICE_ACCOUNT`.
3. Opcionalmente, faça upload do arquivo de credencial fora do repositório e defina `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_PATH` apontando para o caminho em tempo de execução.

As rotinas em `src/config/env.js` já priorizam os valores das variáveis e tratam automaticamente os formatos suportados, garantindo que o deploy continue acessando o Google Sheets com segurança.

## Endpoints principais
- `GET /` – checagem de saúde com mensagem acolhedora para o time.
- `GET /api/dashboard` – retorna métricas atualizadas do Google Sheets (503 se faltar credencial, 500 em caso de erro).
- `POST /triagem` – processa dados de um cliente.
  - Exemplo de payload:
    ```json
    {
      "nome": "Maria Souza",
      "produtoInformado": "Empréstimo INSS",
      "volumeLiquido": 12000,
      "perfil": { "isINSS": true }
    }
    ```
  - Resposta resumida:
    ```json
    {
      "nome": "Maria Souza",
      "produtoIdeal": "INSS Consignado",
      "motivo": "OK",
      "limiteEstimado": 15000,
      "comissaoPercent": 0.17,
      "comissaoEstimada": 2040,
      "upsell": "Portabilidade + Refin",
      "status": "✅ Apto"
    }
    ```

## Scripts úteis
- `npm run api` – inicia o servidor HTTP.
- `npm run dashboard:pull` – imprime no console o JSON com todas as métricas do dashboard.

## Boas práticas para integrações futuras
- Reutilize os exports públicos disponíveis em `src/index.js` para compartilhar regras de triagem ou acesso às métricas em outros projetos.
- Mantenha novas rotas organizadas dentro de `src/routes/`, sempre com linguagem simples nas respostas para reforçar acolhimento e transparência.
- Antes de publicar qualquer dado sensível, confirme se o cliente autorizou o uso da informação.

➡️ **Saiba mais e simule no WhatsApp: 84 98856-2331**
