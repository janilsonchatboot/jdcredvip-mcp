import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { importYuppie } from "#modules/importacao/importers/yuppieImporter.js";

const fixturePath = path.join(process.cwd(), "tests/fixtures/yuppie_sample.csv");
const inconsistentFixturePath = path.join(
  process.cwd(),
  "tests/fixtures/yuppie_inconsistent.csv"
);

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

test("importYuppie ignora linhas sem nome e normaliza campos problematicos", async () => {
  let persistedRows = [];
  const persistFn = async (rows) => {
    persistedRows = rows;
    return {
      inserted: rows.length,
      volumeBruto: 0,
      volumeLiquido: 0,
      comissao: 0
    };
  };

  const resultado = await importYuppie(inconsistentFixturePath, "batch-quality", {
    promotora: "Yuppie QA",
    persistFn
  });

  assert.equal(resultado.total, 1);
  assert.equal(resultado.inserted, 1);
  assert.equal(persistedRows.length, 1);

  const registro = persistedRows[0];
  assert.equal(registro.nome_cliente, "Ana Silva");
  assert.equal(registro.cpf, "98765432100");
  assert.equal(registro.produto, "Cartao");
  assert.equal(registro.status, "Pago");
  assert.equal(registro.status_comercial, "Novo");
  assert.equal(registro.situacao_comissao, "A receber");
  assert.equal(registro.promotora, "Yuppie QA");
});
