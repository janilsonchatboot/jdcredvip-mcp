import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { persistImportedRecord } from "../persist.service.js";
import { cleanText, toCurrency, toDigits, toISODate } from "#utils/format.js";

const CSV_OPTIONS = {
  separator: ";",
  mapHeaders: ({ header }) => (header ? header.trim() : header)
};

const DEFAULTS = {
  promotora: "Yuppie",
  origemComissao: "Yuppie",
  situacaoComissao: "A receber",
  statusComercial: "Novo",
  situacao: "Em andamento",
  resultado: "Nao fechado"
};

const pickValue = (row, keys = []) => {
  for (const key of keys) {
    if (key in row && row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return null;
};

const normalizeMoney = (primary, fallback) => {
  const primaryValue = toCurrency(primary);
  if (primaryValue) return primaryValue;
  if (fallback !== undefined) {
    return toCurrency(fallback);
  }
  return 0;
};

const parsePercentValue = (value) => {
  if (!value && value !== 0) return null;
  const text = String(value).replace(/[%\s]/g, "");
  if (!text) return null;
  const normalized = parseFloat(text.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(normalized)) return null;
  return normalized > 1 ? Number((normalized / 100).toFixed(6)) : Number(normalized.toFixed(6));
};

const buildRecordFromRow = (row, context) => {
  const nome = cleanText(
    pickValue(row, ["NOME_CLIENTE", "Nome Cliente", "CLIENTE", "NOME"])
  );
  if (!nome) {
    return null;
  }

  const cpf = toDigits(pickValue(row, ["CPF", "CPF_CLIENTE", "CPFCLIENTE"]));
  const produto = cleanText(pickValue(row, ["PRODUTO", "Produto"]));
  const convenio = cleanText(pickValue(row, ["CONVENIO", "Convenio"]));
  const banco = cleanText(pickValue(row, ["BANCO", "Banco"]));
  const volumeBruto = normalizeMoney(row.PROD_BRUTA, row.VALOR_BASE);
  const volumeLiquido = normalizeMoney(row.PROD_LIQ, volumeBruto);
  const comissaoInformada = normalizeMoney(row.VALOR_COMISSAO);
  const comissaoLiquida =
    comissaoInformada || Number(parseFloat((volumeBruto - volumeLiquido).toFixed(2)));
  const comissaoPercentual = parsePercentValue(
    pickValue(row, ["COMISSÃO (%)", "Comissão (%)", "COMISSAO (%)", "COMISSAO%", "COMISSAO_PERC"])
  );
  const dataPagamento = toISODate(pickValue(row, ["DATA_PAG", "DATA_PAGAMENTO"]));
  const statusValor = cleanText(pickValue(row, ["STATUS", "SITUACAO"]));
  const contrato = cleanText(pickValue(row, ["CONTRATO", "Contrato", "NUM_CONTRATO"]));

  return {
    fonte: "importacao",
    origem: "importacao",
    promotora: context.promotora || DEFAULTS.promotora,
    nome_cliente: nome,
    cpf,
    telefone: null,
    produto,
    convenio,
    banco,
    volume_bruto: volumeBruto,
    volume_liquido: volumeLiquido,
    status: statusValor || DEFAULTS.statusComercial,
    status_comercial: DEFAULTS.statusComercial,
    situacao: DEFAULTS.situacao,
    comissao_liquida: comissaoLiquida,
    comissao_percentual: comissaoPercentual,
    data_pagamento: dataPagamento,
    origem_comissao: DEFAULTS.origemComissao,
    situacao_comissao: DEFAULTS.situacaoComissao,
    observacoes_estrategicas: null,
    contrato,
    contrato_ade: contrato,
    resultado: DEFAULTS.resultado,
    motivo_perda: null,
    import_batch_id: context.batchId,
    source_file: context.sourceFile,
    raw: row
  };
};

const validateFile = async (filePath) => {
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch (_error) {
    const error = new Error(`Arquivo para importacao nao encontrado: ${filePath}`);
    error.code = "FILE_NOT_FOUND";
    throw error;
  }
};

export async function importYuppie(filePath, batchId, options = {}) {
  if (!filePath) {
    throw new Error("Informe o caminho do arquivo CSV da Yuppie.");
  }

  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  await validateFile(resolvedPath);

  const rows = [];
  const persistFn = typeof options.persistFn === "function" ? options.persistFn : persistImportedRecord;

  const context = {
    promotora: options.promotora || DEFAULTS.promotora,
    batchId,
    sourceFile: options.sourceFile || resolvedPath
  };

  return new Promise((resolve, reject) => {
    fs.createReadStream(resolvedPath)
      .pipe(csv(CSV_OPTIONS))
      .on("data", (row) => {
        try {
          const record = buildRecordFromRow(row, context);
          if (record) {
            rows.push(record);
          }
        } catch (error) {
          console.error("Erro ao normalizar linha Yuppie:", error);
        }
      })
      .on("end", async () => {
        try {
          const persistResult =
            rows.length > 0
              ? await persistFn(rows)
              : { inserted: 0, volumeBruto: 0, volumeLiquido: 0, comissao: 0 };
          resolve({
            batchId,
            total: rows.length,
            ...persistResult
          });
        } catch (error) {
          reject(error);
        }
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

export default {
  importYuppie
};
