import test from "node:test";
import assert from "node:assert/strict";
import { __testables } from "#modules/clientes/clientes.service.js";

const { mapRowToCliente } = __testables;

test("mapRowToCliente preserva campos padrao e novos atributos", () => {
  const row = {
    id: 1,
    promotora: "Yuppie",
    nomeCliente: "Maria Souza",
    cpf: "12345678900",
    telefone: "84999999999",
    produto: "FGTS",
    convenio: "INSS",
    banco: "Banco A",
    volumeBruto: "1000.50",
    volumeLiquido: "800.25",
    status: "Novo",
    statusComercial: "Novo",
    situacao: "Em andamento",
    ultimoContato: "2025-10-01",
    proximoContato: "2025-10-10",
    diasAteFollowup: 5,
    comissao: "120.10",
    comissaoLiquida: "120.10",
    dataPagamento: "2025-10-05",
    origemComissao: "Yuppie",
    situacaoComissao: "A receber",
    observacoesEstrategicas: "Sem observacoes",
    contrato: "ABC123",
    contratoAde: "ABC123",
    resultado: "Nao fechado",
    motivoPerda: null,
    origem: "importacao",
    fonte: "importacao",
    arquivo: "teste.csv",
    sourceFile: "D:/teste.csv",
    importBatchId: "batch-1",
    createdAt: "2025-10-01T10:00:00.000Z",
    updatedAt: "2025-10-02T12:00:00.000Z"
  };

  const cliente = mapRowToCliente(row);

  assert.equal(cliente.nome, "Maria Souza");
  assert.equal(cliente.documento, "12345678900");
  assert.equal(cliente.promotoras[0], "Yuppie");
  assert.equal(cliente.origens[0], "importacao");
  assert.equal(cliente.volumeBruto, 1000.5);
  assert.equal(cliente.volumeLiquido, 800.25);
  assert.equal(cliente.comissao, 120.1);
  assert.equal(cliente.ultimoStatus, "Novo");
  assert.equal(cliente.ultimaAtualizacao, "2025-10-02T12:00:00.000Z");
  assert.equal(cliente.diasAteFollowup, 5);
});
