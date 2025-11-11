import { db } from "#core/database.js";

const ensureStatus = (value) => {
  const normalized = String(value || "").toLowerCase();
  const allowed = ["pendente", "em_andamento", "concluido", "cancelado"];
  if (allowed.includes(normalized)) return normalized;
  return "pendente";
};

const toDateOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sanitizeFollowupPayload = (payload = {}) => {
  const now = new Date();
  const dataAgendada = toDateOrNull(payload.dataAgendada ?? payload.data_agendada);
  const status = ensureStatus(payload.status);
  const concluidoEm =
    status === "concluido" ? toDateOrNull(payload.concluidoEm ?? payload.concluido_em ?? now) : null;

  return {
    cliente_nome: String(payload.clienteNome ?? payload.cliente_nome ?? "Cliente sem nome").trim(),
    cliente_documento: payload.clienteDocumento ?? payload.cliente_documento ?? null,
    contato: payload.contato ?? null,
    responsavel: payload.responsavel ?? null,
    status,
    origem: payload.origem ?? "manual",
    resultado: payload.resultado ?? null,
    descricao: payload.descricao ?? null,
    data_agendada: dataAgendada,
    concluido_em: concluidoEm
  };
};

export async function listarFollowups({
  status,
  responsavel,
  dataInicio,
  dataFim,
  busca
} = {}) {
  const query = db("crm_followups").orderBy("data_agendada", "asc").orderBy("created_at", "desc");

  if (status && status !== "todos") {
    query.where("status", status);
  }

  if (responsavel) {
    query.where("responsavel", responsavel);
  }

  if (dataInicio) {
    query.where("data_agendada", ">=", dataInicio);
  }

  if (dataFim) {
    query.where("data_agendada", "<=", dataFim);
  }

  if (busca) {
    const term = `%${busca.toLowerCase()}%`;
    query.where((builder) => {
      if (typeof builder.whereILike === "function") {
        builder
          .whereILike("cliente_nome", term)
          .orWhereILike("descricao", term)
          .orWhereILike("resultado", term);
      } else {
        builder
          .where("cliente_nome", "like", term)
          .orWhere("descricao", "like", term)
          .orWhere("resultado", "like", term);
      }
    });
  }

  const rows = await query.select("*");

  return rows.map((row) => ({
    id: row.id,
    clienteNome: row.cliente_nome,
    clienteDocumento: row.cliente_documento,
    contato: row.contato,
    responsavel: row.responsavel,
    status: row.status,
    origem: row.origem,
    resultado: row.resultado,
    descricao: row.descricao,
    dataAgendada: row.data_agendada,
    concluidoEm: row.concluido_em,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at
  }));
}

export async function criarFollowup(payload) {
  const data = sanitizeFollowupPayload(payload);
  const now = new Date();

  const insertPayload = {
    ...data,
    created_at: now,
    updated_at: now
  };

  const [id] = await db("crm_followups").insert(insertPayload).returning("id");
  const newId = typeof id === "object" ? id.id : id;
  return obterFollowupPorId(newId);
}

export async function atualizarFollowup(id, payload) {
  const data = sanitizeFollowupPayload(payload);
  const now = new Date();

  await db("crm_followups")
    .where({ id })
    .update({
      ...data,
      updated_at: now
    });

  return obterFollowupPorId(id);
}

export async function obterFollowupPorId(id) {
  const followup = await db("crm_followups").where({ id }).first();
  if (!followup) return null;
  return {
    id: followup.id,
    clienteNome: followup.cliente_nome,
    clienteDocumento: followup.cliente_documento,
    contato: followup.contato,
    responsavel: followup.responsavel,
    status: followup.status,
    origem: followup.origem,
    resultado: followup.resultado,
    descricao: followup.descricao,
    dataAgendada: followup.data_agendada,
    concluidoEm: followup.concluido_em,
    criadoEm: followup.created_at,
    atualizadoEm: followup.updated_at
  };
}
