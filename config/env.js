// === JD CRED VIP – Configuração de Ambiente (JSON completo) ===
import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT || 8080,
  sheetId: process.env.SHEET_ID || process.env.SHEETS_SPREADSHEET_ID || "",
  googleServiceAccount: (() => {
    try {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || "{}");
    } catch (err) {
      console.error("❌ Erro ao converter GOOGLE_SERVICE_ACCOUNT:", err.message);
      return {};
    }
  })()
};

export const hasGoogleCredentials =
  !!(env.googleServiceAccount.client_email && env.googleServiceAccount.private_key);

export const missingGoogleEnv = () => {
  const faltando = [];
  if (!env.sheetId) faltando.push("SHEET_ID");
  if (!env.googleServiceAccount.client_email) faltando.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!env.googleServiceAccount.private_key) faltando.push("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  return faltando;
};
