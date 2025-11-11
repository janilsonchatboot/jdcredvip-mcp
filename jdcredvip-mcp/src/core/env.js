// === JD CRED VIP — Configuração de Ambiente ===
import path from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

dotenv.config({ path: path.join(projectRoot, ".env") });

const numberOr = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const booleanOr = (value, fallback = false) => {
  if (typeof value !== "string") return fallback;
  return ["1", "true", "on", "yes"].includes(value.toLowerCase());
};

const normalizeClient = (value = "") => {
  const normalized = value.toLowerCase();

  if (normalized.startsWith("mysql")) return "mysql2";
  if (normalized.startsWith("pg") || normalized.startsWith("postgre")) return "pg";

  return normalized || "pg";
};

const client = normalizeClient(process.env.DB_CLIENT);

const defaultPort = client === "mysql2" ? 3306 : 5432;
const isProduction = process.env.NODE_ENV === "production";

const ensureSecret = (value, label) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized) {
    return normalized;
  }

  if (isProduction) {
    throw new Error(`${label} must be configured when NODE_ENV=production`);
  }

  return randomBytes(32).toString("hex");
};

const jwtSecret = ensureSecret(
  process.env.AUTH_JWT_SECRET ?? process.env.JWT_SECRET,
  "AUTH_JWT_SECRET or JWT_SECRET"
);

export const env = {
  port: numberOr(process.env.PORT, 8080),
  db: {
    client,
    host: process.env.DB_HOST || "127.0.0.1",
    port: numberOr(process.env.DB_PORT, defaultPort),
    name: process.env.DB_NAME || "jdcredvip",
    user: process.env.DB_USER || (client === "mysql2" ? "root" : "postgres"),
    password: process.env.DB_PASSWORD || "",
    ssl: booleanOr(process.env.DB_SSL, false),
    poolMin: numberOr(process.env.DB_POOL_MIN, 0),
    poolMax: numberOr(process.env.DB_POOL_MAX, 10)
  },
  integrations: {
    crefaz: {
      apiKey: process.env.CREFAZ_API_KEY || "",
      baseUrl: process.env.CREFAZ_API_BASE_URL || "",
      webhookSecret: process.env.CREFAZ_WEBHOOK_SECRET || ""
    },
    nexxo: {
      apiToken: process.env.NEXXO_API_TOKEN || "",
      baseUrl: process.env.NEXXO_API_BASE_URL || ""
    },
    codex: {
      analysisUrl:
        process.env.CODEX_ANALYSIS_URL ||
        process.env.CODEX_PLUGIN_URL ||
        "",
      apiKey: process.env.CODEX_ANALYSIS_KEY || process.env.CODEX_API_KEY || "",
      timeoutMs: numberOr(process.env.CODEX_ANALYSIS_TIMEOUT, 12000)
    }
  },
  security: {
    jwtSecret
  },
  features: {
    modularRoutes: booleanOr(
      process.env.FEATURE_MODULAR_ROUTES,
      true
    )
  }
};

export const missingDatabaseEnv = () => {
  const missing = [];

  if (!env.db.host) missing.push("DB_HOST");
  if (!env.db.name) missing.push("DB_NAME");
  if (!env.db.user) missing.push("DB_USER");

  return missing;
};
