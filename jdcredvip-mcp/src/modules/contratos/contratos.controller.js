import { listarContratos } from "./contratos.service.js";

const buildFiltro = (query) => ({
  promotora: query.promotora,
  status: query.status,
  produto: query.produto,
  dataInicio: query.dataInicio,
  dataFim: query.dataFim,
  cliente: query.busca ?? query.cliente,
  limit: query.limit,
  offset: query.offset
});

export async function listar(req, res) {
  try {
    const dados = await listarContratos(buildFiltro(req.query));
    res.json({ status: "ok", dados });
  } catch (error) {
    console.error("Erro ao listar contratos:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao listar contratos."
    });
  }
}
