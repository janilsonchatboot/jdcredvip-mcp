import { db } from "#core/database.js";

const toNumber = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(4)) : fallback;
};

const decimalOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(4)) : null;
};

const parseMetadata = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
};

const sanitizeMetadata = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return null;
    }
  }
  if (typeof value === "object") return value;
  return null;
};

const boolOr = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  const text = String(value).toLowerCase();
  if (["1", "true", "on", "yes", "ativo"].includes(text)) return true;
  if (["0", "false", "off", "no", "inativo"].includes(text)) return false;
  return fallback;
};

const integerOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const cleanText = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

const extractId = (result) => {
  if (Array.isArray(result)) {
    const [first] = result;
    if (typeof first === "object" && first !== null && "id" in first) {
      return first.id;
    }
    return first;
  }
  return result;
};

const mapBancoRow = (row) => ({
  id: row.id,
  nome: row.nome,
  apelido: row.apelido,
  codigo: row.codigo,
  taxaMedia: toNumber(row.taxa_media, null),
  ativo: row.ativo !== false,
  metadata: parseMetadata(row.metadata),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapPromotoraRow = (row) => ({
  id: row.id,
  nome: row.nome,
  documento: row.documento,
  responsavel: row.responsavel,
  contato: row.contato,
  status: row.status || "ativo",
  metadata: parseMetadata(row.metadata),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapProdutoRow = (row) => ({
  id: row.id,
  nome: row.nome,
  tipo: row.tipo,
  ativo: row.ativo !== false,
  bancoId: row.banco_id,
  bancoNome: row.banco_nome || null,
  promotoraId: row.promotora_id,
  promotoraNome: row.promotora_nome || null,
  taxaMedia: toNumber(row.taxa_media, null),
  comissaoPercent: toNumber(row.comissao_percent, null),
  metadata: parseMetadata(row.metadata),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const sanitizeBancoPayload = (payload = {}) => {
  const nome = cleanText(payload.nome || payload.name);
  if (!nome) {
    throw new Error("Informe o nome do banco.");
  }

  return {
    nome,
    apelido: cleanText(payload.apelido || payload.alias),
    codigo: cleanText(payload.codigo || payload.code),
    taxa_media: decimalOrNull(payload.taxaMedia ?? payload.taxa_media),
    ativo: boolOr(payload.ativo, true),
    metadata: sanitizeMetadata(payload.metadata)
  };
};

const sanitizePromotoraPayload = (payload = {}) => {
  const nome = cleanText(payload.nome || payload.name);
  if (!nome) {
    throw new Error("Informe o nome da promotora.");
  }

  const status = cleanText(payload.status) || "ativo";

  return {
    nome,
    documento: cleanText(payload.documento || payload.document),
    responsavel: cleanText(payload.responsavel || payload.owner),
    contato: cleanText(payload.contato || payload.contact),
    status,
    metadata: sanitizeMetadata(payload.metadata)
  };
};

const sanitizeProdutoPayload = (payload = {}) => {
  const nome = cleanText(payload.nome || payload.name);
  if (!nome) {
    throw new Error("Informe o nome do produto.");
  }

  return {
    nome,
    tipo: cleanText(payload.tipo || payload.type) || "generico",
    banco_id: integerOrNull(payload.bancoId ?? payload.banco_id),
    promotora_id: integerOrNull(payload.promotoraId ?? payload.promotora_id),
    taxa_media: decimalOrNull(payload.taxaMedia ?? payload.taxa_media),
    comissao_percent: decimalOrNull(payload.comissaoPercent ?? payload.comissao_percent),
    ativo: boolOr(payload.ativo, true),
    metadata: sanitizeMetadata(payload.metadata)
  };
};

const ensureRecordExists = async (table, id) => {
  if (!id) return null;
  const row = await db(table).where({ id }).first();
  if (!row) {
    throw new Error(`Registro relacionado (${table}) nao encontrado.`);
  }
  return row;
};

export async function listarBancos() {
  const rows = await db("crm_bancos").orderBy("nome", "asc");
  return rows.map(mapBancoRow);
}

export async function obterBancoPorId(id) {
  const row = await db("crm_bancos").where({ id }).first();
  if (!row) return null;
  return mapBancoRow(row);
}

export async function criarBanco(payload) {
  const data = sanitizeBancoPayload(payload);
  const timestamps = { created_at: new Date(), updated_at: new Date() };
  const result = await db("crm_bancos").insert({ ...data, ...timestamps });
  const id = extractId(result);
  return obterBancoPorId(id);
}

export async function atualizarBanco(id, payload) {
  const existente = await obterBancoPorId(id);
  if (!existente) {
    throw new Error("Banco nao encontrado.");
  }
  const data = sanitizeBancoPayload({ ...existente, ...payload });
  await db("crm_bancos")
    .where({ id })
    .update({ ...data, updated_at: new Date() });
  return obterBancoPorId(id);
}

export async function removerBanco(id) {
  await db("crm_bancos").where({ id }).delete();
}

export async function listarPromotoras() {
  const rows = await db("crm_promotoras").orderBy("nome", "asc");
  return rows.map(mapPromotoraRow);
}

export async function obterPromotoraPorId(id) {
  const row = await db("crm_promotoras").where({ id }).first();
  if (!row) return null;
  return mapPromotoraRow(row);
}

export async function criarPromotora(payload) {
  const data = sanitizePromotoraPayload(payload);
  const timestamps = { created_at: new Date(), updated_at: new Date() };
  const result = await db("crm_promotoras").insert({ ...data, ...timestamps });
  const id = extractId(result);
  return obterPromotoraPorId(id);
}

export async function atualizarPromotora(id, payload) {
  const existente = await obterPromotoraPorId(id);
  if (!existente) {
    throw new Error("Promotora nao encontrada.");
  }
  const data = sanitizePromotoraPayload({ ...existente, ...payload });
  await db("crm_promotoras").where({ id }).update({ ...data, updated_at: new Date() });
  return obterPromotoraPorId(id);
}

export async function removerPromotora(id) {
  await db("crm_promotoras").where({ id }).delete();
}

export async function listarProdutos() {
  const rows = await db("crm_produtos as p")
    .leftJoin("crm_bancos as b", "p.banco_id", "b.id")
    .leftJoin("crm_promotoras as pr", "p.promotora_id", "pr.id")
    .select(
      "p.*",
      "b.nome as banco_nome",
      "pr.nome as promotora_nome"
    )
    .orderBy("p.nome", "asc");

  return rows.map(mapProdutoRow);
}

export async function obterProdutoPorId(id) {
  const row = await db("crm_produtos as p")
    .leftJoin("crm_bancos as b", "p.banco_id", "b.id")
    .leftJoin("crm_promotoras as pr", "p.promotora_id", "pr.id")
    .select(
      "p.*",
      "b.nome as banco_nome",
      "pr.nome as promotora_nome"
    )
    .where("p.id", id)
    .first();

  if (!row) return null;
  return mapProdutoRow(row);
}

export async function criarProduto(payload) {
  const data = sanitizeProdutoPayload(payload);

  if (data.banco_id) {
    await ensureRecordExists("crm_bancos", data.banco_id);
  }
  if (data.promotora_id) {
    await ensureRecordExists("crm_promotoras", data.promotora_id);
  }

  const timestamps = { created_at: new Date(), updated_at: new Date() };
  const result = await db("crm_produtos").insert({ ...data, ...timestamps });
  const id = extractId(result);
  return obterProdutoPorId(id);
}

export async function atualizarProduto(id, payload) {
  const existente = await obterProdutoPorId(id);
  if (!existente) {
    throw new Error("Produto nao encontrado.");
  }
  const data = sanitizeProdutoPayload({ ...existente, ...payload });

  if (data.banco_id) {
    await ensureRecordExists("crm_bancos", data.banco_id);
  }
  if (data.promotora_id) {
    await ensureRecordExists("crm_promotoras", data.promotora_id);
  }

  await db("crm_produtos").where({ id }).update({ ...data, updated_at: new Date() });
  return obterProdutoPorId(id);
}

export async function removerProduto(id) {
  await db("crm_produtos").where({ id }).delete();
}
