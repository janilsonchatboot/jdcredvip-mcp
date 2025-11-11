import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { env } from "#core/env.js";
import { ensureDatabase, closeDatabase } from "#core/database.js";
import { authenticateRequest, requiresRole, actorFromRequest } from "#core/middlewares/auth.js";
import { logActivity } from "#core/logger.js";
import registerRoutes from "./routes.js";
import * as metasController from "./modules/metas/metas.controller.js";
import * as dashboardController from "./modules/dashboard/dashboard.controller.js";
import {
  listarHistoricoImportacaoController,
  legacyImportarRelatorio
} from "./modules/importacao/importacao.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, "..", "public");

const shouldSkipLog = (req) => {
  if (req.method === "OPTIONS") return true;
  if (req.originalUrl.startsWith("/public")) return true;
  if (req.originalUrl.startsWith("/static")) return true;
  if (/\.(js|css|png|jpg|svg)$/i.test(req.originalUrl)) return true;
  return false;
};

const resolveSource = (req) => {
  if (typeof req.headers["x-request-source"] === "string") {
    return req.headers["x-request-source"];
  }
  if (typeof req.headers["x-frontend-origin"] === "string") {
    return req.headers["x-frontend-origin"];
  }
  const userAgent = String(req.headers["user-agent"] || "");
  if (userAgent.toLowerCase().includes("mozilla")) {
    return "frontend";
  }
  if (userAgent.toLowerCase().includes("postman")) {
    return "postman";
  }
  return "api";
};

async function bootstrap() {
  if (!env.features.modularRoutes) {
    console.warn("[JD CRED VIP] FEATURE_MODULAR_ROUTES desativada. Carregando servidor legado...");
    await import("./legacy/server-legacy.js");
    return;
  }

  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
  app.use(express.static(publicDir));
  app.use(authenticateRequest);

  app.use((req, res, next) => {
    if (shouldSkipLog(req)) {
      return next();
    }

    const requestId = randomUUID();
    const startedAt = Date.now();
    const source = resolveSource(req);
    res.locals.requestId = requestId;

    res.on("finish", () => {
      const payloadSource = req.method === "GET" ? req.query : req.body;
      logActivity({
        requestId,
        route: req.originalUrl || req.url,
        method: req.method,
        source,
        userId: req.user?.id ?? null,
        userRole: req.user?.role ?? null,
        username: req.user?.username ?? actorFromRequest(req) ?? null,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        success: res.statusCode < 400,
        message: res.locals?.message,
        payload: payloadSource,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      }).catch(() => {});
    });

    next();
  });

  app.get("/", (_req, res) => {
    res.json({
      status: "ok",
      mensagem: "Motor de triagem JD CRED VIP ativo e pronto para acolher novos clientes."
    });
  });

  app.get("/dashboard", (_req, res) => {
    res.sendFile(path.join(publicDir, "dashboard.html"));
  });

  registerRoutes(app);

  // Alias legados
  app.post("/api/publicar-meta", requiresRole("admin"), metasController.publicar);
  app.get("/dashboard/resumo", requiresRole("admin", "promotor"), dashboardController.resumo);
  app.get("/dashboard/ranking", requiresRole("admin", "promotor"), dashboardController.ranking);
  app.get("/importacoes/relatorios", requiresRole("admin"), listarHistoricoImportacaoController);
  app.post("/importar-relatorio", requiresRole("admin"), legacyImportarRelatorio);

  await ensureDatabase();

  const server = app.listen(env.port, () => {
    console.log(`Servidor JD CRED VIP rodando na porta ${env.port}`);
  });

  const shutdown = async () => {
    await closeDatabase();
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  console.error("Erro ao inicializar servidor modular:", error);
  process.exit(1);
});
