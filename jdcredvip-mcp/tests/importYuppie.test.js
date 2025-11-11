import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { importYuppie } from "#modules/importacao/importers/yuppieImporter.js";

const fixturePath = path.join(process.cwd(), "tests/fixtures/yuppie_sample.csv");

test("importYuppie normaliza contratos e retorna totais", async () => {
  let persistedRows = [];
  const persistFn = async (rows) => {
    persistedRows = rows;
    const volumeBruto = rows.reduce((acc, row) => acc + (row.volume_bruto || 0), 0);
    const volumeLiquido = rows.reduce((acc, row) => acc + (row.volume_liquido || 0), 0);
    const comissao = rows.reduce((acc, row) => acc + (row.comissao_liquida || 0), 0);
    return {
      inserted: rows.length,
      volumeBruto: Number(volumeBruto.toFixed(2)),
      volumeLiquido: Number(volumeLiquido.toFixed(2)),
      comissao: Number(comissao.toFixed(2))
    };
  };

  const resultado = await importYuppie(fixturePath, "batch-test", {
    promotora: "Yuppie",
    persistFn
  });

  assert.equal(resultado.total, 2);
  assert.equal(resultado.inserted, 2);
  assert.ok(Array.isArray(persistedRows));
  assert.equal(persistedRows.length, 2);
  assert.equal(persistedRows[0].nome_cliente, "Maria Souza");
  assert.equal(persistedRows[0].origem_comissao, "Yuppie");
  assert.equal(persistedRows[0].situacao_comissao, "A receber");
  assert.equal(persistedRows[0].resultado, "Nao fechado");
});
