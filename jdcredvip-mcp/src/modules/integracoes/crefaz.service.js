// === JD CRED VIP – Integração Crefaz ===
import { db } from "#core/database.js";
import { logIntegration } from "#modules/auditoria/integration-log.service.js";

const DEFAULT_DESCONTO_LIQUIDO = 0.94;
const DEFAULT_COEFICIENTE = 0.035;

const normalizaDocumento = (valor = "") => valor.replace(/\D+/g, "");

const ensureNumber = (valor, fallback) => {
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ensurePositiveInt = (valor, fallback) => {
  const parsed = parseInt(valor, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

function calcularSimulacao({ valorSolicitado, prazo }) {
  const valorLiquido = Number((valorSolicitado * DEFAULT_DESCONTO_LIQUIDO).toFixed(2));
  const coeficiente = DEFAULT_COEFICIENTE;
  const valorParcela = Number(((valorSolicitado * (1 + coeficiente * prazo)) / prazo).toFixed(2));

  return {
    valorLiquido,
    coeficiente,
    valorParcela,
    custoEfetivoTotal: Number(((coeficiente * 100) * prazo).toFixed(2))
  };
}

export async function simularCrefaz(proposta, actor = "manual") {
  const clienteNome = String(proposta?.clienteNome ?? "").trim();
  const clienteDocumento = normalizaDocumento(proposta?.clienteDocumento ?? "");
  const produto = String(proposta?.produto ?? "").trim();
  const prazo = ensurePositiveInt(proposta?.prazo, 0);
  const valorSolicitado = ensureNumber(proposta?.valorSolicitado, NaN);
  const promotora = String(proposta?.promotora ?? "JD CRED VIP").trim();

  if (!clienteNome || !clienteDocumento || !produto || !Number.isFinite(valorSolicitado) || valorSolicitado <= 0 || prazo <= 0) {
    const err = new Error("Informe clienteNome, clienteDocumento, produto, valorSolicitado e prazo válidos.");
    err.status = 400;
    throw err;
  }

  const simulacao = calcularSimulacao({ valorSolicitado, prazo });

  const registro = {
    cliente_nome: clienteNome,
    cliente_documento: clienteDocumento,
    produto,
    valor_solicitado: valorSolicitado,
    valor_liquido: simulacao.valorLiquido,
    prazo,
    promotora,
    status: "simulado",
    dados_simulacao: {
      ...simulacao,
      requisicao: {
        clienteNome,
        clienteDocumento,
        produto,
        prazo,
        valorSolicitado
      }
    }
  };

  const [id] = await db("crefaz_proposals").insert(registro);
  const saved = await db("crefaz_proposals").where({ id }).first();

  await logIntegration(
    "crefaz",
    "simulacao",
    "sucesso",
    `Proposta ${id} simulada`,
    { actor, propostaId: id },
    {
      module: "GAIA::CREFAZ",
      origin: "crefaz",
      actor,
      payload: { propostaId: id, promotora }
    }
  );

  return {
    id: saved.id,
    status: saved.status,
    clienteNome: saved.cliente_nome,
    produto: saved.produto,
    promotora: saved.promotora,
    valorSolicitado: Number(saved.valor_solicitado),
    valorLiquido: Number(saved.valor_liquido),
    prazo: saved.prazo,
    simulacao: saved.dados_simulacao
  };
}

export async function contratarCrefaz(payload, actor = "manual") {
  const propostaId = ensurePositiveInt(payload?.propostaId, 0);
  if (!propostaId) {
    const err = new Error("Informe um propostaId válido.");
    err.status = 400;
    throw err;
  }

  const proposta = await db("crefaz_proposals").where({ id: propostaId }).first();
  if (!proposta) {
    const err = new Error("Proposta não encontrada.");
    err.status = 404;
    throw err;
  }

  const status = String(payload?.status ?? "contratado").trim();
  const contratoNumero = String(payload?.contratoNumero ?? "").trim();
  const esteiraUrl = payload?.esteiraUrl ? String(payload.esteiraUrl).trim() : proposta.esteira_url;

  const dadosContrato = {
    contratoNumero: contratoNumero || null,
    documentosRecebidos: Array.isArray(payload?.documentos) ? payload.documentos : [],
    observacoes: payload?.observacoes ?? null,
    dataContratacao: payload?.dataContratacao ?? new Date().toISOString()
  };

  await db("crefaz_proposals")
    .where({ id: propostaId })
    .update({
      status,
      esteira_url: esteiraUrl,
      dados_contrato: dadosContrato,
      updated_at: db.fn.now()
    });

  const updated = await db("crefaz_proposals").where({ id: propostaId }).first();

  await logIntegration(
    "crefaz",
    "contratacao",
    "sucesso",
    `Proposta ${propostaId} atualizada para ${status}`,
    {
      actor,
      propostaId,
      status
    },
    {
      module: "GAIA::CREFAZ",
      origin: "crefaz",
      actor,
      payload: { propostaId, status, contratoNumero }
    }
  );

  return updated;
}

export async function listarPropostasCrefaz(filtros = {}) {
  const query = db("crefaz_proposals").orderBy("created_at", "desc");

  if (filtros.status) {
    query.where("status", filtros.status);
  }

  if (filtros.promotora) {
    query.where("promotora", filtros.promotora);
  }

  if (filtros.cliente?.trim()) {
    query.whereILike
      ? query.whereILike("cliente_nome", `%${filtros.cliente.trim()}%`)
      : query.where("cliente_nome", "like", `%${filtros.cliente.trim()}%`);
  }

  if (filtros.documento) {
    query.where("cliente_documento", normalizaDocumento(filtros.documento));
  }

  if (filtros.dataInicio) {
    query.where("created_at", ">=", filtros.dataInicio);
  }
  if (filtros.dataFim) {
    query.where("created_at", "<=", filtros.dataFim);
  }

  const limit = ensurePositiveInt(filtros.limit, 50);
  const offset = ensurePositiveInt(filtros.offset, 0);
  query.limit(Math.min(limit, 200)).offset(offset);

  const rows = await query;
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    clienteNome: row.cliente_nome,
    clienteDocumento: row.cliente_documento,
    produto: row.produto,
    promotora: row.promotora,
    valorSolicitado: Number(row.valor_solicitado),
    valorLiquido: Number(row.valor_liquido),
    prazo: row.prazo,
    esteiraUrl: row.esteira_url,
    dadosSimulacao: row.dados_simulacao,
    dadosContrato: row.dados_contrato,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
