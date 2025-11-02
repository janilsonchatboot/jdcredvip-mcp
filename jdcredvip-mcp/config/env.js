// === JD CRED VIP — Configuração de Ambiente ===
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

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
  }
};

export const missingDatabaseEnv = () => {
  const missing = [];

  if (!env.db.host) missing.push("DB_HOST");
  if (!env.db.name) missing.push("DB_NAME");
  if (!env.db.user) missing.push("DB_USER");

  return missing;
};
