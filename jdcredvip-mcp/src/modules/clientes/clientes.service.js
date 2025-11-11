import { db } from "#core/database.js";

const clampLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 50;
  }
  return Math.min(Math.max(Math.round(parsed), 10), 200);
};

const clampOffset = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
};

const normalizeSearch = (value) => {
  if (!value) return "";
  return String(value).trim().toLowerCase();
};

const extractDigits = (value) => {
  if (!value) return "";
  return String(value).replace(/\D+/g, "");
};

const formatDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeDateFilter = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
};

const applyFilters = (query, filters = {}) => {
  if (filters.promotora && filters.promotora !== "todos") {
    query.where("promotora", filters.promotora);
  }

  if (filters.origem && filters.origem !== "todos") {
    query.where((builder) => {
      builder.where("origem", filters.origem).orWhere("fonte", filters.origem);
    });
  }

  if (filters.status && filters.status !== "todos") {
    query.where((builder) => {
      builder
        .where("status", filters.status)
        .orWhere("status_comercial", filters.status)
        .orWhere("situacao", filters.status);
    });
  }

  if (filters.produto && filters.produto !== "todos") {
    query.where("produto", filters.produto);
  }

  if (filters.dataInicio) {
    query.where("data_pagamento", ">=", filters.dataInicio);
  }

  if (filters.dataFim) {
    query.where("data_pagamento", "<=", filters.dataFim);
  }

  if (filters.search) {
    const term = normalizeSearch(filters.search);
    const digits = extractDigits(filters.search);
    if (term || digits) {
      query.andWhere((builder) => {
        if (term) {
          const like = `%${term}%`;
          builder
            .whereRaw("LOWER(COALESCE(cliente_nome, '')) LIKE ?", [like])
            .orWhereRaw("LOWER(COALESCE(contrato, '')) LIKE ?", [like])
            .orWhereRaw("LOWER(COALESCE(contrato_ade, '')) LIKE ?", [like])
            .orWhereRaw("LOWER(COALESCE(produto, '')) LIKE ?", [like]);
        }
        if (digits) {
          builder.orWhereRaw("COALESCE(documento, '') LIKE ?", [`%${digits}%`]);
        } else if (term) {
          builder.orWhereRaw("LOWER(COALESCE(documento, '')) LIKE ?", [`%${term}%`]);
        }
      });
    }
  }
};

const mapRowToCliente = (row) => {
  const volumeBruto = Number(row.volumeBruto ?? 0);
  const volumeLiquido = Number(row.volumeLiquido ?? 0);
  const comissao = Number(row.comissao ?? 0);
  const comissaoLiquida = Number(row.comissaoLiquida ?? row.comissao ?? 0);
  const origemPrincipal = row.origem || row.fonte || null;
  const ultimoStatus = row.status || row.statusComercial || row.situacao || null;

  return {
    id: row.id,
    promotora: row.promotora,
    nomeCliente: row.nomeCliente,
    nome: row.nomeCliente,
    cpf: row.cpf,
    documento: row.cpf,
    telefone: row.telefone,
    produto: row.produto,
    convenio: row.convenio,
    banco: row.banco,
    volumeBruto,
    volumeLiquido,
    status: row.status,
    statusComercial: row.statusComercial,
    situacao: row.situacao,
    ultimoContato: formatDate(row.ultimoContato),
    proximoContato: formatDate(row.proximoContato),
    diasAteFollowup:
      row.diasAteFollowup === null || row.diasAteFollowup === undefined
        ? null
        : Number(row.diasAteFollowup),
    comissao,
    comissaoLiquida,
    comissaoPercentual: row.comissaoPercentual !== null && row.comissaoPercentual !== undefined ? Number(row.comissaoPercentual) : null,
    dataPagamento: formatDate(row.dataPagamento),
    origemComissao: row.origemComissao,
    situacaoComissao: row.situacaoComissao,
    observacoesEstrategicas: row.observacoesEstrategicas,
    contrato: row.contrato,
    contratoAde: row.contratoAde,
    resultado: row.resultado,
    motivoPerda: row.motivoPerda,
    origem: origemPrincipal,
    fonte: row.fonte,
    arquivo: row.arquivo,
    sourceFile: row.sourceFile,
    importBatchId: row.importBatchId,
    createdAt: formatDate(row.createdAt),
    updatedAt: formatDate(row.updatedAt),
    promotoras: row.promotora ? [row.promotora] : [],
    produtos: row.produto ? [row.produto] : [],
    origens: origemPrincipal ? [origemPrincipal] : [],
    ultimoStatus,
    ultimaAtualizacao: formatDate(row.updatedAt || row.createdAt)
  };
};

const collectDistinctValues = async (baseQuery, column) => {
  const rows = await baseQuery
    .clone()
    .clearSelect()
    .distinct(column)
    .orderBy(column);

  return rows
    .map((row) => row[column])
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
    .map((value) => String(value).trim());
};

export async function listarClientes({
  search,
  promotora,
  origem,
  status,
  produto,
  dataInicio,
  dataFim,
  limit,
  offset
} = {}) {
  const safeLimit = clampLimit(limit);
  const safeOffset = clampOffset(offset);

  const filters = {
    search,
    promotora,
    origem,
    status,
    produto,
    dataInicio: normalizeDateFilter(dataInicio),
    dataFim: normalizeDateFilter(dataFim, true)
  };
  const filteredQuery = db("imported_records").modify((query) => applyFilters(query, filters));

  const totalRow = await filteredQuery.clone().count({ total: "*" }).first();
  const total = Number(totalRow?.total ?? totalRow?.count ?? 0);

  const uniqueKeySubquery = filteredQuery
    .clone()
    .clearSelect()
    .select(db.raw("COALESCE(NULLIF(documento, ''), cliente_nome) AS cliente_key"));

  const uniqueRow = await db
    .from(uniqueKeySubquery.as("clientes_unicos"))
    .whereNotNull("cliente_key")
    .countDistinct({ total: "cliente_key" })
    .first();

  const totalClientesUnicos = Number(uniqueRow?.total ?? uniqueRow?.count ?? 0);

  const totalsRow = await filteredQuery
    .clone()
    .clearSelect()
    .clearOrder()
    .sum({
      volumeLiquidoTotal: "volume_liquido",
      volumeBrutoTotal: "volume_bruto",
      comissaoTotal: "comissao_valor"
    })
    .first();

  const aggregates = {
    totalRegistros: total,
    totalClientesUnicos,
    volumeLiquidoTotal: Number(totalsRow?.volumeLiquidoTotal ?? totalsRow?.volume_liquido_total ?? 0),
    volumeBrutoTotal: Number(totalsRow?.volumeBrutoTotal ?? totalsRow?.volume_bruto_total ?? 0),
    comissaoTotal: Number(totalsRow?.comissaoTotal ?? totalsRow?.comissao_total ?? 0)
  };

  const rows = await filteredQuery
    .clone()
    .select(
      "id",
      "promotora",
      "cliente_nome as nomeCliente",
      "documento as cpf",
      "telefone",
      "produto",
      "convenio",
      "banco",
      "volume_bruto as volumeBruto",
      "volume_liquido as volumeLiquido",
      "status",
      "status_comercial as statusComercial",
      "situacao",
      "ultimo_contato as ultimoContato",
      "proximo_contato as proximoContato",
      "dias_ate_followup as diasAteFollowup",
      "comissao_valor as comissao",
      "comissao_liquida as comissaoLiquida",
      "comissao_percentual as comissaoPercentual",
      "data_pagamento as dataPagamento",
      "origem_comissao as origemComissao",
      "situacao_comissao as situacaoComissao",
      "observacoes_estrategicas as observacoesEstrategicas",
      "contrato",
      "contrato_ade as contratoAde",
      "resultado",
      "motivo_perda as motivoPerda",
      "origem",
      "fonte",
      "arquivo",
      "source_file as sourceFile",
      "import_batch_id as importBatchId",
      "created_at as createdAt",
      "updated_at as updatedAt"
    )
    .orderBy("created_at", "desc")
    .limit(safeLimit)
    .offset(safeOffset);

  const [promotorasDisponiveis, origensDisponiveis, statusDisponiveis, fontesDisponiveis] =
    await Promise.all([
      collectDistinctValues(filteredQuery, "promotora"),
      collectDistinctValues(filteredQuery, "origem"),
      collectDistinctValues(filteredQuery, "status"),
      collectDistinctValues(filteredQuery, "fonte")
    ]);

  const origemLista = origensDisponiveis.length ? origensDisponiveis : fontesDisponiveis;

  return {
    total,
    totalClientesUnicos,
    limit: safeLimit,
    offset: safeOffset,
    promotorasDisponiveis,
    origensDisponiveis: origemLista,
    statusDisponiveis,
    clientes: rows.map(mapRowToCliente),
    aggregates
  };
}

export const __testables = {
  mapRowToCliente
};

export default {
  listarClientes
};
