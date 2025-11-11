import { env } from "#core/env.js";
import { logIntegration } from "#modules/auditoria/integration-log.service.js";

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalizeKey = (value = "") => normalizeText(value).replace(/[^a-z0-9]/g, "");

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    let text = value.trim();
    if (!text) return 0;

    text = text.replace(/[R$\s]/gi, "");

    const hasComma = text.includes(",");
    const hasDot = text.includes(".");

    if (hasComma && hasDot) {
      // Assume Brazilian format: 1.234,56
      text = text.replace(/\./g, "").replace(/,/g, ".");
    } else if (hasComma && !hasDot) {
      text = text.replace(/,/g, ".");
    }

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  if (value === "") return [];
  return [value];
};

function findFieldValue(row, aliases) {
  if (!row || typeof row !== "object") return null;

  const aliasSet =
    aliases instanceof Set
      ? aliases
      : new Set((aliases || []).map((alias) => normalizeKey(alias)));

  for (const key of Object.keys(row)) {
    if (aliasSet.has(normalizeKey(key))) {
      const value = row[key];
      if (value !== null && value !== undefined && value !== "") {
        return value;
      }
    }
  }

  return null;
}

const normalizeField = (row, keys = []) => {
  const value = findFieldValue(row, keys);
  if (value !== null && value !== undefined && value !== "") {
    return value;
  }

  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return null;
};

const volumeAliases = new Set(
  [
    "valorLiquido",
    "valor_liquido",
    "valor liquido",
    "vl_liquido",
    "vlLiquido",
    "valor liquidado",
    "valor liquid",
    "valor total",
    "valor_total",
    "valortotal",
    "valor liquido cliente",
    "valor pagamento",
    "valorcredito",
    "valorCredito",
    "volume",
    "liquido",
    "valor",
  ].map((alias) => normalizeKey(alias))
);

const comissaoAliases = new Set(
  [
    "comissao",
    "comissao total",
    "comissao_total",
    "vl_comissao",
    "valorComissao",
    "valor_comissao",
    "valor comissao",
    "comissaoLiquida",
    "comissao liquida",
    "comissao estimada",
    "taxa comissao",
    "percentual comissao",
    "comissaoReal",
  ].map((alias) => normalizeKey(alias))
);

const getCodexConfig = () => env.integrations?.codex ?? {};

const callCodexRemote = async (payload) => {
  const config = getCodexConfig();
  const url = config.analysisUrl;

  if (!url) return null;

  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = Number(config.timeoutMs) || 12000;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify(payload),
      signal: controller?.signal
    });

    if (timer) clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.json();
    const dados = body?.dados ?? body;

    return {
      totalRegistros: Number(
        dados?.totalRegistros ?? dados?.total_registros ?? payload.linhas.length ?? 0
      ),
      totalVolume: toNumber(dados?.totalVolume ?? dados?.total_volume),
      totalComissao: toNumber(dados?.totalComissao ?? dados?.total_comissao),
      insights: ensureArray(dados?.insights).map((item) => String(item)),
      alertas: ensureArray(dados?.alertas).map((item) => String(item)),
      fonte: dados?.fonte || "codex-api",
      bruto: dados
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Falha ao consultar Codex API:", message);
    return null;
  }
};

const buildHeuristicAnalysis = ({ filename, promotora, linhas }) => {
  const rows = Array.isArray(linhas) ? linhas : [];
  const insights = [];
  const alertas = [];

  const volumePorProduto = new Map();
  const comissaoPorProduto = new Map();
  let totalVolume = 0;
  let totalComissao = 0;

  rows.forEach((linha) => {
    const produto =
      normalizeField(linha, [
        "produto",
        "modalidade",
        "produto_financeiro",
        "produto credito",
        "linha",
      ]) || "Desconhecido";

    const volume = toNumber(findFieldValue(linha, volumeAliases));
    const comissao = toNumber(findFieldValue(linha, comissaoAliases));

    totalVolume += volume;
    totalComissao += comissao;

    if (!volumePorProduto.has(produto)) {
      volumePorProduto.set(produto, 0);
    }
    if (!comissaoPorProduto.has(produto)) {
      comissaoPorProduto.set(produto, 0);
    }

    volumePorProduto.set(produto, volumePorProduto.get(produto) + volume);
    comissaoPorProduto.set(produto, comissaoPorProduto.get(produto) + comissao);
  });

  const produtosOrdenados = Array.from(volumePorProduto.entries()).sort((a, b) => b[1] - a[1]);
  if (produtosOrdenados.length) {
    const [produtoTop, volumeTop] = produtosOrdenados[0];
    insights.push(`Produto de maior volume: ${produtoTop} (R$ ${volumeTop.toFixed(2)})`);
  }

  if (totalVolume === 0 && totalComissao === 0) {
    alertas.push(
      "Nao foi possivel identificar valores de volume ou comissao nas colunas do relatorio."
    );
  } else {
    insights.push(`Volume total identificado: R$ ${totalVolume.toFixed(2)}`);
    insights.push(`Comissoes estimadas: R$ ${totalComissao.toFixed(2)}`);

    const mediaComissao = totalVolume > 0 ? (totalComissao / totalVolume) * 100 : 0;
    insights.push(`Ticket medio de comissao: ${mediaComissao.toFixed(2)}%`);

    if (mediaComissao < 2) {
      alertas.push(
        "Comissao media abaixo de 2%. Verifique possiveis divergencias de repasse."
      );
    }
  }

  return {
    filename,
    promotora,
    fonte: "heuristica-local",
    totalRegistros: rows.length,
    totalVolume: Number(totalVolume.toFixed(2)),
    totalComissao: Number(totalComissao.toFixed(2)),
    insights,
    alertas,
    detalhes: {
      volumePorProduto: Array.from(volumePorProduto.entries()).map(([produto, valor]) => ({
        produto,
        volume: Number(valor.toFixed(2))
      })),
      comissaoPorProduto: Array.from(comissaoPorProduto.entries()).map(([produto, valor]) => ({
        produto,
        comissao: Number(valor.toFixed(2))
      }))
    }
  };
};

export async function analisarRelatorioComCodex({ filename, promotora, linhas }) {
  const payload = {
    filename,
    promotora,
    linhas: Array.isArray(linhas) ? linhas : []
  };

  const remoto = await callCodexRemote(payload);

  const resultado = remoto
    ? {
        filename,
        promotora,
        fonte: remoto.fonte,
        totalRegistros: remoto.totalRegistros,
        totalVolume: Number(toNumber(remoto.totalVolume).toFixed(2)),
        totalComissao: Number(toNumber(remoto.totalComissao).toFixed(2)),
        insights: remoto.insights,
        alertas: remoto.alertas,
        detalhes: remoto.bruto
      }
    : buildHeuristicAnalysis(payload);

  await logIntegration(
    "codex",
    "analise-relatorio",
    resultado.alertas.length ? "alerta" : "sucesso",
    filename,
    resultado,
    {
      module: "GAIA::CODEX",
      origin: "codex",
      payload: {
        totalRegistros: resultado.totalRegistros,
        fonte: resultado.fonte,
        insights: resultado.insights?.length
      }
    }
  );

  return resultado;
}
