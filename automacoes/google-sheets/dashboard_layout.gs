const DASHBOARD_SHEET_NAME = "Dashboard";
const SOURCE_SHEET_NAME = "Carteira Triagem (Histórico)";

const BRAND_COLORS = {
  orange: "#FFA500",
  lightBlue: "#89CFF0",
  navy: "#0F3057",
  gray: "#F7F9FB",
  darkGray: "#3A3A3A",
  white: "#FFFFFF",
};

/**
 * Atualiza a aba Dashboard aplicando layout novo e métricas calculadas
 * a partir da aba "Carteira Triagem (Histórico)".
 *
 * Execute diretamente no Apps Script vinculado à planilha
 * ou informe um ID específico ao chamar via outro projeto:
 *    refreshCommercialDashboard("SUA_PLANILHA_ID_AQUI");
 */
function refreshCommercialDashboard(spreadsheetId) {
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();

  const source = spreadsheet.getSheetByName(SOURCE_SHEET_NAME);
  if (!source) {
    throw new Error(
      `A aba "${SOURCE_SHEET_NAME}" não foi encontrada. Atualize o nome ou revise a fonte de dados.`
    );
  }

  const dashboard =
    spreadsheet.getSheetByName(DASHBOARD_SHEET_NAME) ??
    spreadsheet.insertSheet(DASHBOARD_SHEET_NAME);

  rebuildDashboard(dashboard, source);
}

function rebuildDashboard(dashboard, source) {
  dashboard.clear();
  dashboard.clearConditionalFormatRules();
  dashboard.getCharts().forEach((chart) => dashboard.removeChart(chart));
  dashboard.setHiddenGridlines(true);
  dashboard.setFrozenRows(4);
  dashboard.setColumnWidths(2, 8, 120);
  dashboard.setColumnWidths(10, 1, 24);
  dashboard.getRange("B:J").setHorizontalAlignment("left");
  dashboard.getRange("B:J").setFontFamily("Arial");

  const metrics = buildMetrics(source);

  writeHeader(dashboard);
  writeSummary(dashboard, metrics);
  writeProductTable(dashboard, metrics.products);
  writeTopClients(dashboard, metrics.clients);
  writeNotesAndCTA(dashboard);
  insertProductChart(dashboard, metrics.products.length);
}

function buildMetrics(source) {
  const values = source.getDataRange().getValues();
  if (!values.length) {
    throw new Error("A fonte de dados está vazia. Verifique se a planilha foi preenchida.");
  }

  const headers = values.shift().map((header) => (header || "").toString().trim());
  const idx = buildIndex(headers);

  const closedDeals = [];
  const openDeals = [];

  values.forEach((row) => {
    const resultado = normalize(row[idx.resultadoFinal]);
    if (!resultado) {
      openDeals.push(row);
      return;
    }
    if (resultado === "fechado") {
      closedDeals.push(row);
    } else {
      openDeals.push(row);
    }
  });

  const totals = closedDeals.reduce(
    (acc, row) => {
      acc.volumeBruto += toNumber(row[idx.volumeEstimado]);
      acc.comissao += toNumber(row[idx.comissaoEstim]);
      return acc;
    },
    { volumeBruto: 0, comissao: 0 }
  );

  const volumeLiquido = totals.volumeBruto - totals.comissao;

  const productMap = new Map();
  closedDeals.forEach((row) => {
    const product = (row[idx.produto] || "Produto não informado").toString().trim();
    const item = productMap.get(product) || {
      produto: product,
      quantidade: 0,
      volumeBruto: 0,
      comissao: 0,
    };
    item.quantidade += 1;
    item.volumeBruto += toNumber(row[idx.volumeEstimado]);
    item.comissao += toNumber(row[idx.comissaoEstim]);
    productMap.set(product, item);
  });

  const products = Array.from(productMap.values())
    .map((item) => ({
      ...item,
      volumeLiquido: item.volumeBruto - item.comissao,
    }))
    .sort((a, b) => b.volumeBruto - a.volumeBruto);

  const clientMap = new Map();
  closedDeals.forEach((row) => {
    const client = (row[idx.nomeCliente] || "").toString().trim();
    if (!client) return;
    const item = clientMap.get(client) || { cliente: client, quantidade: 0, volume: 0 };
    item.quantidade += 1;
    item.volume += toNumber(row[idx.volumeEstimado]);
    clientMap.set(client, item);
  });

  const clients = Array.from(clientMap.values())
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 12);

  const ticketMedio = closedDeals.length
    ? volumeLiquido / closedDeals.length
    : 0;

  return {
    totalContratos: closedDeals.length,
    volumeBruto: totals.volumeBruto,
    comissaoTotal: totals.comissao,
    volumeLiquido,
    ticketMedio,
    leadsEmAberto: openDeals.length,
    produtosEmAlta: products.slice(0, 3).map((item) => item.produto),
    products,
    clients,
    atualizadoEm: new Date(),
  };
}

function buildIndex(headers) {
  const getIndex = (name) => {
    const position = headers.indexOf(name);
    if (position === -1) {
      throw new Error(`Cabeçalho "${name}" não encontrado na fonte de dados.`);
    }
    return position;
  };

  return {
    dataHora: getIndex("Data/Hora"),
    nomeCliente: getIndex("Nome do Cliente"),
    produto: getIndex("Produto Recomendado"),
    volumeEstimado: getIndex("Limite Estimado (R$)"),
    comissaoEstim: getIndex("Comissão Estimada (R$)"),
    resultadoFinal: getIndex("Resultado Final (Fechado / Não Fechado)"),
  };
}

function writeHeader(sheet) {
  sheet.getRange("B1:J1").merge().setValue("JD CRED VIP – Dashboard Comercial");
  sheet
    .getRange("B1:J1")
    .setBackground(BRAND_COLORS.orange)
    .setFontColor(BRAND_COLORS.white)
    .setFontWeight("bold")
    .setFontSize(18)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet
    .getRange("B2:J2")
    .merge()
    .setValue("Transparência, acolhimento e solução rápida para quem confia na gente.")
    .setFontSize(12)
    .setFontColor(BRAND_COLORS.navy)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet
    .getRange("B3:J3")
    .merge()
    .setValue("Fonte: Carteira Triagem (Histórico) – dados consolidados automaticamente.")
    .setFontSize(9)
    .setFontColor("#555555")
    .setHorizontalAlignment("center");
}

function writeSummary(sheet, metrics) {
  const cards = [
    { range: "B5:C7", label: "Contratos fechados", value: metrics.totalContratos, format: "#,##0" },
    { range: "D5:E7", label: "Volume liberado (R$)", value: metrics.volumeBruto, format: "R$ #,##0.00" },
    { range: "F5:G7", label: "Volume líquido (R$)", value: metrics.volumeLiquido, format: "R$ #,##0.00" },
    { range: "H5:I7", label: "Comissão total (R$)", value: metrics.comissaoTotal, format: "R$ #,##0.00" },
    { range: "B8:C10", label: "Ticket médio (R$)", value: metrics.ticketMedio, format: "R$ #,##0.00" },
    { range: "D8:E10", label: "Leads em aberto", value: metrics.leadsEmAberto, format: "#,##0" },
  ];

  cards.forEach((card) => {
    const range = sheet.getRange(card.range);
    range.clearFormat();
    range
      .setBackground(BRAND_COLORS.lightBlue)
      .setFontColor(BRAND_COLORS.navy)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(true);

    const topRow = range.getRow();
    const leftColumn = range.getColumn();
    const width = range.getNumColumns();
    const height = range.getNumRows();

    const labelCell = sheet.getRange(topRow, leftColumn, 1, width);
    labelCell.merge();
    labelCell.setValue(card.label).setFontSize(10);

    const valueCell = sheet.getRange(topRow + 1, leftColumn, Math.max(1, height - 1), width);
    valueCell.merge();
    valueCell
      .setValue(card.value)
      .setFontSize(18)
      .setNumberFormat(card.format)
      .setFontWeight("bold");
  });

  sheet
    .getRange("F8:G10")
    .merge()
    .setBackground(BRAND_COLORS.gray)
    .setFontColor(BRAND_COLORS.darkGray)
    .setValue(
      `Produtos destaque: ${metrics.produtosEmAlta.length ? metrics.produtosEmAlta.join(", ") : "—"}`
    )
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);

  sheet
    .getRange("H8:I10")
    .merge()
    .setBackground(BRAND_COLORS.gray)
    .setFontColor(BRAND_COLORS.darkGray)
    .setValue(
      `Atualizado em: ${Utilities.formatDate(metrics.atualizadoEm, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")}`
    )
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
}

function writeProductTable(sheet, products) {
  const startRow = 12;
  const headerRange = sheet.getRange(startRow, 2, 1, 5);
  headerRange.setValues([
    ["Produto", "Contratos", "Volume Bruto (R$)", "Comissão (R$)", "Volume Líquido (R$)"],
  ]);
  headerRange
    .setBackground(BRAND_COLORS.navy)
    .setFontColor(BRAND_COLORS.white)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  if (products.length === 0) {
    sheet
      .getRange(startRow + 1, 2, 1, 5)
      .merge()
      .setValue("Nenhum contrato fechado encontrado.")
      .setBackground(BRAND_COLORS.gray)
      .setFontColor(BRAND_COLORS.darkGray)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    return;
  }

  const dataRange = sheet.getRange(startRow + 1, 2, products.length, 5);
  dataRange.setValues(
    products.map((item) => [
      item.produto,
      item.quantidade,
      item.volumeBruto,
      item.comissao,
      item.volumeLiquido,
    ])
  );

  dataRange
    .setBackground(BRAND_COLORS.white)
    .setFontColor(BRAND_COLORS.darkGray)
    .setFontSize(10);

  sheet
    .getRange(startRow + 1, 3, products.length, 3)
    .setNumberFormat("R$ #,##0.00")
    .setHorizontalAlignment("right");
  sheet
    .getRange(startRow + 1, 2, products.length, 1)
    .setHorizontalAlignment("center");

  sheet
    .getRange(startRow - 1, 2, 1, 5)
    .merge()
    .setValue("Desempenho por produto")
    .setFontSize(12)
    .setFontWeight("bold")
    .setFontColor(BRAND_COLORS.navy)
    .setHorizontalAlignment("left");
}

function writeTopClients(sheet, clients) {
  const startRow = 12;
  const startColumn = 8;

  sheet
    .getRange(startRow - 1, startColumn, 1, 3)
    .merge()
    .setValue("Top clientes por volume recebido")
    .setFontSize(12)
    .setFontWeight("bold")
    .setFontColor(BRAND_COLORS.navy);

  const header = sheet.getRange(startRow, startColumn, 1, 3);
  header.setValues([["Cliente", "Contratos", "Volume (R$)"]]);
  header
    .setBackground(BRAND_COLORS.navy)
    .setFontColor(BRAND_COLORS.white)
    .setHorizontalAlignment("center")
    .setFontWeight("bold");

  if (!clients.length) {
    sheet
      .getRange(startRow + 1, startColumn, 1, 3)
      .merge()
      .setValue("Ainda não temos clientes fechados neste período.")
      .setBackground(BRAND_COLORS.gray)
      .setFontColor(BRAND_COLORS.darkGray)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    return;
  }

  const dataRange = sheet.getRange(startRow + 1, startColumn, clients.length, 3);
  dataRange.setValues(
    clients.map((item) => [item.cliente, item.quantidade, item.volume])
  );
  dataRange
    .setFontSize(10)
    .setFontColor(BRAND_COLORS.darkGray)
    .setBackground(BRAND_COLORS.white);

  sheet
    .getRange(startRow + 1, startColumn + 2, clients.length, 1)
    .setNumberFormat("R$ #,##0.00")
    .setHorizontalAlignment("right");

  sheet
    .getRange(startRow + 1, startColumn + 1, clients.length, 1)
    .setHorizontalAlignment("center");
}

function writeNotesAndCTA(sheet) {
  sheet
    .getRange("B28:H30")
    .merge()
    .setBackground(BRAND_COLORS.orange)
    .setFontColor(BRAND_COLORS.white)
    .setFontSize(12)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true)
    .setValue(
      "Precisou de reforço na operação? Chama a JD CRED VIP agora mesmo.\n➡️ Saiba mais e simule no WhatsApp: 84 98856-2331"
    );

  sheet
    .getRange("B32:H34")
    .merge()
    .setBackground(BRAND_COLORS.gray)
    .setFontColor(BRAND_COLORS.darkGray)
    .setFontSize(9)
    .setWrap(true)
    .setValue(
      "Lembrete: reforce a atualização dos status na aba 'Carteira Triagem (Histórico)' todo fim de tarde para manter o painel confiável."
    );
}

function insertProductChart(sheet, productCount) {
  if (!productCount) return;
  const lastRow = 12 + productCount;
  const chart = sheet
    .newChart()
    .addRange(sheet.getRange(12, 2, productCount + 1, 2))
    .setChartType(Charts.ChartType.COLUMN)
    .setOption("legend", { position: "none" })
    .setOption("title", "Contratos por produto")
    .setOption("colors", [BRAND_COLORS.lightBlue])
    .setPosition(20, 2, 0, 0)
    .build();
  sheet.insertChart(chart);
}

function normalize(value) {
  return (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
