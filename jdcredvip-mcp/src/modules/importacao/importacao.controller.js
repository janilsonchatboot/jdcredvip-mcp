import fs from "fs";
import {
  importarArquivoLocal,
  importarBase64,
  listarHistoricoImportacao,
  removerImportacao
} from "./importacao.service.js";
import { logIntegration } from "#modules/auditoria/integration-log.service.js";
import { actorFromRequest } from "#core/middlewares/auth.js";

const resolveActor = (req) => actorFromRequest(req);

export async function uploadImportacao(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ status: "erro", mensagem: "Selecione um arquivo para importar." });
    }

    const summary = await importarArquivoLocal(file.path, {
      filename: file.originalname,
      promotora: req.body?.promotora,
      persist: true,
      actor: resolveActor(req)
    });

    res.json({ status: "ok", dados: summary });
  } catch (error) {
    console.error("Erro ao processar upload:", error);
    await logIntegration(
      "importacao",
      "upload",
      "erro",
      error.message,
      {
        filename: req.file?.originalname
      },
      {
        module: "GAIA::IMPORTACAO",
        origin: "importacao",
        actor: resolveActor(req),
        userId: req.user?.id ?? null,
        ip: req.ip,
        httpStatus: 400,
        payload: { promotora: req.body?.promotora }
      }
    ).catch(() => {});
    res.status(400).json({
      status: "erro",
      mensagem: error.message || "Falha ao processar o arquivo."
    });
  } finally {
    if (req.file?.path) {
      fs.promises.unlink(req.file.path).catch(() => {});
    }
  }
}

export async function analisarImportacao(req, res) {
  try {
    const { filename, data, promotora, persist } = req.body ?? {};
    if (!filename || !data) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Informe o nome do arquivo e o conteúdo base64 para análise."
      });
    }

    const summary = await importarBase64(data, {
      filename,
      promotora,
      persist: persist === true,
      actor: resolveActor(req)
    });

    res.json({ status: "ok", dados: summary });
  } catch (error) {
    console.error("Erro ao analisar relat�rio:", error);
    await logIntegration("importacao", "analisar", "erro", error.message, {
      filename: req.body?.filename
    }, {
      module: "GAIA::IMPORTACAO",
      origin: "importacao",
      actor: resolveActor(req),
      userId: req.user?.id ?? null,
      ip: req.ip,
      httpStatus: 400,
      payload: { persist: req.body?.persist === true }
    }).catch(() => {});
   res.status(400).json({
      status: "erro",
      mensagem: error.message || "Falha ao analisar o relatório."
    });
  }
}

export async function legacyImportarRelatorio(req, res) {
  try {
    const { filename, data, promotora } = req.body ?? {};
    if (!filename || !data) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Informe o arquivo (nome e conteúdo base64) para processar."
      });
    }

    const summary = await importarBase64(data, {
      filename,
      promotora,
      persist: true,
      actor: resolveActor(req)
    });

    res.json({ status: "ok", dados: summary });
  } catch (error) {
    console.error("Erro ao importar relat�rio (legacy):", error);
    await logIntegration("importacao", "upload", "erro", error.message, {
      filename: req.body?.filename
    }, {
      module: "GAIA::IMPORTACAO",
      origin: "importacao",
      actor: resolveActor(req),
      userId: req.user?.id ?? null,
      ip: req.ip,
      httpStatus: 400
    }).catch(() => {});
   res.status(400).json({
      status: "erro",
      mensagem: error.message || "Falha ao processar o relatório."
    });
  }
}

export async function listarHistoricoImportacaoController(req, res) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const promotora = req.query.promotora ? String(req.query.promotora).trim() : undefined;

    const dados = await listarHistoricoImportacao({ limit, offset, promotora });
    res.json({ status: "ok", dados });
  } catch (error) {
    console.error("Erro ao listar importações:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao listar importações."
    });
  }
}

export async function removerImportacaoController(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Identificador de importacao invalido."
      });
    }

    const dados = await removerImportacao(id, resolveActor(req));
    res.json({ status: "ok", dados });
  } catch (error) {
    console.error("Erro ao remover importacao:", error);
    const statusCode = error?.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500;
    res.status(statusCode).json({
      status: "erro",
      mensagem: error?.message || "Falha ao remover importacao."
    });
  }
}

