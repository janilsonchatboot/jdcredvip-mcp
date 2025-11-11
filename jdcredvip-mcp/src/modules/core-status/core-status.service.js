import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "#core/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..", "..");
const manifestPath = path.join(projectRoot, "src", "modules", "dashboard", "manifest.json");

const readManifest = async () => {
  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    return JSON.parse(raw);
  } catch (_error) {
    return { version: "desconhecida", modules: [] };
  }
};

const formatMemory = () => {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external
  };
};

export async function getCoreStatus() {
  const manifest = await readManifest();
  const logsRow = await db("integration_logs").count({ total: "*" }).first();

  return {
    version: manifest.version || "v3.05",
    manifestUpdatedAt: manifest.updatedAt || null,
    modules: manifest.modules || [],
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    memory: formatMemory(),
    logsProcessados: Number(logsRow?.total ?? logsRow?.count ?? 0),
    timestamp: new Date().toISOString()
  };
}
