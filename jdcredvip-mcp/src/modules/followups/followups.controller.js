import {
  listarFollowups,
  criarFollowup,
  atualizarFollowup,
  obterFollowupPorId
} from "./followups.service.js";

const buildFiltro = (query) => ({
  status: query.status,
  responsavel: query.responsavel,
  dataInicio: query.dataInicio,
  dataFim: query.dataFim,
  busca: query.busca ?? query.search
});

export async function listar(req, res) {
  try {
    const followups = await listarFollowups(buildFiltro(req.query));
    res.json({ status: "ok", dados: followups });
  } catch (error) {
    console.error("Erro ao listar follow-ups:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao listar follow-ups."
    });
  }
}

export async function criar(req, res) {
  try {
    const followup = await criarFollowup(req.body ?? {});
    res.status(201).json({ status: "ok", dados: followup });
  } catch (error) {
    console.error("Erro ao criar follow-up:", error);
    res.status(400).json({
      status: "erro",
      mensagem: error.message || "Falha ao criar follow-up."
    });
  }
}

export async function atualizar(req, res) {
  try {
    const followup = await atualizarFollowup(req.params.id, req.body ?? {});
    res.json({ status: "ok", dados: followup });
  } catch (error) {
    console.error("Erro ao atualizar follow-up:", error);
    res.status(error.statusCode || 400).json({
      status: "erro",
      mensagem: error.message || "Falha ao atualizar follow-up."
    });
  }
}

export async function obter(req, res) {
  try {
    const followup = await obterFollowupPorId(req.params.id);
    if (!followup) {
      return res.status(404).json({
        status: "erro",
        mensagem: "Follow-up n\u00e3o encontrado."
      });
    }
    res.json({ status: "ok", dados: followup });
  } catch (error) {
    console.error("Erro ao buscar follow-up:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao buscar follow-up."
    });
  }
}
