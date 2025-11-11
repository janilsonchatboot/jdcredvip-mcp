import test from "node:test";
import assert from "node:assert/strict";
import { importarRegistros } from "../importers/run.js";

test("importarRegistros prioriza comissao monetaria e preserva percentual", () => {
  const rows = [
    {
      "Cliente": "Joao Lima",
      "CPF": "12345678900",
      "Produto": "INSS",
      "Valor liquido": "5000",
      "Comissao (%)": "12",
      "Comissao ($)": "650,50"
    }
  ];

  const resultado = importarRegistros(rows, { promotoraHint: "Yuppie" });
  assert.equal(resultado.registros[0].comissao, 650.5);
  assert.equal(resultado.registros[0].comissaoPercentual, 0.12);
});
