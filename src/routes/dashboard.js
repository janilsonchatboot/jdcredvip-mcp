import { Router } from "express";

import { getDashboardMetrics } from "../services/googleSheets.js";
import { hasGoogleCredentials, missingGoogleEnv } from "../config/env.js";

const router = Router();

router.get("/", async (_req, res) => {
  if (!hasGoogleCredentials) {
    return res.status(503).json({
      status: "erro",
      mensagem:
        "Configure as variáveis de ambiente do Google Sheets antes de consultar o dashboard.",
      variaveisFaltando: missingGoogleEnv()
    });
  }

  try {
    const dados = await getDashboardMetrics();
    res.json({
      status: "ok",
      dados
    });
  } catch (error) {
    console.error("Erro ao acessar Google Sheets:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Não foi possível consultar as métricas no momento.",
      detalhes: error.message
    });
  }
});

export default router;
