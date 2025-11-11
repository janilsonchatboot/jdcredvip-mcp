import { env } from "#core/env.js";
import { verifyJwt } from "#utils/jwt.js";

const normalizeRole = (value) => {
  if (!value) return "promotor";
  return String(value).trim().toLowerCase();
};

const extractToken = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const fallbackToken = req.headers["x-access-token"];
  return typeof fallbackToken === "string" ? fallbackToken : null;
};

export function authenticateRequest(req, _res, next) {
  req.user = null;
  const token = extractToken(req);
  if (!token) {
    return next();
  }

  const verification = verifyJwt(token, env.security.jwtSecret);
  if (verification.valid && verification.payload) {
    req.user = {
      id: verification.payload.sub ?? null,
      role: normalizeRole(verification.payload.role),
      username: verification.payload.username,
      displayName: verification.payload.displayName
    };
  }

  return next();
}

export const requiresRole = (...roles) => (req, res, next) => {
  if (!roles || roles.length === 0) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ status: "erro", mensagem: "Autenticacao requerida." });
  }

  const role = normalizeRole(req.user.role);
  if (!roles.includes(role)) {
    return res.status(403).json({ status: "erro", mensagem: "Acesso nao autorizado para este recurso." });
  }

  return next();
};

const getIntegrationSecret = (integration) => {
  const cfg = env.integrations?.[integration] || {};
  return cfg.apiKey || cfg.apiToken || cfg.webhookSecret || "";
};

export function ensureIntegrationAuthorized(integration, req) {
  const expected = getIntegrationSecret(integration);
  if (!expected) {
    return;
  }

  const provided = typeof req.headers["x-api-key"] === "string" ? req.headers["x-api-key"] : null;
  if (expected !== provided) {
    const error = new Error("Chave de integracao invalida.");
    error.status = 401;
    throw error;
  }
}

export const actorFromRequest = (req) =>
  req.user?.displayName ||
  req.user?.username ||
  req.user?.id ||
  req.headers["x-actor"] ||
  req.headers["x-user-email"] ||
  "api";
