// === JD CRED VIP - Registro de integacoes com contexto estruturado ===
import { db } from "#core/database.js";

const normalizeDetails = (value) => {
  if (value === null || value === undefined) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return { ...value };
  }
  return { value };
};

const formatOrigin = (value, fallback) => {
  const raw = value || fallback || "";
  return raw.toString().toUpperCase();
};

const buildDetailsPayload = (detalhes, contexto, integracao) => {
  const details = normalizeDetails(detalhes);
  const contextPayload = {
    module: contexto.module || integracao,
    origin: formatOrigin(contexto.origin, integracao),
    actor: contexto.actor ?? null,
    userId: contexto.userId ?? null,
    ip: contexto.ip ?? null,
    requestId: contexto.requestId ?? null,
    httpStatus: contexto.httpStatus ?? null,
    userAgent: contexto.userAgent ?? null,
    payload: contexto.payload ?? null
  };

  if (!details.module) {
    details.module = contextPayload.module;
  }
  if (!details.origin) {
    details.origin = contextPayload.origin;
  }
  details.context = contextPayload;
  return details;
};

export async function logIntegration(
  integracao,
  acao,
  status,
  mensagem = null,
  detalhes = null,
  contexto = {}
) {
  try {
    const details = buildDetailsPayload(detalhes, contexto, integracao);

    await db("integration_logs").insert({
      integracao,
      acao,
      status,
      mensagem,
      detalhes: details
    });
  } catch (error) {
    console.error("Falha ao registrar log de integracao:", error.message);
  }
}

const applyLogFilters = (query, filters = {}) => {
  if (filters.integracao && filters.integracao !== "todos") {
    query.where("integracao", filters.integracao.toLowerCase());
  }

  if (filters.status) {
    query.where("status", filters.status.toLowerCase());
  }

  if (filters.acao) {
    query.where("acao", filters.acao.toLowerCase());
  }
};

const applySearch = (query, search) => {
  if (!search) return;
  const like = `%${search}%`;
  query.andWhere((builder) => {
    if (typeof builder.whereILike === "function") {
      builder.whereILike("mensagem", like).orWhereRaw("detalhes::text ILIKE ?", [like]);
    } else {
      builder.where("mensagem", "like", like).orWhereRaw("CAST(detalhes AS CHAR) LIKE ?", [like]);
    }
  });
};

export async function queryIntegrationLogs(options = {}) {
  const limit = Number.isFinite(options.limit) ? Math.min(Math.max(options.limit, 1), 250) : 25;
  const offset = Number.isFinite(options.offset) ? Math.max(options.offset, 0) : 0;
  const order = options.order === "asc" ? "asc" : "desc";

  const filtered = db("integration_logs").modify((builder) => {
    applyLogFilters(builder, options);
    applySearch(builder, options.search);
  });

  const items = await filtered
    .clone()
    .orderBy("created_at", order)
    .limit(limit)
    .offset(offset);

  const totalRow = await filtered.clone().count({ total: "*" }).first();

  return {
    total: Number(totalRow?.total ?? totalRow?.count ?? 0),
    items
  };
}

export async function getLatestLogs(limit = 10) {
  const resultado = await queryIntegrationLogs({ limit });
  return resultado.items;
}

export const __logTestUtils = {
  normalizeDetails,
  buildDetailsPayload
};
