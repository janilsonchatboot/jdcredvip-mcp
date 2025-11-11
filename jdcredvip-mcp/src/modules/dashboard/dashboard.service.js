import { db } from "#core/database.js";
import { stripAccents } from "#importers/utils/ptbr.js";
import { createTtlCache } from "#utils/cache.js";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toFixedNumber = (value, digits = 2) => {
  const parsed = toNumber(value);
  return Number(parsed.toFixed(digits));
};

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const dateKey = (value) => {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return parsed.toISOString().slice(0, 10);
};

const parseJsonColumn = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;
const insightsCache = createTtlCache({ ttlMs: 10 * 60 * 1000 });

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const addDays = (value, amount) => {
  const base = toDate(value);
  if (!base) return null;
  base.setDate(base.getDate() + amount);
  return base;
};

const endOfDay = (value) => {
  const base = toDate(value);
  if (!base) return null;
  base.setHours(23, 59, 59, 999);
  return base;
};

const diffInDays = (start, end) => {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_IN_MS));
};

const resolveRangeWindow = (filters = {}) => {
  let start = toDate(filters.dataInicio);
  let end = toDate(filters.dataFim);

  if (!start && !end) {
    end = new Date();
    start = addDays(end, -(DEFAULT_RANGE_DAYS - 1));
  } else if (start && !end) {
    end = new Date();
  } else if (!start && end) {
    start = addDays(end, -(DEFAULT_RANGE_DAYS - 1));
  }

  if (!start || !end) return null;

  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  const days = diffInDays(start, end) + 1;

  return {
    start,
    end,
    dataInicio: dateKey(start),
    dataFim: dateKey(end),
    days
  };
};

const buildComparisonWindow = (filters) => {
  const current = resolveRangeWindow(filters);
  if (!current) return null;

  const previousEnd = addDays(current.start, -1);
  const previousStart = previousEnd ? addDays(previousEnd, -(current.days - 1)) : null;

  if (!previousEnd || !previousStart) {
    return null;
  }

  return {
    current,
    previous: {
      start: previousStart,
      end: previousEnd,
      dataInicio: dateKey(previousStart),
      dataFim: dateKey(previousEnd),
      days: current.days
    }
  };
};

const computeMetricDelta = (currentMetrics = {}, previousMetrics = {}) => {
  const delta = {};
  const keys = new Set([...Object.keys(currentMetrics), ...Object.keys(previousMetrics)]);

  keys.forEach((key) => {
    const currentValue = toNumber(currentMetrics[key]);
    const previousValue = toNumber(previousMetrics[key]);
    const absolute = Number((currentValue - previousValue).toFixed(2));
    let percent = 0;

    if (previousValue === 0) {
      percent = currentValue === 0 ? 0 : 100;
    } else {
      percent = Number((((currentValue - previousValue) / Math.abs(previousValue)) * 100).toFixed(2));
    }

    delta[key] = { absolute, percent };
  });

  return delta;
};

const normalizeFilters = (filters = {}) => {
  const normalized = {};

  if (filters.promotora) normalized.promotora = String(filters.promotora).trim();
  if (filters.produto) normalized.produto = String(filters.produto).trim();
  if (filters.status) normalized.status = String(filters.status).trim();

  if (filters.dataInicio) {
    const parsed = parseDate(filters.dataInicio);
    if (parsed) normalized.dataInicio = dateKey(parsed);
  }

  if (filters.dataFim) {
    const parsed = parseDate(filters.dataFim);
    if (parsed) normalized.dataFim = dateKey(parsed);
  }

  if (normalized.dataInicio && normalized.dataFim && normalized.dataInicio > normalized.dataFim) {
    const tmp = normalized.dataInicio;
    normalized.dataInicio = normalized.dataFim;
    normalized.dataFim = tmp;
  }

  return normalized;
};

const applyContractFilters = (query, filters) => {
  if (filters.promotora) query.where("promotora", filters.promotora);
  if (filters.produto) query.where("produto", filters.produto);
  if (filters.status) query.where("status", filters.status);
  if (filters.dataInicio) query.where("data_contratacao", ">=", filters.dataInicio);
  if (filters.dataFim) query.where("data_contratacao", "<=", filters.dataFim);
};

const applyCommissionFilters = (query, filters) => {
  if (filters.promotora) query.where("promotora", filters.promotora);
  if (filters.produto) query.where("produto", filters.produto);
  if (filters.dataInicio) query.where("referencia", ">=", filters.dataInicio);
  if (filters.dataFim) query.where("referencia", "<=", filters.dataFim);
};

const applyImportFilters = (query, filters) => {
  if (filters.promotora) query.where("promotora", filters.promotora);
  if (filters.dataInicio) query.where("created_at", ">=", filters.dataInicio);
  if (filters.dataFim) query.where("created_at", "<=", filters.dataFim);
};

const sortBy = (items, key, limit) => {
  const sorted = [...items].sort((a, b) => toNumber(b[key]) - toNumber(a[key]));
  if (limit && Number.isFinite(limit)) {
    return sorted.slice(0, limit);
  }
  return sorted;
};

const buildPromotoraEntry = (existing, volumeLiquido, volumeBruto) => {
  const entry = existing || {
    nome: "Desconhecida",
    totalContratos: 0,
    volumeLiquido: 0,
    volumeBruto: 0
  };
  entry.totalContratos += 1;
  entry.volumeLiquido += volumeLiquido;
  entry.volumeBruto += volumeBruto;
  return entry;
};

const normalizeToken = (value = "") =>
  stripAccents(String(value).trim().toLowerCase()).replace(/\s+/g, "");

const mapTokens = (tokens = []) => tokens.map((token) => normalizeToken(token));

async function fetchDashboardRows(filters) {
  const contratosQuery = db("nexxo_contracts").modify((query) => {
    applyContractFilters(query, filters);
  });

  const comissoesQuery = db("nexxo_commissions").modify((query) => {
    applyCommissionFilters(query, filters);
  });

  const importacoesQuery = db("imported_reports").modify((query) => {
    applyImportFilters(query, filters);
  });

  const importRecordsQuery = db("imported_records").modify((query) => {
    applyImportFilters(query, filters);
  });

  const contratoRows = await contratosQuery
    .clone()
    .select(
      "id",
      "promotora",
      "produto",
      "status",
      "valor_bruto",
      "valor_liquido",
      "data_contratacao",
      "created_at",
      "payload"
    );

  const comissaoRows = await comissoesQuery
    .clone()
    .select("id", "referencia", "promotora", "produto", "valor", "payload", "created_at");

  const importRows = await importacoesQuery
    .clone()
    .orderBy("created_at", "desc")
    .select(
      "id",
      "filename",
      "promotora",
      "total_registros",
      "volume_total",
      "comissao_total",
      "metadata",
      "created_at"
    );

  const importRecordRows = await importRecordsQuery
    .clone()
    .select(
      "id",
      "promotora",
      "produto",
      "status",
      "volume_bruto",
      "volume_liquido",
      "comissao_valor",
      "data_operacao",
      "created_at",
      "banco",
      "raw"
    );

  return {
    contratos: contratoRows,
    comissoes: comissaoRows,
    importacoes: importRows,
    importRecords: importRecordRows
  };
}

const INSS_PRODUTO_PATTERNS = [
  {
    label: "Portabilidade + Refinanciamento",
    includes: mapTokens(["port+refin", "portrefin", "portmaisrefin", "portref"])
  },
  {
    label: "Refin da portabilidade",
    includes: mapTokens(["refin da portabilidade", "refinportabilidade", "refinport", "refin port"])
  },
  {
    label: "Portabilidade",
    startsWith: mapTokens(["portabilidade", "portpura", "portp", "port"])
  },
  {
    label: "Refinanciamento",
    startsWith: mapTokens(["refinanciamento", "refin"])
  },
  {
    label: "Contrato novo (Margem Livre)",
    includes: mapTokens(["margem livre", "contrato novo", "novo contrato"])
  },
  {
    label: "Cartão consignado RMC",
    includes: mapTokens(["rmc"])
  },
  {
    label: "Cartão consignado RCC",
    includes: mapTokens(["rcc"])
  }
];

const normalizeInssProduto = (produtoBase = "", detailText = "") => {
  const normalized = normalizeToken(detailText || produtoBase);
  if (!normalized) {
    return `${produtoBase} (INSS)`;
  }

  for (const pattern of INSS_PRODUTO_PATTERNS) {
    if (pattern.startsWith && pattern.startsWith.some((token) => normalized.startsWith(token))) {
      return `${pattern.label} (INSS)`;
    }
    if (pattern.includes && pattern.includes.some((token) => normalized.includes(token))) {
      return `${pattern.label} (INSS)`;
    }
  }

  return `${produtoBase} (INSS)`;
};

const buildProdutoEntry = (existing, volumeLiquido, volumeBruto) => {
  const entry = existing || {
    nome: "Sem produto",
    totalContratos: 0,
    volumeLiquido: 0,
    volumeBruto: 0
  };
  entry.totalContratos += 1;
  entry.volumeLiquido += volumeLiquido;
  entry.volumeBruto += volumeBruto;
  return entry;
};

const resolveProdutoNome = (row = {}) => {
  const rawData = row.raw || row.payload || {};
  const baseProduto = (row.produto || rawData.Produto || rawData.produto || rawData.tipo || row.Tipo || "Sem produto")
    .toString()
    .trim();
  const convenioValor =
    row.convenio ||
    rawData["Convênio"] ||
    rawData["convênio"] ||
    rawData.convenio ||
    "";
  const rawProdutoDetalhado =
    row.produto_detalhado ||
    row.produto_detalhe ||
    rawData["Produto detalhado"] ||
    rawData["Produto Detalhado"] ||
    rawData.produto_detalhado ||
    rawData.produto_detalhe ||
    baseProduto;
  const isInss =
    baseProduto.toLowerCase() === "inss" ||
    convenioValor.toString().trim().toLowerCase() === "inss";
  return isInss ? normalizeInssProduto(baseProduto, rawProdutoDetalhado) : baseProduto || "Sem produto";
};

const buildBancoEntry = (existing, volumeLiquido, volumeBruto) => {
  const entry = existing || {
    nome: "Sem banco",
    totalContratos: 0,
    volumeLiquido: 0,
    volumeBruto: 0
  };
  entry.totalContratos += 1;
  entry.volumeLiquido += volumeLiquido;
  entry.volumeBruto += volumeBruto;
  return entry;
};

export function buildDashboardFromRows({
  contratos = [],
  comissoes = [],
  importacoes = [],
  importRecords = [],
  filters = {}
} = {}) {
  let totalContratos = 0;
  let volumeBruto = 0;
  let volumeLiquido = 0;

  const promotorasMap = new Map();
  const produtosMap = new Map();
  const bancosMap = new Map();
  const statusMap = new Map();
  const timelineMap = new Map();
  const promotorasAtivas = new Set();
  const importPromotoras = new Set();

  const resolveBanco = (row) => {
    const payload = parseJsonColumn(row.payload ?? row.dadosOrigem ?? row.raw) || {};
    const bancoNome =
      row.banco ||
      payload.banco_nome ||
      payload.bancoNome ||
      payload.banco ||
      payload.instituicao ||
      payload.bancoParceiro ||
      "";
    return bancoNome.toString().trim();
  };

  const registerContrato = (row = {}) => {
    const valorBrutoEntrada = toNumber(row.valor_bruto ?? row.volume_bruto ?? row.valorBruto ?? 0);
    const valorLiquidoEntrada = toNumber(row.valor_liquido ?? row.volume_liquido ?? row.valorLiquido ?? 0);

    totalContratos += 1;
    volumeBruto += valorBrutoEntrada;
    volumeLiquido += valorLiquidoEntrada;

    const promotora = (row.promotora || "Desconhecida").trim() || "Desconhecida";
    const produto = resolveProdutoNome(row);
    const status = (row.status || "desconhecido").trim() || "desconhecido";
    const bancoNome = resolveBanco(row);

    promotorasAtivas.add(promotora);

    promotorasMap.set(
      promotora,
      buildPromotoraEntry(promotorasMap.get(promotora), valorLiquidoEntrada, valorBrutoEntrada)
    );

    produtosMap.set(
      produto,
      buildProdutoEntry(produtosMap.get(produto), valorLiquidoEntrada, valorBrutoEntrada)
    );

    if (bancoNome) {
      bancosMap.set(
        bancoNome,
        buildBancoEntry(bancosMap.get(bancoNome), valorLiquidoEntrada, valorBrutoEntrada)
      );
    }

    const statusEntry = statusMap.get(status) || {
      status,
      totalContratos: 0,
      volumeLiquido: 0
    };
    statusEntry.totalContratos += 1;
    statusEntry.volumeLiquido += valorLiquidoEntrada;
    statusMap.set(status, statusEntry);

    const referencia =
      dateKey(
        row.data_contratacao ??
          row.dataContratacao ??
          row.data_operacao ??
          row.created_at ??
          row.atualizadoEm
      ) || "sem-data";

    const timelineEntry = timelineMap.get(referencia) || {
      data: referencia,
      totalContratos: 0,
      volumeLiquido: 0
    };
    timelineEntry.totalContratos += 1;
    timelineEntry.volumeLiquido += valorLiquidoEntrada;
    timelineMap.set(referencia, timelineEntry);
  };

  contratos.forEach(registerContrato);
  importRecords.forEach((registro) => {
    if (registro.promotora) {
      importPromotoras.add(String(registro.promotora));
    }
    registerContrato({
      ...registro,
      valor_bruto: registro.volume_bruto ?? registro.valor_bruto,
      valor_liquido: registro.volume_liquido ?? registro.valor_liquido,
      data_contratacao: registro.data_operacao ?? registro.created_at,
      payload: registro.raw ?? registro.payload
    });
  });

  let comissaoTotal = 0;
  const comissaoPromotoraMap = new Map();
  const comissaoProdutoMap = new Map();

  for (const row of comissoes) {
    const valor = toNumber(row.valor);
    comissaoTotal += valor;
    const promotora = (row.promotora || "Desconhecida").trim() || "Desconhecida";
    const produto = resolveProdutoNome(row);

    const promotoraEntry = comissaoPromotoraMap.get(promotora) || {
      promotora,
      comissaoTotal: 0
    };
    promotoraEntry.comissaoTotal += valor;
    comissaoPromotoraMap.set(promotora, promotoraEntry);

    const produtoEntry = comissaoProdutoMap.get(produto) || {
      produto,
      comissaoTotal: 0
    };
    produtoEntry.comissaoTotal += valor;
    comissaoProdutoMap.set(produto, produtoEntry);
  }

  for (const registro of importRecords) {
    const valor = toNumber(registro.comissao_valor ?? registro.comissao);
    if (!valor) continue;
    comissaoTotal += valor;
    const promotora = (registro.promotora || "Desconhecida").trim() || "Desconhecida";
    const produto = resolveProdutoNome(registro);

    const promotoraEntry = comissaoPromotoraMap.get(promotora) || {
      promotora,
      comissaoTotal: 0
    };
    promotoraEntry.comissaoTotal += valor;
    comissaoPromotoraMap.set(promotora, promotoraEntry);

    const produtoEntry = comissaoProdutoMap.get(produto) || {
      produto,
      comissaoTotal: 0
    };
    produtoEntry.comissaoTotal += valor;
    comissaoProdutoMap.set(produto, produtoEntry);
  }

  let importVolumeTotal = importRecords.reduce(
    (acc, registro) => acc + toNumber(registro.volume_liquido ?? registro.valor_liquido),
    0
  );
  let importComissaoTotal = importRecords.reduce(
    (acc, registro) => acc + toNumber(registro.comissao_valor ?? registro.comissao),
    0
  );

  const importacoesRecentes = importacoes.slice(0, 10).map((row) => {
    const metadata = parseJsonColumn(row.metadata) || {};
    if (row.promotora) {
      importPromotoras.add(String(row.promotora));
    }
    if (Array.isArray(metadata.promotoras)) {
      metadata.promotoras.forEach((item) => importPromotoras.add(String(item)));
    }

    if (metadata.promotora) {
      importPromotoras.add(String(metadata.promotora));
    }

    return {
      id: row.id,
      filename: row.filename,
      promotora: row.promotora,
      totalRegistros: Number(row.total_registros ?? row.totalRegistros ?? 0),
      volumeTotal: toFixedNumber(row.volume_total ?? row.volumeTotal ?? 0),
      comissaoTotal: toFixedNumber(row.comissao_total ?? row.comissaoTotal ?? 0),
      metadata,
      createdAt: row.created_at ?? row.createdAt
    };
  });

  const promotoras = sortBy(
    Array.from(promotorasMap.entries()).map(([nome, stats]) => ({
      nome,
      totalContratos: stats.totalContratos,
      volumeLiquido: toFixedNumber(stats.volumeLiquido),
      volumeBruto: toFixedNumber(stats.volumeBruto),
      ticketMedio: stats.totalContratos ? toFixedNumber(stats.volumeLiquido / stats.totalContratos) : 0
    })),
    "volumeLiquido"
  );

  const produtos = sortBy(
    Array.from(produtosMap.entries()).map(([nome, stats]) => ({
      nome,
      totalContratos: stats.totalContratos,
      volumeLiquido: toFixedNumber(stats.volumeLiquido),
      volumeBruto: toFixedNumber(stats.volumeBruto),
      ticketMedio: stats.totalContratos ? toFixedNumber(stats.volumeLiquido / stats.totalContratos) : 0,
      comissaoTotal: toFixedNumber(comissaoProdutoMap.get(nome)?.comissaoTotal ?? 0)
    })),
    "volumeLiquido"
  );

  const bancos = sortBy(
    Array.from(bancosMap.entries()).map(([nome, stats]) => ({
      nome,
      totalContratos: stats.totalContratos,
      volumeLiquido: toFixedNumber(stats.volumeLiquido),
      volumeBruto: toFixedNumber(stats.volumeBruto)
    })),
    "volumeLiquido"
  );

  const timeline = Array.from(timelineMap.values())
    .filter((item) => item.data !== "sem-data")
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((item) => ({
      data: item.data,
      totalContratos: item.totalContratos,
      volumeLiquido: toFixedNumber(item.volumeLiquido)
    }));

  const statusResumo = sortBy(
    Array.from(statusMap.values()).map((item) => ({
      status: item.status,
      totalContratos: item.totalContratos,
      volumeLiquido: toFixedNumber(item.volumeLiquido)
    })),
    "totalContratos"
  );

  const comissaoPorPromotora = sortBy(
    Array.from(comissaoPromotoraMap.values()).map((item) => ({
      promotora: item.promotora,
      comissaoTotal: toFixedNumber(item.comissaoTotal)
    })),
    "comissaoTotal"
  );

  const comissaoPorProduto = sortBy(
    Array.from(comissaoProdutoMap.values()).map((item) => ({
      produto: item.produto,
      comissaoTotal: toFixedNumber(item.comissaoTotal)
    })),
    "comissaoTotal"
  );

  const metrics = {
    totalContratos,
    volumeBruto: toFixedNumber(volumeBruto),
    volumeLiquido: toFixedNumber(volumeLiquido),
    comissaoTotal: toFixedNumber(comissaoTotal),
    ticketMedio: totalContratos ? toFixedNumber(volumeLiquido / totalContratos) : 0,
    volumeImportado: toFixedNumber(importVolumeTotal),
    comissaoImportada: toFixedNumber(importComissaoTotal),
    promotorasAtivas: promotorasAtivas.size || importPromotoras.size
  };

  const ranking = {
    promotoras: promotoras.slice(0, 5),
    produtos: produtos.slice(0, 5),
    comissoes: comissaoPorPromotora.slice(0, 5),
    status: statusResumo.slice(0, 5)
  };

  const comissoesResumo = {
    total: toFixedNumber(comissaoTotal),
    porPromotora: comissaoPorPromotora,
    porProduto: comissaoPorProduto
  };

  const charts = {
    porPromotora: promotoras,
    porProduto: produtos.slice(0, 5),
    porBanco: bancos,
    porStatus: statusResumo,
    timeline
  };

  const importacoesResumo = {
    resumo: {
      totalArquivos: importacoes.length,
      volumeTotal: toFixedNumber(importVolumeTotal),
      comissaoTotal: toFixedNumber(importComissaoTotal),
      promotoras: Array.from(new Set([...promotorasAtivas, ...importPromotoras]))
    },
    recentes: importacoesRecentes.map((item) => ({
      ...item,
      insights: ensureArray(item.metadata?.insights),
      alertas: ensureArray(item.metadata?.alertas)
    }))
  };

  return {
    filters,
    metrics,
    ranking,
    comissoes: comissoesResumo,
    charts,
    importacoes: importacoesResumo
  };
}

export async function computeDashboardInsights(filtersInput = {}) {
  const filters = normalizeFilters(filtersInput);
  const cacheKey = { type: "dashboard-insights", filters };
  const cached = insightsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const rows = await fetchDashboardRows(filters);
  const snapshot = buildDashboardFromRows({
    ...rows,
    filters
  });

  const window = buildComparisonWindow(filters);
  let comparison = null;

  if (window?.previous?.dataInicio && window?.previous?.dataFim) {
    const previousFilters = {
      ...filters,
      dataInicio: window.previous.dataInicio,
      dataFim: window.previous.dataFim
    };

    const previousRows = await fetchDashboardRows(previousFilters);
    const previousSnapshot = buildDashboardFromRows({
      ...previousRows,
      filters: previousFilters
    });

    comparison = {
      current: window.current,
      previous: window.previous,
      previousMetrics: previousSnapshot.metrics,
      delta: computeMetricDelta(snapshot.metrics, previousSnapshot.metrics)
    };
  }

  const response = {
    ...snapshot,
    comparison
  };

  insightsCache.set(cacheKey, response);
  return response;
}

const normalizeResumoFilters = (input = {}) => ({
  dataInicio: input.dataInicio ?? input.start ?? null,
  dataFim: input.dataFim ?? input.end ?? null
});

export async function getResumoDashboard(filtersInput = {}) {
  const filters = normalizeResumoFilters(filtersInput);
  const range = resolveRangeWindow(filters);

  if (!range) {
    return {
      contratos: 0,
      volume: 0,
      comissao: 0,
      meta: null,
      progresso: null
    };
  }

  const inclusiveEnd = endOfDay(range.end) ?? range.end;

  const resumo = await db("imported_records")
    .whereBetween("data_operacao", [range.start, inclusiveEnd])
    .select(
      db.raw("COUNT(*) as contratos"),
      db.raw("COALESCE(SUM(volume_liquido), 0) as volume_liquido"),
      db.raw("COALESCE(SUM(comissao_liquida), 0) as comissao_liquida")
    )
    .first();

  const meta = await db("meta_publications")
    .whereBetween("data_referencia", [range.dataInicio, range.dataFim])
    .orderBy("data_referencia", "desc")
    .first();

  const totalContratos = Number(resumo?.contratos || 0);
  const volume = toFixedNumber(resumo?.volume_liquido || 0);
  const comissao = toFixedNumber(resumo?.comissao_liquida || 0);
  const metaValor = meta ? toFixedNumber(meta.volume_liquido || meta.volume_bruto || 0) : null;
  const progresso =
    metaValor && metaValor > 0 ? toFixedNumber((volume / metaValor) * 100) : null;

  return {
    contratos: totalContratos,
    volume,
    comissao,
    meta: metaValor,
    progresso,
    range: {
      dataInicio: range.dataInicio,
      dataFim: range.dataFim
    }
  };
}

export { normalizeFilters, applyContractFilters, applyCommissionFilters, buildComparisonWindow };

export function invalidateDashboardInsightsCache() {
  insightsCache.clear();
}

export const __dashboardTestUtils = {
  computeMetricDelta,
  buildComparisonWindow
};
