import { db } from "#core/database.js";

const MAX_MESSAGE_LENGTH = 512;
const MAX_PAYLOAD_LENGTH = 4000;
const SENSITIVE_KEYS = [
  "password",
  "senha",
  "token",
  "secret",
  "api_key",
  "apikey",
  "refresh",
  "signature"
];

const truncate = (value, limit) => {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value);
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
};

const sanitizeValue = (value, depth = 0) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (depth > 2) {
    return "[trimmed]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, 5).map((entry) => sanitizeValue(entry, depth + 1));
  }

  if (typeof value === "object") {
    const sanitized = {};

    for (const [key, entryValue] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
        sanitized[key] = "[redacted]";
        continue;
      }

      sanitized[key] = sanitizeValue(entryValue, depth + 1);
    }

    return sanitized;
  }

  if (typeof value === "string" && value.length > 256) {
    return `${value.slice(0, 256)}…`;
  }

  return value;
};

const buildPayloadPreview = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  try {
    const sanitized = sanitizeValue(payload);
    return truncate(JSON.stringify(sanitized), MAX_PAYLOAD_LENGTH);
  } catch (error) {
    return truncate(`[unserializable payload: ${error.message}]`, MAX_MESSAGE_LENGTH);
  }
};

export async function logActivity(entry) {
  if (!entry || !entry.requestId) {
    return;
  }

  const payloadPreview =
    typeof entry.payload === "string" ? truncate(entry.payload, MAX_PAYLOAD_LENGTH) : buildPayloadPreview(entry.payload);

  await db("activity_logs").insert({
    request_id: entry.requestId,
    source: entry.source ? truncate(entry.source, 64) : null,
    route: truncate(entry.route, 255),
    method: truncate(entry.method, 16),
    user_id: entry.userId ? String(entry.userId) : null,
    user_role: entry.userRole ? truncate(entry.userRole, 64) : null,
    username: entry.username ? truncate(entry.username, 120) : null,
    status_code: entry.statusCode ?? null,
    duration_ms: entry.durationMs ?? null,
    success: entry.success ?? false,
    message: entry.message ? truncate(entry.message, MAX_MESSAGE_LENGTH) : null,
    payload_preview: payloadPreview,
    ip: entry.ip ? truncate(entry.ip, 64) : null,
    user_agent: entry.userAgent ? truncate(entry.userAgent, 255) : null,
    created_at: entry.createdAt || db.fn.now()
  });
}
