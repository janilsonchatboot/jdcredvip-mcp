import { computeDashboardInsights } from "../dashboard/dashboard.service.js";

const buildFilters = (query) => ({
  promotora: query.promotora,
  produto: query.produto,
  status: query.status,
  dataInicio: query.dataInicio,
  dataFim: query.dataFim
});

export async function listar(req, res) {
  try {
    const insights = await computeDashboardInsights(buildFilters(req.query));
    const limit = req.query.limit ? Number(req.query.limit) : null;
    const clamp = (items = []) => {
      if (!limit || !Number.isFinite(limit) || limit <= 0) {
        return items;
      }
      return items.slice(0, Number(limit));
    };

    res.json({
      status: "ok",
      dados: {
        metrics: insights.metrics,
        ranking: {
          promotoras: clamp(insights.ranking?.promotoras),
          produtos: clamp(insights.ranking?.produtos),
          comissoes: clamp(insights.ranking?.comissoes),
          status: clamp(insights.ranking?.status)
        },
        comissoes: insights.comissoes
      }
    });
  } catch (error) {
    console.error("Erro ao listar ranking:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao listar ranking."
    });
  }
}
