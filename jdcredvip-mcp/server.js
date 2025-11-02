// === JD CRED VIP - Motor de Triagem e Dashboard ===
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import { ensureDatabase, closeDatabase } from "./config/database.js";
import {
  publishMeta,
  getLatestDashboard,
  listMetas,
  getMetaById
} from "./services/metaService.js";
import {
  simularCrefaz,
  contratarCrefaz,
  listarPropostasCrefaz
} from "./services/crefazService.js";
import {
  sincronizarNexxo,
  listarContratosNexxo,
  listarComissoesNexxo,
  resumoIntegracoes
} from "./services/nexxoService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const normaliza = (texto = "") => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const getIntegrationSecret = (integration) => {
  const config = env.integrations?.[integration] || {};
  return config.apiKey || config.apiToken || config.webhookSecret || "";
};

const authorizeIntegration = (integration, req) => {
  const expected = getIntegrationSecret(integration);
  if (!expected) return;
  const provided = req.headers["x-api-key"];
  if (expected !== provided) {
    const error = new Error("Chave de integração inválida.");
    error.status = 401;
    throw error;
  }
};

const actorFromRequest = (req) => req.headers["x-actor"] || req.headers["x-user-email"] || "api";

const toPositiveInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

const toPositiveNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Number(parsed.toFixed(2));
};

const validateMetaPayload = (body) => {
  const errors = [];

  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["O corpo da requisição deve ser um objeto JSON."] };
  }

  const titulo = String(body.titulo ?? "").trim();
  if (!titulo) errors.push("Informe o campo 'titulo'.");

  const publicadoPor = String(body.publicadoPor ?? body.autor ?? "").trim();
  if (!publicadoPor) errors.push("Informe quem está publicando a meta em 'publicadoPor'.");

  const referencia = String(body.dataReferencia ?? body.referencia ?? "").trim();
  if (!referencia) {
    errors.push("Informe 'dataReferencia' no formato AAAA-MM-DD.");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(referencia)) {
    errors.push("Use o formato AAAA-MM-DD em 'dataReferencia'.");
  }

  const metricsInput = body.metrics ?? body.metricas ?? {};
  const metrics = {
    totalContratos: toPositiveInteger(metricsInput.totalContratos ?? metricsInput.total_contratos),
    volumeBruto: toPositiveNumber(metricsInput.volumeBruto ?? metricsInput.volume_bruto),
    volumeLiquido: toPositiveNumber(metricsInput.volumeLiquido ?? metricsInput.volume_liquido),
    comissaoTotal: toPositiveNumber(metricsInput.comissaoTotal ?? metricsInput.comissao_total)
  };

  const produtosInput = Array.isArray(body.produtos) ? body.produtos : Array.isArray(body.products) ? body.products : [];

  const products = produtosInput.map((item, index) => {
    const produto = String(item?.produto ?? item?.nome ?? "").trim();
    if (!produto) {
      errors.push(`Informe o nome do produto na posição ${index}.`);
    }

    return {
      produto,
      quantidade: toPositiveInteger(item?.quantidade ?? item?.qtde),
      volumeBruto: toPositiveNumber(item?.volumeBruto ?? item?.volume_bruto),
      volumeLiquido: toPositiveNumber(item?.volumeLiquido ?? item?.volume_liquido),
      comissao: toPositiveNumber(item?.comissao)
    };
  });

  return {
    ok: errors.length === 0,
    errors,
    payload: {
      titulo,
      publicadoPor,
      dataReferencia: referencia,
      metrics,
      products,
      metadata: body.metadata ?? null
    }
  };
};

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
  let status = "Não apto";

  const possuiPerfil = perfil?.isBA || perfil?.isINSS || perfil?.isCLT;
  const produtoNormalizado = normaliza(produtoInformado);

  if (!nome.trim()) {
    status = "Atenção: Revisar";
    motivo = "Informe o nome do cliente para registrar no CRM.";
  }

  if (!possuiPerfil && !produtoNormalizado) {
    status = "Atenção: Revisar";
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

// Endpoints de metas
app.post("/api/publicar-meta", async (req, res) => {
  const { ok, errors, payload } = validateMetaPayload(req.body);

  if (!ok) {
    return res.status(400).json({
      status: "erro",
      mensagem: "Payload inválido para publicação da meta.",
      erros: errors
    });
  }

  try {
    const resultado = await publishMeta(payload);
    return res.status(201).json({ status: "ok", dados: resultado });
  } catch (error) {
    if (error.code === "23505" || error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        status: "erro",
        mensagem: "Já existe uma meta publicada para essa data com esse título."
      });
    }

    console.error("Erro ao publicar meta:", error);
    return res.status(500).json({
      status: "erro",
      mensagem: "Não foi possível publicar a meta.",
      detalhes: error.message
    });
  }
});

app.get("/api/metas", async (req, res) => {
  const limit = Math.min(toPositiveInteger(req.query.limit ?? 20, 20), 100);
  const offset = toPositiveInteger(req.query.offset ?? 0, 0);

  try {
    const metas = await listMetas(limit, offset);
    res.json({ status: "ok", dados: metas });
  } catch (error) {
    console.error("Erro ao listar metas:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Não foi possível carregar as metas publicadas.",
      detalhes: error.message
    });
  }
});

app.get("/api/metas/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({
      status: "erro",
      mensagem: "O identificador da meta deve ser numérico."
    });
  }

  try {
    const meta = await getMetaById(id);
    if (!meta) {
      return res.status(404).json({
        status: "erro",
        mensagem: "Meta não encontrada."
      });
    }

    return res.json({ status: "ok", dados: meta });
  } catch (error) {
    console.error("Erro ao consultar meta:", error);
    return res.status(500).json({
      status: "erro",
      mensagem: "Não foi possível consultar a meta informada.",
      detalhes: error.message
    });
  }
});

// Dashboard alimentado pelo banco
app.get("/api/dashboard", async (_req, res) => {
  try {
    const dados = await getLatestDashboard();

    if (!dados) {
      return res.status(404).json({
        status: "erro",
        mensagem: "Nenhuma meta publicada até o momento."
      });
    }

    return res.json({ status: "ok", dados });
  } catch (error) {
    console.error("Erro ao carregar dados do dashboard:", error);
    return res.status(500).json({
      status: "erro",
      mensagem: "Falha ao acessar os dados do banco.",
      detalhes: error.message
    });
  }
});

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// --- Integração Crefaz ---
app.post("/integracoes/crefaz/simular", async (req, res) => {
  try {
    authorizeIntegration("crefaz", req);
    const dados = await simularCrefaz(req.body, actorFromRequest(req));
    res.status(201).json({ status: "ok", dados });
  } catch (error) {
    console.error("Erro ao simular proposta Crefaz:", error);
    res.status(error.status || 400).json({
      status: "erro",
      mensagem: error.message || "Falha ao simular proposta."
    });
  }
});

app.post("/integracoes/crefaz/contratar", async (req, res) => {
  try {
    authorizeIntegration("crefaz", req);
    const proposta = await contratarCrefaz(req.body, actorFromRequest(req));
    res.json({ status: "ok", dados: proposta });
  } catch (error) {
    console.error("Erro ao atualizar proposta Crefaz:", error);
    res.status(error.status || 400).json({
      status: "erro",
      mensagem: error.message || "Falha ao atualizar proposta."
    });
  }
});

app.get("/integracoes/crefaz/propostas", async (req, res) => {
  try {
    authorizeIntegration("crefaz", req);
    const propostas = await listarPropostasCrefaz({
      status: req.query.status,
      promotora: req.query.promotora,
      cliente: req.query.cliente,
      documento: req.query.documento,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim,
      limit: req.query.limit,
      offset: req.query.offset
    });
    res.json({ status: "ok", dados: propostas });
  } catch (error) {
    console.error("Erro ao consultar propostas Crefaz:", error);
    res.status(error.status || 500).json({
      status: "erro",
      mensagem: error.message || "Falha ao consultar propostas."
    });
  }
});

// --- Integração Nexxo ---
app.post("/integracoes/nexxo/sync", async (req, res) => {
  try {
    authorizeIntegration("nexxo", req);
    const summary = await sincronizarNexxo(req.body, actorFromRequest(req));
    res.status(202).json({ status: "ok", dados: summary });
  } catch (error) {
    console.error("Erro ao sincronizar dados da Nexxo:", error);
    res.status(error.status || 500).json({
      status: "erro",
      mensagem: error.message || "Falha ao sincronizar dados da Nexxo."
    });
  }
});

app.get("/integracoes/nexxo/contratos", async (req, res) => {
  try {
    authorizeIntegration("nexxo", req);
    const contratos = await listarContratosNexxo({
      promotora: req.query.promotora,
      status: req.query.status,
      produto: req.query.produto,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim,
      cliente: req.query.cliente,
      limit: req.query.limit,
      offset: req.query.offset
    });
    res.json({ status: "ok", dados: contratos });
  } catch (error) {
    console.error("Erro ao listar contratos da Nexxo:", error);
    res.status(error.status || 500).json({
      status: "erro",
      mensagem: error.message || "Falha ao listar contratos."
    });
  }
});

app.get("/integracoes/nexxo/comissoes", async (req, res) => {
  try {
    authorizeIntegration("nexxo", req);
    const comissoes = await listarComissoesNexxo({
      referencia: req.query.referencia,
      promotora: req.query.promotora,
      produto: req.query.produto,
      limit: req.query.limit
    });
    res.json({ status: "ok", dados: comissoes });
  } catch (error) {
    console.error("Erro ao listar comissões da Nexxo:", error);
    res.status(error.status || 500).json({
      status: "erro",
      mensagem: error.message || "Falha ao listar comissões."
    });
  }
});

app.get("/integracoes/status", async (req, res) => {
  try {
    authorizeIntegration("nexxo", req); // mesmo token de consulta
    const resumo = await resumoIntegracoes();
    res.json({ status: "ok", dados: resumo });
  } catch (error) {
    console.error("Erro ao consultar status das integrações:", error);
    res.status(error.status || 500).json({
      status: "erro",
      mensagem: error.message || "Falha ao consultar status das integrações."
    });
  }
});

async function bootstrap() {
  try {
    await ensureDatabase();
    app.listen(env.port, () => {
      console.log(`Servidor JD CRED VIP rodando na porta ${env.port}`);
    });
  } catch (error) {
    console.error("Erro ao inicializar o servidor:", error);
    process.exit(1);
  }
}

bootstrap();

const shutdown = async () => {
  await closeDatabase();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
