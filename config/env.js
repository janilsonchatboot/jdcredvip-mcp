// === JD CRED VIP – Configuração de Ambiente ===
import dotenv from "dotenv";
dotenv.config();

const normalizePrivateKey = (value = "") => value.replace(/\\n/g, "\n").trim();

export const env = {
  sheetId: process.env.SHEETS_SPREADSHEET_ID ?? "",
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
  googlePrivateKey: normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "")
};

export const hasGoogleCredentials =
  env.sheetId && env.googleServiceAccountEmail && env.googlePrivateKey;

export const missingGoogleEnv = () =>
  [
    !env.sheetId && "SHEETS_SPREADSHEET_ID",
    !env.googleServiceAccountEmail && "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    !env.googlePrivateKey && "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
  ].filter(Boolean);
