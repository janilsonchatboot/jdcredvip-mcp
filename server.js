/ === JD CRED VIP - Motor de Triagem (v1.4) ===
  // Servidor Express com integração ao Google Sheets

  import express from "express";
  import cors from "cors";
  import bodyParser from "body-parser";
  import { getDashboardMetrics } from "./services/googleSheets.js";
  import { hasGoogleCredentials, missingGoogleEnv } from "./config/env.js";

  const app = express();
  const PORT = process.env.PORT || 8080;

  app.use(cors());
  app.use(bodyParser.json());

  const normaliza = (texto = "") =>
    texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // Rota de status
  app.get("/", (_req, res) => {
    res.json({
      status: "ok",
      mensagem: "Motor de triagem JD CRED VIP ativo e pronto para acolher novos clientes."
    });
  });

  // Rota principal de triagem
  app.post("/triagem", (req, res) => {
    const { nome = "", produtoInformado = "", volumeLiquido = 0, perfil = {} } = req.body ?? {};

    let produtoIdeal = produtoInformado.trim() || "Análise pendente";
    let motivo = "OK";
    let limiteEstimado = 0;
    let comissaoPercent = 0;
    let upsell = "";
    let status = "✅ Apto";

    const possuiPerfil = perfil?.isBA || perfil?.isINSS || perfil?.isCLT;
    const produtoNormalizado = normaliza(produtoInformado);

    if (!nome.trim()) {
      status = "⚠️ Revisar";
      motivo = "Informe o nome do cliente para registrar no CRM.";
    }

    if (!possuiPerfil && !produtoNormalizado) {
      status = "⚠️ Revisar";
      motivo = "Defina o perfil (INSS, Bolsa Família, CLT) ou o produto desejado.";
    }

    if (perfil?.isBA) {
      produtoIdeal = "Crédito Bolsa Família";
      limiteEstimado = 750;
      comissaoPercent = 0.09;
      upsell = "Conta de Luz";
    } else if (perfil?.isINSS) {
      produtoIdeal = "INSS Consignado";
      limiteEstimado = 15000;
      comissaoPercent = 0.17;
      upsell = "Portabilidade + Refin";
    } else if (perfil?.isCLT) {
      produtoIdeal = "Crédito Trabalhador CLT";
      limiteEstimado = 20000;
      comissaoPercent = 0.1;
      upsell = "FGTS / Conta de Luz";
    } else if (produtoNormalizado.includes("fgts")) {
      produtoIdeal = "FGTS Saque-Aniversário";
      limiteEstimado = 5000;
      comissaoPercent = 0.12;
      upsell = "Conta de Luz";
    } else if (!possuiPerfil) {
      produtoIdeal = "Crédito Pessoal Seguro";
      limiteEstimado = 1000;
      comissaoPercent = 0.08;
    }

    const volume = Number(volumeLiquido) || 0;
    const comissaoEstimada = Number((volume * comissaoPercent).toFixed(2));

    res.json({
      nome: nome.trim(),
      produtoIdeal,
      motivo,
      limiteEstimado,
      comissaoPercent,
      comissaoEstimada,
      upsell,
      status
    });
  });

  // Rota do dashboard (GET /api/dashboard)
  app.get("/api/dashboard", async (_req, res) => {
    if (!hasGoogleCredentials) {
      return res.status(503).json({
        status: "erro",
        mensagem: "Configure as variáveis do Google Sheets antes de consultar o dashboard.",
        variaveisFaltando: missingGoogleEnv()
      });
    }

    try {
      const dados = await getDashboardMetrics();
      res.json({ status: "ok", dados });
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      res.status(500).json({
        status: "erro",
        mensagem: "Falha ao acessar os dados da planilha.",
        detalhes: error.message
      });
    }
  });

  app.listen(PORT, () => {
    console.log(`Servidor JD CRED VIP rodando na porta ${PORT}`);
  });
