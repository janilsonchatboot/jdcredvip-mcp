import { COLUMN_ALIASES, getPromotoraOverrides, matchPromotoraAlias } from "./mapping.js";
import {
  detectPromotoraFromFilename,
  detectPromotoraFromValue,
  normalizeKey,
  parseCurrency,
  parseDateValue,
  summarizeColumns
} from "./utils/ptbr.js";

const hasCurrencyHint = (key = "") => /\$|valor|bruto|liquido|r\$|recebido/i.test(key);
const hasPercentHint = (key = "") => /%|percent/i.test(key);
const parsePercentValue = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/[%\s]/g, "");
  if (!text) return null;
  const normalized = parseFloat(text.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(normalized)) return null;
  if (normalized > 1) {
    return Number((normalized / 100).toFixed(6));
  }
  return Number(normalized.toFixed(6));
};

const pickValue = (row, aliasSet, columnsUsed, options = {}) => {
  if (!row || typeof row !== "object") return null;
  const matches = [];

  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeKey(key);
    if (aliasSet.has(normalized)) {
      if (value === undefined || value === null || value === "") continue;
      matches.push({ key, value });
    }
  }

  if (!matches.length) return null;

  const preferCurrency = options.preferCurrency;
  const excludePercent = options.excludePercent;
  const requirePercent = options.requirePercent;

  const selectMatch = (candidates) => {
    if (!candidates.length) return null;
    const match = candidates[0];
    if (columnsUsed) {
      columnsUsed.add(match.key);
    }
    return match.value;
  };

  if (requirePercent) {
    const percentMatches = matches.filter((item) => hasPercentHint(item.key));
    const selection = selectMatch(percentMatches);
    if (selection !== null) {
      return selection;
    }
    return null;
  }

  if (preferCurrency) {
    const currencyMatches = matches.filter(
      (item) => hasCurrencyHint(item.key) && (!excludePercent || !hasPercentHint(item.key))
    );
    const selection = selectMatch(currencyMatches);
    if (selection !== null) {
      return selection;
    }
  }

  if (excludePercent) {
    const nonPercentMatches = matches.filter((item) => !hasPercentHint(item.key));
    const selection = selectMatch(nonPercentMatches);
    if (selection !== null) {
      return selection;
    }
  }

  return selectMatch(matches);
};

const normalizeRow = (row = {}, options = {}) => {
  const columnsUsed = options.columnsUsed;
  const overrides = options.promotoraOverride;

  const valorLiquido =
    parseCurrency(
      pickValue(row, overrides?.valorLiquidoAlias || COLUMN_ALIASES.valorLiquido, columnsUsed)
    ) || parseCurrency(pickValue(row, COLUMN_ALIASES.valorBruto, columnsUsed));

  const valorBruto = parseCurrency(
    pickValue(row, overrides?.valorBrutoAlias || COLUMN_ALIASES.valorBruto, columnsUsed)
  );

  const comissao = parseCurrency(
    pickValue(row, overrides?.comissaoAlias || COLUMN_ALIASES.comissao, columnsUsed, {
      preferCurrency: true,
      excludePercent: true
    })
  );

  const comissaoPercentualValor = pickValue(
    row,
    overrides?.comissaoAlias || COLUMN_ALIASES.comissao,
    columnsUsed,
    { requirePercent: true }
  );

  const comissaoPercentual = parsePercentValue(comissaoPercentualValor);

  const dataReferenciaRaw = pickValue(
    row,
    overrides?.dataAlias || COLUMN_ALIASES.dataReferencia,
    columnsUsed
  );
  const dataReferencia = parseDateValue(dataReferenciaRaw) || null;

  const promotoraValor =
    pickValue(row, overrides?.promotoraAlias || COLUMN_ALIASES.promotora, columnsUsed) || options.promotoraHint;

  const promotora =
    matchPromotoraAlias(promotoraValor) ||
    detectPromotoraFromValue(promotoraValor) ||
    options.promotoraHint ||
    null;

  const contratoRaw =
    pickValue(row, overrides?.contratoAlias || COLUMN_ALIASES.contrato, columnsUsed) ||
    pickValue(row, overrides?.contratoAdeAlias || COLUMN_ALIASES.contratoAde, columnsUsed);

  return {
    cliente:
      pickValue(row, overrides?.clienteAlias || COLUMN_ALIASES.cliente, columnsUsed)?.toString().trim() || null,
    documento:
      pickValue(row, overrides?.documentoAlias || COLUMN_ALIASES.documento, columnsUsed)
        ?.toString()
        .replace(/\D/g, "") || null,
    contratoId: contratoRaw ? String(contratoRaw).trim() : null,
    produto:
      pickValue(row, overrides?.produtoAlias || COLUMN_ALIASES.produto, columnsUsed)?.toString().trim() || null,
    banco:
      pickValue(row, overrides?.bancoAlias || COLUMN_ALIASES.banco, columnsUsed)?.toString().trim() || null,
    status:
      pickValue(row, overrides?.statusAlias || COLUMN_ALIASES.status, columnsUsed)?.toString().trim() || null,
    promotora,
    valorLiquido,
    valorBruto,
    comissao,
    comissaoPercentual,
    dataReferencia,
    dataPagamento: dataReferencia,
    raw: row
  };
};

const aggregateResumo = (registros = [], rows = [], options = {}) => {
  let volumeTotal = 0;
  let volumeBrutoTotal = 0;
  let comissaoTotal = 0;

  const produtosMap = new Map();
  const statusSet = new Set();
  const promotoras = new Set();

  registros.forEach((registro) => {
    const volume = Number.isFinite(registro.valorLiquido)
      ? registro.valorLiquido
      : Number.isFinite(registro.valorBruto)
      ? registro.valorBruto
      : 0;
    const volumeBruto = Number.isFinite(registro.valorBruto) ? registro.valorBruto : volume;
    const comissao = Number.isFinite(registro.comissao) ? registro.comissao : 0;

    volumeTotal += volume;
    volumeBrutoTotal += volumeBruto;
    comissaoTotal += comissao;

    if (registro.produto) {
      const atual = produtosMap.get(registro.produto) || 0;
      produtosMap.set(registro.produto, atual + volume);
    }
    if (registro.status) {
      statusSet.add(registro.status);
    }
    if (registro.promotora) {
      promotoras.add(registro.promotora);
    }
  });

  const resumoPromotora =
    options.promotoraHint ||
    Array.from(promotoras)[0] ||
    detectPromotoraFromFilename(options.filename) ||
    "Desconhecida";

  return {
    totalRegistros: registros.length,
    volumeBruto: Number(volumeBrutoTotal.toFixed(2)),
    volumeTotal: Number(volumeTotal.toFixed(2)),
    comissaoTotal: Number(comissaoTotal.toFixed(2)),
    colunasReconhecidas: summarizeColumns(rows),
    produtos: Array.from(produtosMap.entries()).map(([produto, volume]) => ({
      produto,
      volume: Number(volume.toFixed(2))
    })),
    status: Array.from(statusSet),
    promotora: resumoPromotora
  };
};

export function importarRegistros(rows = [], options = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Nenhum dado encontrado no relatorio.");
  }

  const columnsUsed = new Set();
  const overrides = getPromotoraOverrides(options.promotoraHint);

  const registros = rows.map((row) =>
    normalizeRow(row && typeof row === "object" ? row : {}, {
      promotoraHint: options.promotoraHint,
      columnsUsed,
      promotoraOverride: overrides
    })
  );

  const resumo = aggregateResumo(registros, rows, {
    promotoraHint: options.promotoraHint,
    filename: options.filename
  });

  return {
    registros,
    resumo
  };
}
