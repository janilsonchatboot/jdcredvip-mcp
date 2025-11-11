import {
  listarBancos,
  criarBanco,
  atualizarBanco,
  removerBanco,
  listarPromotoras,
  criarPromotora,
  atualizarPromotora,
  removerPromotora,
  listarProdutos,
  criarProduto,
  atualizarProduto,
  removerProduto
} from "./configuracoes.service.js";

const handle = async (res, fn) => {
  try {
    const dados = await fn();
    res.json({ status: "ok", dados });
  } catch (error) {
    console.error("Erro em configuracoes:", error);
    res.status(500).json({ status: "erro", mensagem: error.message || "Falha ao processar configuracoes." });
  }
};

export const listarBancosController = (_req, res) => handle(res, () => listarBancos());
export const criarBancoController = (req, res) =>
  handle(res, () => criarBanco(req.body ?? {}));
export const atualizarBancoController = (req, res) =>
  handle(res, () => atualizarBanco(req.params.id, req.body ?? {}));
export const removerBancoController = (req, res) =>
  handle(res, () => removerBanco(req.params.id));

export const listarPromotorasController = (_req, res) => handle(res, () => listarPromotoras());
export const criarPromotoraController = (req, res) =>
  handle(res, () => criarPromotora(req.body ?? {}));
export const atualizarPromotoraController = (req, res) =>
  handle(res, () => atualizarPromotora(req.params.id, req.body ?? {}));
export const removerPromotoraController = (req, res) =>
  handle(res, () => removerPromotora(req.params.id));

export const listarProdutosController = (_req, res) => handle(res, () => listarProdutos());
export const criarProdutoController = (req, res) =>
  handle(res, () => criarProduto(req.body ?? {}));
export const atualizarProdutoController = (req, res) =>
  handle(res, () => atualizarProduto(req.params.id, req.body ?? {}));
export const removerProdutoController = (req, res) =>
  handle(res, () => removerProduto(req.params.id));
