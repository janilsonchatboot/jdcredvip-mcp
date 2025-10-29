// === JD CRED VIP – Integração Google Sheets ===
import { google } from "googleapis";
import { env } from "../config/env.js";

export async function getDashboardMetrics(range = "Resumo_Geral!A1:E10") {
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

    return res.data.values || [];
  } catch (err) {
    console.error("Erro ao acessar planilha:", err.message);
    return [];
  }
}
