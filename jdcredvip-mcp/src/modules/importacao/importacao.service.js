import fs from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import XLSX from "xlsx";
import { db } from "#core/database.js";
import { importarRegistros } from "#importers/run.js";
import { detectPromotoraFromFilename, safeFilename } from "#importers/utils/ptbr.js";
import { analisarRelatorioComCodex } from "#modules/analise/codex.service.js";
import { logIntegration } from "#modules/auditoria/integration-log.service.js";
import { persistNormalizedBatch } from "./persist.service.js";
import { aplicarRegrasComerciais } from "../triagem/triagem.service.js";

const TEMP_DIR = path.join(os.tmpdir(), "jdcredvip-imports");

async function ensureTempDir() {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

const parseWorkbook = (filePath) => {
  const workbook = XLSX.readFile(filePath, { type: "file" });
  if (!workbook?.SheetNames?.length) {
    throw new Error("Arquivo sem planilhas válidas.");
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const formattedRows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });

  const total = Math.max(formattedRows.length, rawRows.length);
  const rows = Array.from({ length: total }, (_, index) => {
    const prettyRow = formattedRows[index] || {};
    const rawRow = rawRows[index] || {};
    const merged = {};
    const keys = new Set([...Object.keys(rawRow), ...Object.keys(prettyRow)]);

    keys.forEach((key) => {
      const value = prettyRow[key];
      if (value !== undefined && value !== null && value !== "") {
        merged[key] = value;
      } else if (rawRow[key] !== undefined) {
        merged[key] = rawRow[key];
      } else {
        merged[key] = null;
      }
    });

    return merged;
  }).filter((row) => Object.keys(row).length > 0);

  if (!rows.length) {
    throw new Error("Nenhum dado encontrado no relatório.");
  }
  return rows;
};

const buildMetadata = (resumo, analise, actor) => ({
  colunasReconhecidas: resumo.colunasReconhecidas,
  produtos: resumo.produtos,
  status: resumo.status,
  insights: analise?.insights ?? [],
  alertas: analise?.alertas ?? [],
  analise,
  usuario: actor || "api",
  fonteAnalise: analise?.fonte || "desconhecida"
});

const generateBatchId = () => `batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export async function startBatch(promotora = "desconhecida", sourceFile, actor = "api") {
  const batchId = typeof randomUUID === "function" ? randomUUID() : generateBatchId();
  await logIntegration(
    "importacao",
    "batch-start",
    "info",
    `Batch iniciado (${promotora})`,
    {
      batchId,
      promotora,
      sourceFile,
      actor
    },
    {
      module: "GAIA::IMPORTACAO",
      origin: "importacao",
      actor,
      payload: { batchId, arquivo: sourceFile }
    }
  ).catch(() => {});
  return batchId;
}

export async function finalizeBatch(batchId, resumo = {}, actor = "api") {
  if (!batchId) return;
  await logIntegration(
    "importacao",
    "batch-finish",
    "sucesso",
    `Batch concluido (${batchId})`,
    {
      batchId,
      actor,
      resumo
    },
    {
      module: "GAIA::IMPORTACAO",
      origin: "importacao",
      actor,
      payload: { batchId, resumo }
    }
  ).catch(() => {});
}

export async function registrarHistorico(summary, analise, actor) {
  const metadata = buildMetadata(summary, analise, actor);
  await db("imported_reports").insert({
    filename: summary.filename,
    promotora: summary.promotora,
    total_registros: summary.totalRegistros,
    volume_total: summary.volumeTotal,
    comissao_total: summary.comissaoTotal,
    metadata
  });
}

const normalizeSummaryResponse = (filename, resumo, analise, extras = {}) => ({
  filename,
  promotora: resumo.promotora,
  totalRegistros: resumo.totalRegistros,
  volumeTotal: resumo.volumeTotal,
  volumeBruto: resumo.volumeBruto,
  comissaoTotal: resumo.comissaoTotal,
  colunasReconhecidas: resumo.colunasReconhecidas,
  analise,
  ...extras
});

async function processarPlanilha(filePath, { filename, promotora, persist, actor, parametrosNegocio } = {}) {
  const rows = parseWorkbook(filePath);
  const resultado = importarRegistros(rows, {
    filename,
    promotoraHint: promotora
  });

  const registrosComerciais = aplicarRegrasComerciais(resultado.registros, {
    parametros: parametrosNegocio,
    referenceDate: new Date(),
    seqInicial: 1
  });

  const resumo = resultado.resumo;
  const analise = await analisarRelatorioComCodex({
    filename,
    promotora: resumo.promotora,
    linhas: rows
  });

  const summary = {
    filename,
    promotora: resumo.promotora,
    totalRegistros: resumo.totalRegistros,
    volumeBruto: resumo.volumeBruto,
    volumeTotal: resumo.volumeTotal,
    comissaoTotal: resumo.comissaoTotal,
    colunasReconhecidas: resumo.colunasReconhecidas
  };

  let persistStats = { inserted: 0, volumeBruto: summary.volumeBruto || 0, volumeLiquido: summary.volumeTotal, comissao: summary.comissaoTotal };

  if (persist) {
    persistStats = await persistNormalizedBatch(
      resumo.promotora || promotora,
      filename,
      resumo.promotora,
      registrosComerciais
    );

    await registrarHistorico(summary, analise, actor);
    await db("import_history").insert({
      arquivo: filename,
      promotora: resumo.promotora,
      registros: summary.totalRegistros,
      volume_bruto: persistStats.volumeBruto ?? summary.volumeBruto ?? 0,
      volume_liquido: summary.volumeTotal,
      comissao: summary.comissaoTotal
    });

    await logIntegration(
      "importacao",
      "upload",
      "sucesso",
      `Importacao ${filename}`,
      {
        ...summary,
        insights: analise?.insights ?? [],
        alertas: analise?.alertas ?? [],
        persistidos: persistStats.inserted
      },
      {
        module: "GAIA::IMPORTACAO",
        origin: "codex",
        actor,
        payload: {
          filename,
          promotora: resumo.promotora,
          totalRegistros: summary.totalRegistros
        }
      }
    );
  }

  return normalizeSummaryResponse(filename, resumo, analise, { persistidos: persistStats.inserted });
}

export async function importarArquivoLocal(tempFilePath, options = {}) {
  const filename = options.filename || path.basename(tempFilePath);
  const promotora =
    options.promotora ||
    options.promotoraHint ||
    detectPromotoraFromFilename(filename) ||
    "Desconhecida";

  return processarPlanilha(tempFilePath, {
    filename,
    promotora,
    persist: options.persist !== false,
    actor: options.actor,
    parametrosNegocio: options.parametrosNegocio
  });
}

export async function importarBuffer(buffer, options = {}) {
  await ensureTempDir();
  const filename = options.filename ? safeFilename(options.filename) : `relatorio-${Date.now()}.xlsx`;
  const tempFile = path.join(TEMP_DIR, `${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`);
  await fs.writeFile(tempFile, buffer);
  try {
    return await importarArquivoLocal(tempFile, {
      filename,
      promotora: options.promotora,
      persist: options.persist,
      actor: options.actor,
      parametrosNegocio: options.parametrosNegocio
    });
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
}

export async function importarBase64(data, options = {}) {
  if (!data) {
    throw new Error("Informe o conteúdo base64 do arquivo.");
  }
  const buffer = Buffer.from(String(data), "base64");
  return importarBuffer(buffer, options);
}

export async function removerImportacao(importId, actor) {
  const id = Number(importId);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error("Identificador de importacao invalido.");
    error.statusCode = 400;
    throw error;
  }

  const registro = await db("imported_reports").where({ id }).first();
  if (!registro) {
    const error = new Error("Importacao nao encontrada.");
    error.statusCode = 404;
    throw error;
  }

  let resumoRemocao = { reports: 0, records: 0, history: 0 };
  await db.transaction(async (trx) => {
    resumoRemocao.reports += await trx("imported_reports").where({ id }).delete();
    if (registro.filename) {
      resumoRemocao.records += await trx("imported_records").where({ arquivo: registro.filename }).del();
      resumoRemocao.history += await trx("import_history").where({ arquivo: registro.filename }).del();
    }
  });

  await logIntegration(
    "importacao",
    "excluir",
    "sucesso",
    `Importacao ${registro.filename} removida`,
    {
      id: registro.id,
      filename: registro.filename,
      promotora: registro.promotora,
      actor: actor || "api",
      resumoRemocao
    },
    {
      module: "GAIA::IMPORTACAO",
      origin: "importacao",
      actor: actor || "api",
      payload: { id: registro.id, filename: registro.filename }
    }
  ).catch(() => {});

  return {
    id: registro.id,
    filename: registro.filename,
    promotora: registro.promotora
  };
}

const sanitizeIds = (idsInput) => {
  const array = Array.isArray(idsInput) ? idsInput : [idsInput];
  const normalized = array
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  return Array.from(new Set(normalized));
};

export async function removerImportacoesSelecionadas(idsInput = [], actor) {
  const ids = sanitizeIds(idsInput);
  if (!ids.length) {
    const error = new Error("Informe os identificadores das importacoes que deseja remover.");
    error.statusCode = 400;
    throw error;
  }

  const registros = await db("imported_reports").whereIn("id", ids);
  if (!registros.length) {
    const error = new Error("Importacoes nao encontradas.");
    error.statusCode = 404;
    throw error;
  }

  const resultados = [];
  await db.transaction(async (trx) => {
    for (const registro of registros) {
      const detalhes = {
        id: registro.id,
        filename: registro.filename,
        promotora: registro.promotora,
        reports: 0,
        records: 0,
        history: 0
      };

      detalhes.reports += await trx("imported_reports").where({ id: registro.id }).delete();
      if (registro.filename) {
        detalhes.records += await trx("imported_records").where({ arquivo: registro.filename }).del();
        detalhes.history += await trx("import_history").where({ arquivo: registro.filename }).del();
      }

      resultados.push(detalhes);
    }
  });

  await logIntegration(
    "importacao",
    "limpar-seletivo",
    "sucesso",
    `Importacoes removidas (${resultados.length})`,
    {
      ids,
      actor: actor || "api",
      detalhes: resultados
    },
    {
      module: "GAIA::IMPORTACAO",
      origin: "importacao",
      actor: actor || "api",
      payload: { ids, removidos: resultados.length }
    }
  ).catch(() => {});

  return { removidos: resultados };
}

export async function limparImportacoes(actor) {
  const tables = ["imported_records", "imported_reports", "import_history"];
  const removidos = {};

  await db.transaction(async (trx) => {
    for (const table of tables) {
      const countRow = await trx(table).count({ total: "*" }).first();
      const total = Number(countRow?.total ?? countRow?.count ?? 0);
      await trx(table).del();
      removidos[table] = total;
    }

    const importLogsCount = await trx("integration_logs")
      .where({ integracao: "importacao" })
      .count({ total: "*" })
      .first();
    removidos.integration_logs = Number(importLogsCount?.total ?? importLogsCount?.count ?? 0);
    await trx("integration_logs").where({ integracao: "importacao" }).del();
  });

  await logIntegration(
    "importacao",
    "limpar",
    "sucesso",
    "Limpeza completa de importacoes",
    {
      removidos,
      actor: actor || "api"
    },
    {
      module: "GAIA::IMPORTACAO",
      origin: "importacao",
      actor: actor || "api",
      payload: removidos
    }
  ).catch(() => {});

  return { removidos };
}

export async function listarHistoricoImportacao({
  limit = 50,
  offset = 0,
  promotora
} = {}) {
  const baseQuery = db("imported_reports").modify((query) => {
    if (promotora) {
      query.where("promotora", String(promotora).trim());
    }
  });

  const totalRow = await baseQuery.clone().count({ total: "*" }).first();
  const total = Number(totalRow?.total ?? totalRow?.count ?? 0);

  const rows = await baseQuery
    .clone()
    .orderBy("created_at", "desc")
    .limit(Math.min(Number(limit) || 50, 200))
    .offset(Number(offset) || 0);

  const itens = rows.map((row) => {
    let metadata = {};
    if (typeof row.metadata === "string") {
      try {
        metadata = JSON.parse(row.metadata || "{}");
      } catch (_error) {
        metadata = {};
      }
    } else if (row.metadata && typeof row.metadata === "object") {
      metadata = row.metadata;
    }
    return {
      id: row.id,
      filename: row.filename,
      promotora: row.promotora,
      totalRegistros: Number(row.total_registros || 0),
      volumeTotal: Number(Number(row.volume_total || 0).toFixed(2)),
      comissaoTotal: Number(Number(row.comissao_total || 0).toFixed(2)),
      insights: metadata.insights || [],
      alertas: metadata.alertas || [],
      metadata,
      createdAt: row.created_at
    };
  });

  return { total, itens };
}
