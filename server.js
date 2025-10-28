// === JD CRED VIP - Motor de Triagem (v1.2) ===
// Servidor Express puro (sem dependências internas do Codex)

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    mensagem: "Motor de triagem JD CRED VIP ativo e pronto para acolher novos clientes."
  });
});

app.post("/triagem", (req, res) => {
  const { nome = "", produtoInformado = "", volumeLiquido = 0, perfil = {} } = req.body ?? {};

  let produtoIdeal = produtoInformado || "Análise pendente";
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor JD CRED VIP rodando em http://localhost:${PORT}`);
});
