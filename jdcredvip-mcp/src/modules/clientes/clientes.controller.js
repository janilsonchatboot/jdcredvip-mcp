import clientesService from "./clientes.service.js";

const toNumberOrUndefined = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildFilterInput = (query) => ({
  search: query.search,
  promotora: query.promotora,
  origem: query.origem,
  status: query.status,
  produto: query.produto,
  dataInicio: query.dataInicio,
  dataFim: query.dataFim,
  limit: toNumberOrUndefined(query.limit),
  offset: toNumberOrUndefined(query.offset)
});

export async function listar(req, res) {
  try {
    const filtros = buildFilterInput(req.query);
    const resultado = await clientesService.listarClientes(filtros);
    res.json({ status: "ok", dados: resultado });
  } catch (error) {
    console.error("Erro ao listar clientes:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao listar clientes."
    });
  }
}

export async function resumo(req, res) {
  try {
    const filtros = buildFilterInput(req.query);
    filtros.limit = 1;
    filtros.offset = 0;
    const resultado = await clientesService.listarClientes(filtros);
    res.json({
      status: "ok",
      dados: {
        total: resultado.total,
        totalClientesUnicos: resultado.totalClientesUnicos,
        aggregates: resultado.aggregates
      }
    });
  } catch (error) {
    console.error("Erro ao resumir clientes:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao calcular resumo de clientes."
    });
  }
}
