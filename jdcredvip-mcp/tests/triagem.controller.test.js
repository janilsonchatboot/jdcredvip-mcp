import test from "node:test";
import assert from "node:assert/strict";

import { avaliar } from "#modules/triagem/triagem.controller.js";

const invokeAvaliacao = (body) => {
  let jsonPayload;
  const req = { body };
  const res = {
    json(payload) {
      jsonPayload = payload;
    }
  };

  avaliar(req, res);
  return jsonPayload;
};

test("avaliar sinaliza cliente apto quando perfil ou produto valido", () => {
  const respostaPerfil = invokeAvaliacao({
    nome: "Maria Teste",
    perfil: { isINSS: true }
  });

  assert.equal(respostaPerfil?.dados?.status, "Apto");
  assert.equal(respostaPerfil?.dados?.produtoIdeal, "INSS Consignado");

  const respostaProduto = invokeAvaliacao({
    nome: "Joao Cliente",
    produtoInformado: "FGTS Saque-Aniversario"
  });

  assert.equal(respostaProduto?.dados?.status, "Apto");
  assert.equal(respostaProduto?.dados?.produtoIdeal, "FGTS Saque-Aniversario");
});

test("avaliar pede revisao quando falta nome", () => {
  const resposta = invokeAvaliacao({
    nome: "   ",
    perfil: { isCLT: true }
  });

  assert.equal(resposta?.dados?.status, "Atencao: Revisar");
  assert.match(resposta?.dados?.motivo ?? "", /nome do cliente/i);
});
