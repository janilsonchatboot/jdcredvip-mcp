// === JD CRED VIP – Integração Google Sheets ===
const { google } = require('googleapis');
const env = require('../config/env');

async function getSheetData(range = 'Resumo_Geral!A1:E10') {
  const credentials = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    range
  });

  return response.data.values;
}

module.exports = { getSheetData };
