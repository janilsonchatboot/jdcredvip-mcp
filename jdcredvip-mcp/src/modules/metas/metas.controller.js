import { publishMeta, listMetas, getMetaById, saveOrUpdateMeta } from "./metas.service.js";

const parseLimitOffset = (query) => ({
  limit: query.limit ? Number(query.limit) : 20,
  offset: query.offset ? Number(query.offset) : 0
});

export async function publicar(req, res) {
  try {
    const payload = await publishMeta(req.body ?? {});
    res.status(201).json({ status: "ok", dados: payload });
  } catch (error) {
    console.error("Erro ao publicar meta:", error);
    res.status(400).json({
      status: "erro",
      mensagem: error.message || "Falha ao publicar meta."
    });
  }
}

export async function listar(req, res) {
  try {
    const { limit, offset } = parseLimitOffset(req.query);
    const metas = await listMetas(limit, offset);
    res.json({ status: "ok", dados: metas });
  } catch (error) {
    console.error("Erro ao listar metas:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao listar metas."
    });
  }
}

export async function obter(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({
      status: "erro",
      mensagem: "O identificador da meta deve ser numerico."
    });
  }

  try {
    const meta = await getMetaById(id);
    if (!meta) {
      return res.status(404).json({
        status: "erro",
        mensagem: "Meta nao encontrada."
      });
    }
    res.json({ status: "ok", dados: meta });
  } catch (error) {
    console.error("Erro ao carregar meta:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao consultar meta."
    });
  }
}

export async function atualizar(req, res) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({
      status: "erro",
      mensagem: "O identificador da meta deve ser numerico."
    });
  }

  try {
    const payload = await saveOrUpdateMeta(id, req.body ?? {});
    res.json({ status: "ok", dados: payload });
  } catch (error) {
    console.error("Erro ao atualizar meta:", error);
    res.status(error.status || 500).json({
      status: "erro",
      mensagem: error.message || "Falha ao atualizar meta."
    });
  }
}
