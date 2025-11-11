import { db } from "#core/database.js";
import { COLUMN_ALIASES } from "#importers/mapping.js";
import { normalizeKey } from "#importers/utils/ptbr.js";
import { asDate, cleanText, toDigits, toNumber } from "#utils/format.js";

const sanitizeDocumento = (value) => {
  if (!value) return null;
  const digits = String(value).replace(/\D+/g, "");
  return digits || null;
};

const findRawValue = (raw, aliasSet) => {
  if (!raw || typeof raw !== "object" || !aliasSet) return null;
  for (const [key, value] of Object.entries(raw)) {
    if (aliasSet.has(normalizeKey(key))) {
      return value;
    }
  }
  return null;
};

const extractInsertId = (result) => {
  if (Array.isArray(result) && result.length > 0) {
    const first = result[0];
    if (first && typeof first === "object" && "id" in first) {
      return first.id;
    }
    return first;
  }
  return result;
};

const insertWithId = async (table, payload) => {
  if (db.client.config.client === "pg") {
    const result = await db(table).insert(payload).returning("id");
    return extractInsertId(result);
  }
  const result = await db(table).insert(payload);
  return extractInsertId(result);
};

const getOrCreateCliente = async ({ nome, documento, origem }) => {
  const doc = sanitizeDocumento(documento);

  if (doc) {
    const existing = await db("clientes").where({ documento: doc }).first();
    if (existing) {
      return existing.id;
    }
  }

  const insertPayload = {
    nome: nome || "Cliente sem nome",
    documento: doc,
    origem: origem || "importacao",
    created_at: new Date(),
    ultima_atualizacao: new Date()
  };

  return await insertWithId("clientes", insertPayload);
};

const sanitizeTelefone = (value) => {
  if (!value) return null;
  const digits = String(value).replace(/\D+/g, "");
  if (!digits) return null;
  return digits.length === 11 ? digits : digits;
};

const toDateValue = (value) => {
  const normalized = asDate(value);
  return normalized ? normalized : null;
};

const resolveDate = (...inputs) => {
  for (const input of inputs) {
    const date = toDateValue(input);
    if (date) return date;
  }
  return null;
};

const touchClienteResumo = async (clienteId, { volumeLiquido, volumeBruto, comissao }) => {
  if (!clienteId) return;

  await db("clientes")
    .where({ id: clienteId })
    .update({
      volume_liquido_total: db.raw("COALESCE(volume_liquido_total, 0) + ?", [volumeLiquido]),
      volume_bruto_total: db.raw("COALESCE(volume_bruto_total, 0) + ?", [volumeBruto]),
      comissao_total: db.raw("COALESCE(comissao_total, 0) + ?", [comissao]),
      total_contratos: db.raw("COALESCE(total_contratos, 0) + 1"),
      ultima_atualizacao: new Date()
    });
};

const upsertContrato = async ({
  clienteId,
  produto,
  promotora,
  banco,
  contrato,
  status,
  volumeBruto,
  volumeLiquido,
  comissaoValor,
  dataOperacao
}) => {
  if (!contrato) {
    return null;
  }

  const insertPayload = {
    cliente_id: clienteId,
    produto,
    promotora,
    banco,
    contrato,
    status,
    volume_bruto: volumeBruto,
    volume_liquido: volumeLiquido,
    comissao_valor: comissaoValor,
    data_operacao: dataOperacao ? new Date(dataOperacao) : null,
    created_at: new Date()
  };

  const updatePayload = {
    cliente_id: clienteId,
    produto,
    promotora,
    banco,
    status,
    volume_bruto: volumeBruto,
    volume_liquido: volumeLiquido,
    comissao_valor: comissaoValor,
    data_operacao: dataOperacao ? new Date(dataOperacao) : null,
    updated_at: new Date()
  };

  const clientName = db?.client?.config?.client;

  if (clientName === "pg" || clientName === "mysql2") {
    await db("contratos").insert(insertPayload).onConflict("contrato").merge(updatePayload);
    return null;
  }

  const existing = await db("contratos").where({ contrato }).first();
  if (existing) {
    await db("contratos").where({ id: existing.id }).update(updatePayload);
    return existing.id;
  }

  return await insertWithId("contratos", insertPayload);
};

export async function persistNormalizedBatch(fonte = "desconhecida", arquivo, promotora, registros = []) {
  if (!Array.isArray(registros) || registros.length === 0) {
    return { inserted: 0, volumeBruto: 0, volumeLiquido: 0, comissao: 0 };
  }

  const sanitizedFonte = (fonte || promotora || "desconhecida").toLowerCase();
  const preparedRows = registros.map((registro) => {
    const documento = sanitizeDocumento(registro.documento);
    const raw = registro.raw || {};
    const contratoValue =
      registro.contratoId ||
      registro.contrato ||
      findRawValue(raw, COLUMN_ALIASES.contrato) ||
      findRawValue(raw, COLUMN_ALIASES.contratoAde) ||
      null;
    const contratoAdeValue =
      registro.contratoAde ||
      registro.contrato_ade ||
      findRawValue(raw, COLUMN_ALIASES.contratoAde) ||
      null;
    const valorBruto = toNumber(registro.valorBruto);
    const valorLiquido = toNumber(registro.valorLiquido || registro.valorBruto);
    const comissaoValor = toNumber(registro.comissao);
    const comissaoPercentual =
      registro.comissaoPercentual !== undefined && registro.comissaoPercentual !== null
        ? Number(Number(registro.comissaoPercentual).toFixed(6))
        : null;
    const statusComercial = cleanText(registro.status_comercial || registro.statusComercial);
    const situacao = cleanText(registro.situacao || registro.status);
    const origemComissao = cleanText(registro.origem_comissao || raw.origem_comissao);
    const situacaoComissao = cleanText(registro.situacao_comissao || raw.situacao_comissao);
    const ultimoContato = toDateValue(registro.ultimoContato || registro.ultimo_contato);
    const proximoContato = toDateValue(registro.proximoContato || registro.proximo_contato);
    const dataOperacao = resolveDate(
      registro.dataReferencia,
      registro.data_operacao,
      registro.raw?.data_operacao,
      registro.created_at
    );
    const dataPagamento = resolveDate(
      registro.dataPagamento,
      registro.data_pagamento,
      registro.raw?.data_pagamento,
      dataOperacao,
      registro.created_at
    );
    const diasFollowup =
      Number.isFinite(Number(registro.diasAteFollowup ?? registro.dias_ate_followup))
        ? Number(registro.diasAteFollowup ?? registro.dias_ate_followup)
        : null;
    const telefone = sanitizeTelefone(registro.telefone || raw.telefone);

    return {
      fonte: sanitizedFonte,
      origem: sanitizedFonte,
      arquivo,
      source_file: arquivo || null,
      import_batch_id: registro.importBatchId || registro.import_batch_id || null,
      promotora: registro.promotora || promotora,
      cliente_nome: registro.cliente || registro.cliente_nome || "Cliente sem nome",
      documento,
      telefone,
      produto: registro.produto || null,
      convenio: registro.convenio || raw.convenio || null,
      contrato: contratoValue ? String(contratoValue).trim() : null,
      contrato_ade: contratoAdeValue ? String(contratoAdeValue).trim() : null,
      banco: registro.banco || null,
      status: registro.status || statusComercial || null,
      status_comercial: statusComercial || registro.status || null,
      situacao,
      ultimo_contato: ultimoContato,
      proximo_contato: proximoContato,
      dias_ate_followup: diasFollowup,
      data_operacao: dataOperacao,
      data_pagamento: dataPagamento,
      volume_bruto: valorBruto,
      volume_liquido: valorLiquido,
      comissao_valor: comissaoValor,
      comissao_percentual: comissaoPercentual,
      comissao_liquida: comissaoValor,
      origem_comissao: origemComissao,
      situacao_comissao: situacaoComissao,
      observacoes_estrategicas: cleanText(registro.observacoes || registro.observacoes_estrategicas),
      resultado: registro.resultado || null,
      motivo_perda: registro.motivo_perda || null,
      comissao_percentual: comissaoPercentual,
      updated_at: new Date(),
      raw: registro.raw || registro
    };
  });

  await db.batchInsert("imported_records", preparedRows, 500);

  let volumeBrutoTotal = 0;
  let volumeLiquidoTotal = 0;
  let comissaoTotal = 0;

  for (const row of preparedRows) {
    volumeBrutoTotal += row.volume_bruto || 0;
    volumeLiquidoTotal += row.volume_liquido || 0;
    comissaoTotal += row.comissao_valor || 0;

    const clienteId = await getOrCreateCliente({
      nome: row.cliente_nome,
      documento: row.documento,
      origem: row.fonte
    });

    await touchClienteResumo(clienteId, {
      volumeLiquido: row.volume_liquido || 0,
      volumeBruto: row.volume_bruto || 0,
      comissao: row.comissao_valor || 0
    });

    await upsertContrato({
      clienteId,
      produto: row.produto,
      promotora: row.promotora || promotora,
      banco: row.banco || row.raw?.banco || null,
      contrato: row.contrato,
      status: row.status || row.raw?.status || null,
      volumeBruto: row.volume_bruto || 0,
      volumeLiquido: row.volume_liquido || 0,
      comissaoValor: row.comissao_valor || 0,
      dataOperacao: row.data_operacao
    });
  }

  return {
    inserted: preparedRows.length,
    volumeBruto: Number(volumeBrutoTotal.toFixed(2)),
    volumeLiquido: Number(volumeLiquidoTotal.toFixed(2)),
    comissao: Number(comissaoTotal.toFixed(2))
  };
}

export async function persistImportedRecord(records = []) {
  if (!Array.isArray(records) || records.length === 0) {
    return { inserted: 0, volumeBruto: 0, volumeLiquido: 0, comissao: 0 };
  }

  const prepared = records.map((record) => {
    const nome =
      cleanText(record.nome_cliente || record.cliente_nome || record.nome) || "Cliente sem nome";
    const documento = sanitizeDocumento(record.cpf || record.documento);
    const telefone = sanitizeTelefone(record.telefone);
    const volumeBruto = toNumber(record.volume_bruto ?? record.volumeBruto);
    const volumeLiquido =
      toNumber(record.volume_liquido ?? record.volumeLiquido) || volumeBruto;
    const comissaoValor =
      toNumber(record.comissao_liquida ?? record.comissao_valor ?? record.comissao) || 0;
    const comissaoPercentual =
      record.comissao_percentual !== undefined && record.comissao_percentual !== null
        ? Number(Number(record.comissao_percentual).toFixed(6))
        : record.comissaoPercentual !== undefined && record.comissaoPercentual !== null
        ? Number(Number(record.comissaoPercentual).toFixed(6))
        : null;
    const fonte = cleanText(record.fonte || record.origem) || "importacao";
    const origem = record.origem || fonte;
    const ultimoContato = toDateValue(record.ultimo_contato);
    const proximoContato = toDateValue(record.proximo_contato);
    const dataOperacao = resolveDate(
      record.data_operacao,
      record.dataReferencia,
      record.raw?.data_operacao,
      record.created_at
    );
    const dataPagamento = resolveDate(
      record.data_pagamento,
      record.dataPagamento,
      record.raw?.data_pagamento,
      dataOperacao,
      record.created_at
    );
    const diasFollowup =
      Number.isFinite(Number(record.dias_ate_followup))
        ? Number(record.dias_ate_followup)
        : null;

    return {
      fonte: fonte.toLowerCase(),
      origem,
      arquivo: record.arquivo || record.source_file || null,
      source_file: record.source_file || record.arquivo || null,
      import_batch_id: record.import_batch_id || null,
      promotora: record.promotora || cleanText(record.promotora) || null,
      cliente_nome: nome,
      documento,
      telefone,
      produto: record.produto || null,
      convenio: record.convenio || null,
      banco: record.banco || null,
      status: record.status || record.status_comercial || null,
      status_comercial: record.status_comercial || record.status || null,
      situacao: record.situacao || null,
      volume_bruto: volumeBruto,
      volume_liquido: volumeLiquido,
      comissao_valor: comissaoValor,
      comissao_liquida: comissaoValor,
      comissao_percentual: comissaoPercentual,
      data_operacao: dataOperacao,
      data_pagamento: dataPagamento,
      ultimo_contato: ultimoContato,
      proximo_contato: proximoContato,
      dias_ate_followup: diasFollowup,
      origem_comissao: record.origem_comissao || null,
      situacao_comissao: record.situacao_comissao || null,
      observacoes_estrategicas: record.observacoes_estrategicas || null,
      contrato: record.contrato || null,
      contrato_ade: record.contrato_ade || null,
      resultado: record.resultado || null,
      motivo_perda: record.motivo_perda || null,
      updated_at: new Date(),
      raw: record.raw || record
    };
  });

  await db.batchInsert("imported_records", prepared, 500);

  let volumeBruto = 0;
  let volumeLiquido = 0;
  let comissao = 0;

  prepared.forEach((row) => {
    volumeBruto += row.volume_bruto || 0;
    volumeLiquido += row.volume_liquido || 0;
    comissao += row.comissao_liquida || 0;
  });

  return {
    inserted: prepared.length,
    volumeBruto: Number(volumeBruto.toFixed(2)),
    volumeLiquido: Number(volumeLiquido.toFixed(2)),
    comissao: Number(comissao.toFixed(2))
  };
}
