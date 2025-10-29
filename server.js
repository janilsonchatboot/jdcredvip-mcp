// === JD CRED VIP - Motor de Triagem (v1.4) ===
// Servidor Express puro, compatível com Render e integração com Google Sheets

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { getSheetData } from "./services/googleSheets.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

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
    limiteEstimado = 2000;
    comissaoPercent = 0.1;
    upsell = "FGTS / Conta de Luz";
  } else if (produtoInformado?.toLowerCase().includes("fgts")) {
    produtoIdeal = "FGTS Saque-Aniversário";
    limiteEstimado = 5000;
    comissaoPercent = 0.12;
    upsell = "Conta de Luz";
  } else {
    produtoIdeal = "Crédito Pessoal";
    limiteEstimado = 1000;
    comissaoPercent = 0.08;
  }

  const comissaoEstimada = (Number(volumeLiquido) || 0) * comissaoPercent;

  res.json({
    nome,
    produtoIdeal,
    motivo,
    limiteEstimado,
    comissaoPercent,
    comissaoEstimada,
    upsell,
    status
  });
});

// === Nova Rota: /api/dashboard ===
// Lê dados da planilha Google Sheets e retorna como JSON estruturado
app.get("/api/dashboard", async (_req, res) => {
  try {
    const range = "Resumo_Geral!A1:E10"; // ajuste conforme a aba e células da sua planilha CRM
    const data = await getSheetData(range);

    if (!data || !data.length) {
      return res.json({
        origem: "JD CRED VIP – Dashboard Online",
        totalLinhas: 0,
        dados: [],
        aviso: "Nenhum dado encontrado na planilha."
      });
    }

    const headers = data[0];
    const rows = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || "";
      });
      return obj;
    });

    res.json({
      origem: "JD CRED VIP – Dashboard Online",
      totalLinhas: rows.length,
      dados: rows
    });
  } catch (error) {
    console.error("Erro ao carregar dados do dashboard:", error);
    res.status(500).json({
      erro: "Falha ao acessar os dados da planilha.",
      detalhes: error.message
    });
  }
});

// Inicialização
app.listen(PORT, () => {
  console.log(`🚀 Servidor JD CRED VIP rodando na porta ${PORT}`);
});
