import { queryIntegrationLogs } from "./integration-log.service.js";

const normalize = (value) => (typeof value === "string" && value.trim() ? value.trim().toLowerCase() : undefined);

export async function listarIntegracoes(req, res) {
  try {
    const limit = Number(req.query.limit ?? 25);
    const offset = Number(req.query.offset ?? 0);
    const origem = normalize(req.query.origem);
    const status = normalize(req.query.status);
    const acao = normalize(req.query.acao);
    const search = typeof req.query.search === "string" ? req.query.search : req.query.q;
    const order = req.query.order === "asc" ? "asc" : "desc";

    const resultado = await queryIntegrationLogs({
      limit: Number.isFinite(limit) ? limit : 25,
      offset: Number.isFinite(offset) ? offset : 0,
      integracao: origem && origem !== "todos" ? origem : undefined,
      status,
      acao,
      search: typeof search === "string" ? search : undefined,
      order
    });

    res.json({ status: "ok", dados: resultado });
  } catch (error) {
    console.error("Erro ao listar logs de integracao:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao consultar logs de integracao."
    });
  }
}
