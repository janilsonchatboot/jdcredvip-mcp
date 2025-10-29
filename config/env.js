import dotenv from "dotenv";

const isProduction = process.env.NODE_ENV === "production";

if (!isProduction) {
  dotenv.config();
}

const normalizePrivateKey = (value = "") =>
  value.replace(/\\n/g, "\n").trim();

export const env = {
  isProduction,
  sheetId: process.env.SHEETS_SPREADSHEET_ID ?? "",
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
  googlePrivateKey: normalizePrivateKey(
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? ""
  ),
};

export const hasGoogleCredentials =
  !!env.sheetId && !!env.googleServiceAccountEmail && !!env.googlePrivateKey;

export const missingGoogleEnv = () => {
  const missing = [];
  if (!env.sheetId) missing.push("SHEETS_SPREADSHEET_ID");
  if (!env.googleServiceAccountEmail) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!env.googlePrivateKey) missing.push("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
  return missing;
};
