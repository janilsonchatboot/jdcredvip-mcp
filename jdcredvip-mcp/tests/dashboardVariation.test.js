import test from "node:test";
import assert from "node:assert/strict";
import { __dashboardTestUtils } from "#modules/dashboard/dashboard.service.js";

const { computeMetricDelta, buildComparisonWindow } = __dashboardTestUtils;

test("computeMetricDelta calcula variação percentual corretamente", () => {
  const current = {
    totalContratos: 120,
    volumeBruto: 500000,
    volumeLiquido: 320000,
    comissaoTotal: 45000,
    ticketMedio: 2666.66,
    volumeImportado: 120000,
    comissaoImportada: 18000,
    promotorasAtivas: 8
  };

  const previous = {
    totalContratos: 100,
    volumeBruto: 400000,
    volumeLiquido: 300000,
    comissaoTotal: 30000,
    ticketMedio: 3000,
    volumeImportado: 100000,
    comissaoImportada: 15000,
    promotorasAtivas: 6
  };

  const delta = computeMetricDelta(current, previous);

  assert.equal(delta.totalContratos.absolute, 20);
  assert.equal(delta.totalContratos.percent, 20);
  assert.equal(delta.volumeBruto.absolute, 100000);
  assert.equal(delta.volumeBruto.percent, 25);
  assert.equal(delta.comissaoTotal.percent, 50);
  assert.equal(delta.ticketMedio.percent.toFixed(2), "-11.11");
});

test("buildComparisonWindow gera período anterior baseado no filtro atual", () => {
  const window = buildComparisonWindow({
    dataInicio: "2025-10-01",
    dataFim: "2025-10-15"
  });

  assert.ok(window);
  assert.equal(window.current.dataInicio, "2025-10-01");
  assert.equal(window.current.dataFim, "2025-10-15");
  assert.equal(window.previous.dataFim, "2025-09-30");
  assert.equal(window.previous.days, window.current.days);
});
