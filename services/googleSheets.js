// === JD CRED VIP – Integração Google Sheets (Aba Dashboard) ===
import { google } from "googleapis";
import { env } from "../config/env.js";

export async function getDashboardMetrics(range = "'Dashboard'!A1:E30") {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: env.googleServiceAccountEmail,
        private_key: env.googlePrivateKey
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });

    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: env.sheetId,
      range
    });

    const values = res.data.values || [];

    // Monta um JSON limpo e estruturado
    return {
      origem: "JD CRED VIP – Dashboard Online",
      totalLinhas: values.length,
      colunas: values[0],
      dados: values.slice(1).map((row) => {
        const item = {};
        values[0].forEach((colName, i) => {
          item[colName] = row[i] || "";
        });
        return item;
      })
    };
  } catch (err) {
    console.error("Erro ao acessar planilha:", err.message);
    return {
      erro: true,
      mensagem: "Falha ao acessar a planilha JD CRED VIP (aba Dashboard).",
      detalhes: err.message
    };
  }
}
