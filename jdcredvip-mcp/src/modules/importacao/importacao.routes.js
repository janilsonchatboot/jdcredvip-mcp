import fs from "fs";
import express from "express";
import { requiresRole } from "#core/middlewares/auth.js";
import multer from "multer";
import os from "os";
import path from "path";
import {
  analisarImportacao,
  listarHistoricoImportacaoController,
  removerImportacaoController,
  uploadImportacao
} from "./importacao.controller.js";
import { limparImportacoesController } from "./importacaoAdmin.controller.js";
import { startBatch, finalizeBatch, registrarHistorico } from "./importacao.service.js";
import { importYuppie } from "./importers/yuppieImporter.js";

const uploadDir = path.join(os.tmpdir(), "jdcredvip-imports");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }
});

const router = express.Router();

router.post("/upload", requiresRole("admin"), upload.single("file"), uploadImportacao);
router.post("/analisar", requiresRole("admin"), analisarImportacao);
router.post("/yuppie", requiresRole("admin"), async (req, res) => {
    try {
      const filePath = req.body?.filePath || req.body?.path;
      if (!filePath) {
        return res
          .status(400)
          .json({ status: "erro", mensagem: "Informe o caminho do arquivo CSV (filePath)." });
      }

      const actor =
        req.user?.displayName || req.user?.username || req.user?.id || req.headers["x-actor"] || "api";
      const batchId = await startBatch("Yuppie", filePath, actor);
      const resultado = await importYuppie(filePath, batchId, {
        promotora: "Yuppie",
        sourceFile: filePath
      });
      await finalizeBatch(batchId, resultado, actor);
      await registrarHistorico(
        {
          filename: path.basename(filePath),
          promotora: "Yuppie",
          totalRegistros: resultado.total,
          volumeTotal: resultado.volumeLiquido ?? resultado.volumeBruto ?? 0,
          volumeBruto: resultado.volumeBruto ?? resultado.volumeLiquido ?? 0,
          comissaoTotal: resultado.comissao ?? 0,
          colunasReconhecidas: [],
          produtos: [],
          status: []
        },
        null,
        actor
      );

      res.json({ status: "ok", dados: resultado });
    } catch (error) {
      console.error("Erro ao importar CSV da Yuppie:", error);
      const statusCode = error.code === "FILE_NOT_FOUND" ? 404 : 500;
      res.status(statusCode).json({
        status: "erro",
        mensagem: error.message || "Falha ao processar o CSV da Yuppie."
      });
    }
  });
router.get("/historico", requiresRole("admin"), listarHistoricoImportacaoController);
router.delete("/historico", requiresRole("admin"), limparImportacoesController);
router.delete("/historico/:id", requiresRole("admin"), removerImportacaoController);

export default router;
