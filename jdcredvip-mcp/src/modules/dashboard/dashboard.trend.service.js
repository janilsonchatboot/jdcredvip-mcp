import { db } from "#core/database.js";
import { createTtlCache } from "#utils/cache.js";
import {
  normalizeFilters,
  applyContractFilters,
  applyCommissionFilters,
  buildComparisonWindow
} from "./dashboard.service.js";

const trendCache = createTtlCache({ ttlMs: 10 * 60 * 1000 });

const toNumber = (value, digits = 2) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(digits));
};

const toInt = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapContractTrendRow = (row) => ({
  data: row.periodo,
  totalContratos: toInt(row.totalContratos ?? row.count ?? row.total ?? 0),
  volumeLiquido: toNumber(row.volumeLiquido ?? row.volume_liquido ?? 0),
  volumeBruto: toNumber(row.volumeBruto ?? row.volume_bruto ?? 0)
});

const mapCommissionTrendRow = (row) => ({
  data: row.periodo,
  comissaoTotal: toNumber(row.comissaoTotal ?? row.total ?? row.sum ?? 0)
});

const contratosTrendQuery = (filters) => {
  const query = db("nexxo_contracts")
    .whereNotNull("data_contratacao")
    .select(db.raw("DATE(data_contratacao) as periodo"))
    .count({ totalContratos: "*" })
    .sum({ volumeLiquido: "valor_liquido" })
    .sum({ volumeBruto: "valor_bruto" })
    .groupBy("periodo")
    .orderBy("periodo", "asc");

  applyContractFilters(query, filters);
  return query;
};

const comissoesTrendQuery = (filters) => {
  const query = db("nexxo_commissions")
    .select("referencia as periodo")
    .sum({ comissaoTotal: "valor" })
    .groupBy("referencia")
    .orderBy("referencia", "asc");

  applyCommissionFilters(query, filters);
  return query;
};

const normalizeRangeFilters = (filters, windowEdge) => {
  if (!windowEdge?.dataInicio || !windowEdge?.dataFim) {
    return filters;
  }
  return {
    ...filters,
    dataInicio: windowEdge.dataInicio,
    dataFim: windowEdge.dataFim
  };
};

export async function getDashboardTrend(filtersInput = {}) {
  const filters = normalizeFilters(filtersInput);
  const cacheKey = { type: "dashboard-trend", filters };
  const cached = trendCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const window = buildComparisonWindow(filters);
  const currentFilters = normalizeRangeFilters(filters, window?.current);
  const previousFilters = window?.previous
    ? normalizeRangeFilters(filters, window.previous)
    : null;

  const [currentContratos, currentComissoes] = await Promise.all([
    contratosTrendQuery(currentFilters),
    comissoesTrendQuery(currentFilters)
  ]);

  let previousContratos = [];
  let previousComissoes = [];

  if (previousFilters) {
    [previousContratos, previousComissoes] = await Promise.all([
      contratosTrendQuery(previousFilters),
      comissoesTrendQuery(previousFilters)
    ]);
  }

  const response = {
    range: window,
    filters: currentFilters,
    series: {
      contratos: {
        current: currentContratos.map(mapContractTrendRow),
        previous: previousContratos.map(mapContractTrendRow)
      },
      comissoes: {
        current: currentComissoes.map(mapCommissionTrendRow),
        previous: previousComissoes.map(mapCommissionTrendRow)
      }
    }
  };

  trendCache.set(cacheKey, response);
  return response;
}
