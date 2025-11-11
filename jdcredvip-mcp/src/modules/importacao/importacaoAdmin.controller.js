import { actorFromRequest } from "#core/middlewares/auth.js";
import { limparImportacoes, removerImportacoesSelecionadas } from "./importacao.service.js";

const resolveActor = (req) => actorFromRequest(req);

const parseIds = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (typeof input === "string") {
    return input
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [input];
};

export async function limparImportacoesController(req, res) {
  try {
    const rawIds = parseIds(req.body?.ids ?? req.query?.ids);
    if (rawIds.length) {
      const dados = await removerImportacoesSelecionadas(rawIds, resolveActor(req));
      return res.json({ status: "ok", dados });
    }

    const dados = await limparImportacoes(resolveActor(req));
    res.json({ status: "ok", dados });
  } catch (error) {
    console.error("Erro ao limpar importacoes:", error);
    const statusCode = error?.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500;
    res.status(statusCode).json({
      status: "erro",
      mensagem: error?.message || "Falha ao limpar importacoes."
    });
  }
}
