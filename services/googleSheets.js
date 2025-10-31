import { google } from "googleapis";
import { env, hasGoogleCredentials, missingGoogleEnv } from "../config/env.js";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

const RANGES = [
  { key: "resumoGeral", range: "Resumo_Geral!A1:E50" },
  { key: "leadsPorProduto", range: "Leads_por_Produto!A1:D200" },
  { key: "conversaoCanais", range: "Conversao_Canais!A1:D200" },
  { key: "followUps", range: "FollowUps_e_Upsells!A1:G500" },
  { key: "tempoResposta", range: "Tempo_Resposta!A1:E500" },
  { key: "indicadoresFinanceiros", range: "Indicadores_Financeiros!A1:E500" },
  { key: "painelResumo", range: "Painel Resumo!A1:E50" },
];

let sheetsClientPromise;

const createSheetsClient = async () => {
  if (!hasGoogleCredentials) {
    const missing = missingGoogleEnv();
    const message = `Configuração Google Sheets ausente: ${missing.join(", ")}`;
    throw new Error(message);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: env.googleServiceAccountEmail,
      private_key: env.googlePrivateKey,
    },
    scopes: SCOPES,
  });

  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
};

const getSheetsClient = async () => {
  if (!sheetsClientPromise) {
    sheetsClientPromise = createSheetsClient().catch((error) => {
      sheetsClientPromise = undefined;
      throw error;
    });
  }
  return sheetsClientPromise;
};

const toTable = (values = []) => {
  if (!values.length) {
    return { header: [], rows: [] };
  }
  const [header, ...rows] = values;
  const cleanedRows = rows
    .filter((row) => row.some((cell) => cell && `${cell}`.trim() !== ""))
    .map((row) => {
      const record = {};
      header.forEach((colName, index) => {
        if (!colName) return;
        record[colName] = row[index] ?? "";
      });
      return record;
    });

  return { header, rows: cleanedRows };
};

const buildResumoMetrics = (table) => {
  const metrics = {};
  table.rows.forEach((row) => {
    const key = row["Métrica"] ?? row["Metrica"];
    if (!key) return;
    metrics[key] = {
      descricao: row["Descrição"] ?? row["Descricao"] ?? "",
      valorAtual: row["Valor Atual"] ?? "",
      meta: row["Meta"] ?? "",
      status: row["Status"] ?? "",
    };
  });
  return metrics;
};

const parsePainelResumo = (table) => {
  const metrics = {};
  table.rows.forEach((row) => {
    const key = row["Métrica"] ?? row["Metrica"];
    if (!key) return;
    metrics[key] = row["Valor"] ?? row["Valor Atual"] ?? "";
  });
  return metrics;
};

export const getDashboardMetrics = async () => {
  const sheets = await getSheetsClient();

  const { data } = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: env.sheetId,
    ranges: RANGES.map((item) => item.range),
  });

  const tables = {};
  data.valueRanges?.forEach((valueRange, index) => {
    const key = RANGES[index].key;
    tables[key] = toTable(valueRange.values ?? []);
  });

  return {
    atualizadoEm: new Date().toISOString(),
    resumoGeral: {
      table: tables.resumoGeral,
      metrics: buildResumoMetrics(tables.resumoGeral),
    },
    painelResumo: {
      table: tables.painelResumo,
      metrics: parsePainelResumo(tables.painelResumo),
    },
    leadsPorProduto: tables.leadsPorProduto,
    conversaoCanais: tables.conversaoCanais,
    followUps: tables.followUps,
    tempoResposta: tables.tempoResposta,
    indicadoresFinanceiros: tables.indicadoresFinanceiros,
  };
};
