// === JD CRED VIP – Integração Nexxo ===
import { db } from "../config/database.js";
import { logIntegration } from "./integrationLogService.js";

const ensureArray = (value) => (Array.isArray(value) ? value : []);
const ensurePositiveInt = (valor, fallback) => {
  const parsed = parseInt(valor, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};
const ensureNumber = (valor, fallback = 0) => {
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getClientName = () => db.client?.config?.client || db.context?.client?.config?.client || "";
const isMySQL = () => getClientName().startsWith("mysql");

async function upsertContrato(trx, contrato) {
  const record = {
    contrato_id: String(contrato.id ?? contrato.contratoId ?? contrato.numero ?? "").trim(),
    cliente_nome: String(contrato.clienteNome ?? contrato.cliente ?? "").trim(),
    produto: String(contrato.produto ?? "").trim(),
    status: String(contrato.status ?? "desconhecido").trim(),
    valor_bruto: ensureNumber(contrato.valorBruto, 0),
    valor_liquido: ensureNumber(contrato.valorLiquido, 0),
    promotora: String(contrato.promotora ?? contrato.parceiro ?? "Nexxo").trim(),
    data_contratacao: contrato.dataContratacao ?? null,
    payload: contrato,
    updated_at: trx.fn.now()
  };

  if (!record.contrato_id) {
    throw new Error("Contrato recebido sem identificador (campo id ou contratoId obrigatório).");
  }

  try {
    if (isMySQL()) {
      await trx("nexxo_contracts")
        .insert(record)
        .onDuplicateKeyUpdate({
          cliente_nome: record.cliente_nome,
          produto: record.produto,
          status: record.status,
          valor_bruto: record.valor_bruto,
          valor_liquido: record.valor_liquido,
          promotora: record.promotora,
          data_contratacao: record.data_contratacao,
          payload: record.payload,
          updated_at: record.updated_at
        });
    } else {
      await trx("nexxo_contracts")
        .insert(record)
        .onConflict("contrato_id")
        .merge({
          cliente_nome: record.cliente_nome,
          produto: record.produto,
          status: record.status,
          valor_bruto: record.valor_bruto,
          valor_liquido: record.valor_liquido,
          promotora: record.promotora,
          data_contratacao: record.data_contratacao,
          payload: record.payload,
          updated_at: record.updated_at
        });
    }
  } catch (error) {
    // fallback manual
    const exists = await trx("nexxo_contracts").where({ contrato_id: record.contrato_id }).first();
    if (exists) {
      await trx("nexxo_contracts").where({ contrato_id: record.contrato_id }).update({
        cliente_nome: record.cliente_nome,
        produto: record.produto,
        status: record.status,
        valor_bruto: record.valor_bruto,
        valor_liquido: record.valor_liquido,
        promotora: record.promotora,
        data_contratacao: record.data_contratacao,
        payload: record.payload,
        updated_at: record.updated_at
      });
    } else {
      await trx("nexxo_contracts").insert(record);
    }
  }
}

async function upsertComissao(trx, comissao) {
  const referencia = String(comissao.referencia ?? comissao.periodo ?? "").trim();
  const promotora = String(comissao.promotora ?? "Nexxo").trim();
  const produto = String(comissao.produto ?? comissao.modalidade ?? "").trim();

  if (!referencia || !produto) {
    throw new Error("Comissão recebida sem referência ou produto.");
  }

  const record = {
    referencia,
    promotora,
    produto,
    valor: ensureNumber(comissao.valor, 0),
    payload: comissao,
    created_at: trx.fn.now()
  };

  try {
    if (isMySQL()) {
      await trx("nexxo_commissions")
        .insert(record)
        .onDuplicateKeyUpdate({
          valor: record.valor,
          payload: record.payload,
          created_at: record.created_at
        });
    } else {
      await trx("nexxo_commissions")
        .insert(record)
        .onConflict(["referencia", "promotora", "produto"])
        .merge({
          valor: record.valor,
          payload: record.payload
        });
    }
  } catch (error) {
    const exists = await trx("nexxo_commissions")
      .where({ referencia, promotora, produto })
      .first();
    if (exists) {
      await trx("nexxo_commissions")
        .where({ referencia, promotora, produto })
        .update({
          valor: record.valor,
          payload: record.payload
        });
    } else {
      await trx("nexxo_commissions").insert(record);
    }
  }
}

export async function sincronizarNexxo(payload = {}, actor = "manual") {
  const contratos = ensureArray(payload.contracts);
  const comissoes = ensureArray(payload.commissions);

  const trx = await db.transaction();
  const summary = {
    contracts: { recebidos: contratos.length, persistidos: 0 },
    commissions: { recebidas: comissoes.length, persistidas: 0 }
  };

  try {
    for (const contrato of contratos) {
      await upsertContrato(trx, contrato);
      summary.contracts.persistidos += 1;
    }

    for (const comissao of comissoes) {
      await upsertComissao(trx, comissao);
      summary.commissions.persistidas += 1;
    }

    await trx.commit();

    await logIntegration("nexxo", "sync", "sucesso", "Sincronização concluída", {
      actor,
      contratos: summary.contracts.persistidos,
      comissoes: summary.commissions.persistidas
    });

    return summary;
  } catch (error) {
    await trx.rollback();
    await logIntegration("nexxo", "sync", "erro", error.message, { actor });
    throw error;
  }
}

export async function listarContratosNexxo(filtros = {}) {
  const query = db("nexxo_contracts").orderBy("updated_at", "desc");

  if (filtros.promotora) {
    query.where("promotora", filtros.promotora);
  }
  if (filtros.status) {
    query.where("status", filtros.status);
  }
  if (filtros.produto) {
    query.where("produto", filtros.produto);
  }
  if (filtros.dataInicio) {
    query.where("data_contratacao", ">=", filtros.dataInicio);
  }
  if (filtros.dataFim) {
    query.where("data_contratacao", "<=", filtros.dataFim);
  }
  if (filtros.cliente?.trim()) {
    const like = `%${filtros.cliente.trim()}%`;
    if (typeof query.whereILike === "function") {
      query.whereILike("cliente_nome", like);
    } else {
      query.where("cliente_nome", "like", like);
    }
  }

  const limit = ensurePositiveInt(filtros.limit, 50);
  const offset = ensurePositiveInt(filtros.offset, 0);

  const rows = await query.limit(Math.min(limit, 200)).offset(offset);

  return rows.map((row) => ({
    id: row.id,
    contratoId: row.contrato_id,
    clienteNome: row.cliente_nome,
    produto: row.produto,
    status: row.status,
    valorBruto: Number(row.valor_bruto),
    valorLiquido: Number(row.valor_liquido),
    promotora: row.promotora,
    dataContratacao: row.data_contratacao,
    dadosOrigem: row.payload,
    atualizadoEm: row.updated_at
  }));
}

export async function listarComissoesNexxo(filtros = {}) {
  const query = db("nexxo_commissions").orderBy("created_at", "desc");

  if (filtros.referencia) {
    query.where("referencia", filtros.referencia);
  }
  if (filtros.produto) {
    query.where("produto", filtros.produto);
  }
  if (filtros.promotora) {
    query.where("promotora", filtros.promotora);
  }

  const limit = ensurePositiveInt(filtros.limit, 100);
  const rows = await query.limit(Math.min(limit, 500));

  return rows.map((row) => ({
    id: row.id,
    referencia: row.referencia,
    promotora: row.promotora,
    produto: row.produto,
    valor: Number(row.valor),
    dadosOrigem: row.payload,
    criadoEm: row.created_at
  }));
}

export async function resumoIntegracoes() {
  const [totalCrefaz] = await db("crefaz_proposals").count({ count: "*" });
  const [totalContratos] = await db("nexxo_contracts").count({ count: "*" });
  const [totalComissoes] = await db("nexxo_commissions").count({ count: "*" });

  const logs = await db("integration_logs").orderBy("created_at", "desc").limit(5);

  return {
    resumo: {
      propostasCrefaz: Number(totalCrefaz?.count ?? totalCrefaz ?? 0),
      contratosNexxo: Number(totalContratos?.count ?? totalContratos ?? 0),
      comissoesNexxo: Number(totalComissoes?.count ?? totalComissoes ?? 0)
    },
    logsRecentes: logs
  };
}
