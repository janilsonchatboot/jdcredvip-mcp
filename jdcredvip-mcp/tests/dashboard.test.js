import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardFromRows } from "#modules/dashboard/dashboard.service.js";

test("buildDashboardFromRows aggregates contracts, commissions and imports", () => {
  const contratos = [];

  const comissoes = [
    { id: 99, promotora: "Nexxo", produto: "Consignado INSS", valor: 950, created_at: "2025-10-15" },
    { id: 100, promotora: "Nexxo", produto: "Consignado INSS", valor: 500, created_at: "2025-10-16" }
  ];

  const importacoes = [
    {
      id: 7,
      filename: "nexxo-outubro.csv",
      promotora: "Nexxo",
      total_registros: 40,
      volume_total: 21000,
      comissao_total: 1400,
      metadata: { insights: ["OK"], alertas: [] },
      created_at: "2025-10-09"
    }
  ];

  const importRecords = [
    {
      id: 500,
      promotora: "Nexxo",
      produto: "Consignado INSS",
      status: "aprovado",
      volume_bruto: 15000,
      volume_liquido: 12000,
      comissao_valor: 1000,
      data_operacao: "2025-10-10",
      created_at: "2025-10-11",
      raw: { banco_nome: "Banco A" }
    },
    {
      id: 501,
      promotora: "Nexxo",
      produto: "Consignado INSS",
      status: "aguardando",
      volume_bruto: 8000,
      volume_liquido: 6000,
      comissao_valor: 400,
      data_operacao: "2025-10-12",
      created_at: "2025-10-12",
      raw: { banco_nome: "Banco B" }
    }
  ];

  const resultado = buildDashboardFromRows({
    contratos,
    comissoes,
    importacoes,
    importRecords,
    filters: { promotora: "Nexxo" }
  });

  assert.equal(resultado.metrics.totalContratos, 2);
  assert.equal(resultado.metrics.volumeLiquido, 18000);
  assert.equal(resultado.metrics.comissaoTotal, 2850);
  assert.equal(resultado.metrics.promotorasAtivas, 1);

  assert.equal(resultado.ranking.promotoras[0].nome, "Nexxo");
  assert.equal(resultado.ranking.produtos[0].nome, "Consignado INSS");
  assert.equal(resultado.ranking.comissoes[0].comissaoTotal, 2850);

  assert.equal(resultado.importacoes.resumo.totalArquivos, 1);
  assert.equal(resultado.importacoes.resumo.volumeTotal, 18000);

  assert.deepEqual(resultado.filters, { promotora: "Nexxo" });
});

test("buildDashboardFromRows handles empty datasets gracefully", () => {
  const resultado = buildDashboardFromRows();

  assert.equal(resultado.metrics.totalContratos, 0);
  assert.equal(resultado.metrics.volumeLiquido, 0);
  assert.equal(resultado.importacoes.resumo.totalArquivos, 0);
  assert.equal(resultado.ranking.promotoras.length, 0);
  assert.equal(resultado.charts.timeline.length, 0);
});
