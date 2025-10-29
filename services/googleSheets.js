// === JD CRED VIP – Integração Google Sheets (versão compatível com JSON completo) ===
import { google } from "googleapis";
import { env } from "../config/env.js";

export async function getDashboardMetrics(range = "Resumo_Geral!A1:E10") {
  try {
    // Usa as credenciais JSON completas que estão no Render
    const auth = new google.auth.GoogleAuth({
      credentials: env.googleServiceAccount,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });

    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: env.sheetId,
      range
    });

    return {
      origem: "JD CRED VIP – Dashboard Online",
      totalLinhas: res.data.values?.length || 0,
      cabecalho: res.data.values?.[0] || [],
      registros: res.data.values?.slice(1) || []
    };
  } catch (err) {
    console.error("Erro ao acessar planilha:", err.message);
    return {
      erro: true,
      mensagem: "Falha ao acessar a planilha JD CRED VIP.",
      detalhes: err.message
    };
  }
}

