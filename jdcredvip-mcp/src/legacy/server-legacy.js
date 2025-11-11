// === JD CRED VIP - Motor de Triagem e Dashboard ===
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";
import { randomUUID } from "crypto";
import { env } from "#core/env.js";
import { db, ensureDatabase, closeDatabase } from "#core/database.js";
import {
  publishMeta,
  getLatestDashboard,
  listMetas,
  getMetaById,
  saveOrUpdateMeta
} from "#modules/metas/metas.service.js";
import {
  simularCrefaz,
  contratarCrefaz,
  listarPropostasCrefaz
} from "#modules/integracoes/crefaz.service.js";
import {
  sincronizarNexxo,
  listarContratosNexxo,
  listarComissoesNexxo,
  resumoIntegracoes
} from "#modules/integracoes/nexxo.service.js";
import { logIntegration } from "#modules/auditoria/integration-log.service.js";
import { logActivity } from "#core/logger.js";
import { listarClientes } from "#modules/clientes/clientes.service.js";
import {
  listarFollowups,
  criarFollowup,
  atualizarFollowup,
  obterFollowupPorId
} from "#modules/followups/followups.service.js";
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost
} from "#modules/cms/cms.service.js";
import { analisarRelatorioComCodex } from "#modules/analise/codex.service.js";
import { computeDashboardInsights, getResumoDashboard } from "#modules/dashboard/dashboard.service.js";
import {
  listarBancos,
  criarBanco,
  atualizarBanco,
  removerBanco,
  listarPromotoras,
  criarPromotora,
  atualizarPromotora,
  removerPromotora,
  listarProdutos,
  criarProduto,
  atualizarProduto,
  removerProduto
} from "#modules/configuracoes/configuracoes.service.js";
import { verifyJwt } from "#utils/jwt.js";
import importacaoRoutes from "#modules/importacao/importacao.routes.js";
import {
  legacyImportarRelatorio,
  listarHistoricoImportacaoController
} from "#modules/importacao/importacao.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, _res, next) => {
  req.user = null;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  const bearerToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
  const fallbackToken =
    typeof req.headers["x-access-token"] === "string"
      ? req.headers["x-access-token"]
      : null;

  const token = bearerToken || fallbackToken;

  if (token) {
    const verification = verifyJwt(token, env.security.jwtSecret);
    if (verification.valid && verification.payload) {
      const normalizedRole = verification.payload.role
        ? String(verification.payload.role).toLowerCase()
        : "promotor";
      req.user = {
        id: verification.payload.sub ?? null,
        role: normalizedRole,
        username: verification.payload.username,
        displayName: verification.payload.displayName
      };
    }
  }

  next();
});

const normaliza = (texto = "") => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const parseJsonColumn = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
};

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  if (value === "") return [];
  return [value];
};

const getIntegrationSecret = (integration) => {
  const config = env.integrations?.[integration] || {};
  return config.apiKey || config.apiToken || config.webhookSecret || "";
};

const requiresRole = (...roles) => (req, res, next) => {
  if (!roles || roles.length === 0) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ status: "erro", mensagem: "Autenticacao requerida." });
  }

  const userRole = req.user?.role || "promotor";
  if (!roles.includes(userRole)) {
    return res.status(403).json({ status: "erro", mensagem: "Acesso nao autorizado para este recurso." });
  }

  return next();
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

const importRouter = importacaoRoutes;
app.use("/import", importRouter);

const shouldSkipLog = (req) => {
  if (req.method === "OPTIONS") return true;
  if (req.originalUrl.startsWith("/public")) return true;
  if (req.originalUrl.startsWith("/static")) return true;
  if (req.originalUrl.includes(".js") || req.originalUrl.includes(".css") || req.originalUrl.includes(".png")) return true;
  return false;
};

const resolveSource = (req) => {
  if (typeof req.headers["x-request-source"] === "string") {
    return req.headers["x-request-source"];
  }

  if (typeof req.headers["x-frontend-origin"] === "string") {
    return req.headers["x-frontend-origin"];
  }

  const userAgent = String(req.headers["user-agent"] || "");
  if (userAgent.toLowerCase().includes("mozilla")) {
    return "frontend";
  }

  if (userAgent.toLowerCase().includes("postman")) {
    return "postman";
  }

  return "api";
};

const buildResumoMetaSnapshot = (resumo) => {
  if (!resumo) return null;

  const agora = new Date();
  const isoDate = agora.toISOString();
  const dataReferencia =
    resumo.range?.dataFim ?? resumo.range?.dataInicio ?? isoDate.slice(0, 10);

  return {
    meta: {
      id: null,
      titulo: "GAIA Snapshot",
      dataReferencia,
      publicadoPor: "GAIA Core",
      metrics: {
        totalContratos: resumo.contratos ?? 0,
        volumeBruto: resumo.volume ?? 0,
        volumeLiquido: resumo.volume ?? 0,
        comissaoTotal: resumo.comissao ?? 0,
        volumeImportado: null,
        comissaoImportada: null,
        promotorasAtivas: null
      },
      metadata: {
        autoGenerated: true,
        generatedAt: isoDate,
        source: "dashboard-resumo",
        mensagem: "Sem meta publicada; exibindo dados reais.",
        progresso: resumo.progresso ?? null,
        range: resumo.range ?? null
      },
      createdAt: isoDate
    },
    products: []
  };
};

app.use((req, res, next) => {
  if (shouldSkipLog(req)) {
    return next();
  }

  const requestId = randomUUID();
  const startedAt = Date.now();
  const source = resolveSource(req);

  res.locals.requestId = requestId;

  res.on("finish", () => {
    const payloadSource = req.method === "GET" ? req.query : req.body;

    logActivity({
      requestId,
      route: req.originalUrl || req.url,
      method: req.method,
      source,
      userId: req.user?.id ?? null,
      userRole: req.user?.role ?? null,
      username: req.user?.username ?? actorFromRequest(req) ?? null,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      success: res.statusCode < 400,
      message: res.statusMessage,
      payload: payloadSource,
      ip:
        (req.headers["x-forwarded-for"] &&
          String(req.headers["x-forwarded-for"]).split(",")[0].trim()) ||
        req.socket?.remoteAddress ||
        null,
      userAgent: req.headers["user-agent"] || null,
      createdAt: db.fn.now()
    }).catch((error) => {
      console.error("Falha ao registrar log de atividade:", error);
    });
  });

  next();
});

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
app.post("/triagem", requiresRole("admin", "promotor"), (req, res) => {
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

app.post("/importar-relatorio", requiresRole("admin"), legacyImportarRelatorio);

app.get("/api/clientes", requiresRole("admin", "promotor"), async (req, res) => {
  try {
    const result = await listarClientes({
      search: req.query.search,
      promotora: req.query.promotora,
      origem: req.query.origem,
      status: req.query.status,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined
    });
    res.json({ status: "ok", dados: result });
  } catch (error) {
    console.error("Erro ao listar clientes:", error);
    res.status(500).json({ status: "erro", mensagem: "Falha ao listar clientes." });
  }
});

app.get("/api/contratos", requiresRole("admin", "promotor"), async (req, res) => {
  try {
    const dados = await listarContratosNexxo({
      promotora: req.query.promotora,
      status: req.query.status,
      produto: req.query.produto,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim,
      cliente: req.query.busca ?? req.query.cliente,
      limit: req.query.limit,
      offset: req.query.offset
    });
    res.json({ status: "ok", dados });
  } catch (error) {
    console.error("Erro ao listar contratos:", error);
    res.status(500).json({ status: "erro", mensagem: "Falha ao listar contratos." });
  }
});

app.get("/importacoes/relatorios", requiresRole("admin"), listarHistoricoImportacaoController);

app.get("/api/followups", requiresRole("admin", "promotor"), async (req, res) => {
  try {
    const followups = await listarFollowups({
      status: req.query.status,
      responsavel: req.query.responsavel,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim,
      busca: req.query.busca ?? req.query.search
    });
    res.json({ status: "ok", dados: followups });
  } catch (error) {
    console.error("Erro ao listar follow-ups:", error);
    res.status(500).json({ status: "erro", mensagem: "Falha ao listar follow-ups." });
  }
});

app.post("/api/followups", requiresRole("admin", "promotor"), async (req, res) => {
  try {
    const followup = await criarFollowup(req.body ?? {});
    res.status(201).json({ status: "ok", dados: followup });
  } catch (error) {
    console.error("Erro ao criar follow-up:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao criar follow-up." });
  }
});

app.put("/api/followups/:id", requiresRole("admin", "promotor"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ status: "erro", mensagem: "Identificador invalido para follow-up." });
  }

  try {
    const existente = await obterFollowupPorId(id);
    if (!existente) {
      return res.status(404).json({ status: "erro", mensagem: "Follow-up nao encontrado." });
    }

    const followup = await atualizarFollowup(id, req.body ?? {});
    res.json({ status: "ok", dados: followup });
  } catch (error) {
    console.error("Erro ao atualizar follow-up:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao atualizar follow-up." });
  }
});

app.get("/api/cms/posts", requiresRole("admin", "promotor"), async (req, res) => {
  try {
    const posts = await listPosts({
      status: req.query.status,
      search: req.query.search,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined
    });
    res.json({ status: "ok", dados: posts });
  } catch (error) {
    console.error("Erro ao listar posts CMS:", error);
    res.status(500).json({ status: "erro", mensagem: "Falha ao listar posts." });
  }
});

app.get("/api/cms/posts/:id", requiresRole("admin", "promotor"), async (req, res) => {
  try {
    const post = await getPost(req.params.id);
    if (!post) {
      return res.status(404).json({ status: "erro", mensagem: "Post nao encontrado." });
    }
    res.json({ status: "ok", dados: post });
  } catch (error) {
    console.error("Erro ao consultar post CMS:", error);
    res.status(500).json({ status: "erro", mensagem: "Falha ao consultar post." });
  }
});

app.post("/api/cms/posts", requiresRole("admin"), async (req, res) => {
  try {
    const post = await createPost(req.body || {});
    res.status(201).json({ status: "ok", dados: post });
  } catch (error) {
    console.error("Erro ao criar post CMS:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao criar post." });
  }
});

app.put("/api/cms/posts/:id", requiresRole("admin"), async (req, res) => {
  try {
    const post = await updatePost(req.params.id, req.body || {});
    res.json({ status: "ok", dados: post });
  } catch (error) {
    console.error("Erro ao atualizar post CMS:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao atualizar post." });
  }
});

app.delete("/api/cms/posts/:id", requiresRole("admin"), async (req, res) => {
  try {
    await deletePost(req.params.id);
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Erro ao remover post CMS:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao remover post." });
  }
});

// Configurações (bancos, promotoras, produtos)
const parseNumericId = (value) => {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

app.get("/api/config/bancos", requiresRole("admin"), async (_req, res) => {
  try {
    const bancos = await listarBancos();
    res.json({ status: "ok", dados: bancos });
  } catch (error) {
    console.error("Erro ao listar bancos:", error);
    res.status(500).json({ status: "erro", mensagem: "Falha ao listar bancos." });
  }
});

app.post("/api/config/bancos", requiresRole("admin"), async (req, res) => {
  try {
    const banco = await criarBanco(req.body || {});
    res.status(201).json({ status: "ok", dados: banco });
  } catch (error) {
    console.error("Erro ao criar banco:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao criar banco." });
  }
});

app.put("/api/config/bancos/:id", requiresRole("admin"), async (req, res) => {
  const id = parseNumericId(req.params.id);
  if (!id) {
    return res.status(400).json({ status: "erro", mensagem: "Identificador de banco invalido." });
  }
  try {
    const banco = await atualizarBanco(id, req.body || {});
    res.json({ status: "ok", dados: banco });
  } catch (error) {
    console.error("Erro ao atualizar banco:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao atualizar banco." });
  }
});

app.delete("/api/config/bancos/:id", requiresRole("admin"), async (req, res) => {
  const id = parseNumericId(req.params.id);
  if (!id) {
    return res.status(400).json({ status: "erro", mensagem: "Identificador de banco invalido." });
  }
  try {
    await removerBanco(id);
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Erro ao remover banco:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao remover banco." });
  }
});

app.get("/api/config/promotoras", requiresRole("admin"), async (_req, res) => {
  try {
    const promotoras = await listarPromotoras();
    res.json({ status: "ok", dados: promotoras });
  } catch (error) {
    console.error("Erro ao listar promotoras:", error);
    res.status(500).json({ status: "erro", mensagem: "Falha ao listar promotoras." });
  }
});

app.post("/api/config/promotoras", requiresRole("admin"), async (req, res) => {
  try {
    const promotora = await criarPromotora(req.body || {});
    res.status(201).json({ status: "ok", dados: promotora });
  } catch (error) {
    console.error("Erro ao criar promotora:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao criar promotora." });
  }
});

app.put("/api/config/promotoras/:id", requiresRole("admin"), async (req, res) => {
  const id = parseNumericId(req.params.id);
  if (!id) {
    return res.status(400).json({ status: "erro", mensagem: "Identificador de promotora invalido." });
  }
  try {
    const promotora = await atualizarPromotora(id, req.body || {});
    res.json({ status: "ok", dados: promotora });
  } catch (error) {
    console.error("Erro ao atualizar promotora:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao atualizar promotora." });
  }
});

app.delete("/api/config/promotoras/:id", requiresRole("admin"), async (req, res) => {
  const id = parseNumericId(req.params.id);
  if (!id) {
    return res.status(400).json({ status: "erro", mensagem: "Identificador de promotora invalido." });
  }
  try {
    await removerPromotora(id);
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Erro ao remover promotora:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao remover promotora." });
  }
});

app.get("/api/config/produtos", requiresRole("admin"), async (_req, res) => {
  try {
    const produtos = await listarProdutos();
    res.json({ status: "ok", dados: produtos });
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    res.status(500).json({ status: "erro", mensagem: "Falha ao listar produtos." });
  }
});

app.post("/api/config/produtos", requiresRole("admin"), async (req, res) => {
  try {
    const produto = await criarProduto(req.body || {});
    res.status(201).json({ status: "ok", dados: produto });
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao criar produto." });
  }
});

app.put("/api/config/produtos/:id", requiresRole("admin"), async (req, res) => {
  const id = parseNumericId(req.params.id);
  if (!id) {
    return res.status(400).json({ status: "erro", mensagem: "Identificador de produto invalido." });
  }
  try {
    const produto = await atualizarProduto(id, req.body || {});
    res.json({ status: "ok", dados: produto });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao atualizar produto." });
  }
});

app.delete("/api/config/produtos/:id", requiresRole("admin"), async (req, res) => {
  const id = parseNumericId(req.params.id);
  if (!id) {
    return res.status(400).json({ status: "erro", mensagem: "Identificador de produto invalido." });
  }
  try {
    await removerProduto(id);
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Erro ao remover produto:", error);
    res.status(400).json({ status: "erro", mensagem: error.message || "Falha ao remover produto." });
  }
});

// Endpoints de metas
app.post("/api/publicar-meta", requiresRole("admin"), async (req, res) => {
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

app.get("/api/metas", requiresRole("admin", "promotor"), async (req, res) => {
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

app.get("/api/metas/:id", requiresRole("admin", "promotor"), async (req, res) => {
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

app.put("/api/metas/:id", requiresRole("admin"), async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({
      status: "erro",
      mensagem: "O identificador da meta deve ser numérico."
    });
  }

  try {
    const resultado = await saveOrUpdateMeta(id, req.body || {});
    return res.json({ status: "ok", dados: resultado });
  } catch (error) {
    console.error("Erro ao atualizar meta:", error);
    return res.status(error.status || 500).json({
      status: "erro",
      mensagem: error.message || "Não foi possível atualizar a meta.",
      detalhes: error.message
    });
  }
});

// Dashboard alimentado pelo banco
app.get("/api/dashboard", requiresRole("admin", "promotor"), async (req, res) => {
  try {
    let dados = await getLatestDashboard();

    if (!dados) {
      const resumo = await getResumoDashboard({
        dataInicio: req.query?.dataInicio,
        dataFim: req.query?.dataFim
      });
      dados = buildResumoMetaSnapshot(resumo);
    }

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

app.get("/dashboard/resumo", requiresRole("admin", "promotor"), async (req, res) => {
  try {
    const insights = await computeDashboardInsights({
      promotora: req.query.promotora,
      produto: req.query.produto,
      status: req.query.status,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim
    });

    res.json({ status: "ok", dados: insights });
  } catch (error) {
    console.error("Erro ao gerar resumo do dashboard:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao consolidar dados do dashboard.",
      detalhes: error.message
    });
  }
});

app.get("/dashboard/ranking", requiresRole("admin", "promotor"), async (req, res) => {
  try {
    const insights = await computeDashboardInsights({
      promotora: req.query.promotora,
      produto: req.query.produto,
      status: req.query.status,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim
    });

    res.json({
      status: "ok",
      dados: {
        metrics: insights.metrics,
        ranking: insights.ranking,
        comissoes: insights.comissoes,
        charts: {
          porPromotora: insights.charts?.porPromotora ?? [],
          porProduto: insights.charts?.porProduto ?? [],
          porStatus: insights.charts?.porStatus ?? [],
          timeline: insights.charts?.timeline ?? []
        },
        importacoes: insights.importacoes
      }
    });
  } catch (error) {
    console.error("Erro ao gerar ranking do dashboard:", error);
    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao calcular ranking do dashboard.",
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

