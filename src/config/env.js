import dotenv from "dotenv";
import { existsSync, readFileSync } from "fs";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";

if (!isProduction) {
  dotenv.config();
}

const normalizePrivateKey = (value = "") =>
  value.replace(/\\n/g, "\n").trim();

const resolvePath = (inputPath = "") =>
  path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);

const parseServiceAccountJson = (raw = "") => {
  try {
    const parsed = JSON.parse(raw);
    return {
      email: parsed.client_email ?? "",
      privateKey: parsed.private_key ?? "",
    };
  } catch (error) {
    console.error("Falha ao interpretar credencial do Google como JSON:", error);
    return null;
  }
};

const loadServiceAccount = () => {
  const pathFromEnv = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_PATH;
  if (pathFromEnv) {
    const fullPath = resolvePath(pathFromEnv);
    if (!existsSync(fullPath)) {
      console.warn(
        `Arquivo de credencial não encontrado em GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_PATH: ${fullPath}`
      );
    } else {
      try {
        const raw = readFileSync(fullPath, "utf-8");
        const parsed = parseServiceAccountJson(raw);
        if (parsed) {
          return parsed;
        }
      } catch (error) {
        console.error("Erro ao ler credencial do Google no arquivo informado:", error);
      }
    }
  }

  const jsonFromEnv = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (jsonFromEnv) {
    const parsed = parseServiceAccountJson(jsonFromEnv);
    if (parsed) {
      return parsed;
    }
  }

  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "";
  if (inline.trim().startsWith("{")) {
    const parsed = parseServiceAccountJson(inline);
    if (parsed) {
      return parsed;
    }
  }

  return {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
    privateKey: inline,
  };
};

const serviceAccount = loadServiceAccount();

export const env = {
  isProduction,
  sheetId: process.env.SHEETS_SPREADSHEET_ID ?? "",
  googleServiceAccountEmail:
    serviceAccount.email || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
  googlePrivateKey: normalizePrivateKey(serviceAccount.privateKey ?? ""),
};

export const hasGoogleCredentials =
  !!env.sheetId && !!env.googleServiceAccountEmail && !!env.googlePrivateKey;

export const missingGoogleEnv = () => {
  const missing = [];
  if (!env.sheetId) missing.push("SHEETS_SPREADSHEET_ID");
  if (!env.googleServiceAccountEmail) {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_PATH) {
      missing.push("client_email no arquivo apontado por GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_PATH");
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      missing.push("client_email no JSON de GOOGLE_SERVICE_ACCOUNT");
    } else if ((process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").trim().startsWith("{")) {
      missing.push("client_email no JSON de GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
    } else {
      missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    }
  }
  if (!env.googlePrivateKey) {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_PATH) {
      missing.push("private_key no arquivo apontado por GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_PATH");
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      missing.push("private_key no JSON de GOOGLE_SERVICE_ACCOUNT");
    } else if ((process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").trim().startsWith("{")) {
      missing.push("private_key no JSON de GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
    } else {
      missing.push("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");
    }
  }
  return missing;
};
