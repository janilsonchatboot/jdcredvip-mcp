// === JD CRED VIP – Integração Nexxo ===
import { db } from "#core/database.js";
import { logIntegration, getLatestLogs } from "#modules/auditoria/integration-log.service.js";
import { upsertComissaoDetalhada, listarComissoesDetalhadas } from "./comissao.service.js";

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
      await upsertComissaoDetalhada(trx, comissao);
      summary.commissions.persistidas += 1;
    }

    await trx.commit();

    await logIntegration(
      "nexxo",
      "sync",
      "sucesso",
      "Sincronizacao concluida",
      {
        actor,
        contratos: summary.contracts.persistidos,
        comissoes: summary.commissions.persistidas
      },
      {
        module: "GAIA::NEXXO",
        origin: "nexxo",
        actor,
        payload: summary
      }
    );

    return summary;
  } catch (error) {
    await trx.rollback();
    await logIntegration(
      "nexxo",
      "sync",
      "erro",
      error.message,
      { actor },
      {
        module: "GAIA::NEXXO",
        origin: "nexxo",
        actor
      }
    );
    throw error;
  }
}

const normalizeFiltroTexto = (value) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  if (normalized === "todos" || normalized === "all") {
    return null;
  }
  return raw;
};

export async function listarContratosNexxo(filtros = {}) {
  const promotora = normalizeFiltroTexto(filtros.promotora);
  const status = normalizeFiltroTexto(filtros.status);
  const produto = normalizeFiltroTexto(filtros.produto);
  const cliente = normalizeFiltroTexto(filtros.cliente);

  const query = db("nexxo_contracts").orderBy("updated_at", "desc");

  if (promotora) {
    query.where("promotora", promotora);
  }
  if (status) {
    query.where("status", status);
  }
  if (produto) {
    query.where("produto", produto);
  }
  if (filtros.dataInicio) {
    query.where("data_contratacao", ">=", filtros.dataInicio);
  }
  if (filtros.dataFim) {
    query.where("data_contratacao", "<=", filtros.dataFim);
  }
  if (cliente) {
    const like = `%${cliente}%`;
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
  const rows = await listarComissoesDetalhadas({
    referencia: filtros.referencia,
    produto: filtros.produto,
    promotora: filtros.promotora,
    limit: filtros.limit,
    offset: filtros.offset
  });

  return rows.map((row) => ({
    id: row.id,
    referencia: row.referencia,
    promotora: row.promotora,
    produto: row.produto,
    valor: row.valor,
    dadosOrigem: row.payload,
    criadoEm: row.criadoEm
  }));
}

export async function resumoIntegracoes() {
  const [totalCrefaz] = await db("crefaz_proposals").count({ count: "*" });
  const [totalContratos] = await db("nexxo_contracts").count({ count: "*" });
  const [totalComissoes] = await db("nexxo_commissions").count({ count: "*" });

  const importResumo = await db("imported_reports")
    .count({ totalArquivos: "*" })
    .sum({ volumeImportado: "volume_total" })
    .sum({ comissaoImportada: "comissao_total" })
    .first();

  const promotorasImport = await db("imported_reports").distinct("promotora");
  const volumeImportado = Number(importResumo?.volumeImportado ?? 0);
  const comissaoImportada = Number(importResumo?.comissaoImportada ?? 0);
  const promotoras = promotorasImport
    .map((row) => String(row.promotora || "Desconhecida"))
    .filter((value, index, self) => self.indexOf(value) === index);

  const logs = await getLatestLogs(5);

  return {
    resumo: {
      propostasCrefaz: Number(totalCrefaz?.count ?? totalCrefaz ?? 0),
      contratosNexxo: Number(totalContratos?.count ?? totalContratos ?? 0),
      comissoesNexxo: Number(totalComissoes?.count ?? totalComissoes ?? 0),
      volumeImportado: Number(volumeImportado.toFixed(2)),
      comissaoImportada: Number(comissaoImportada.toFixed(2)),
      promotorasAtivas: promotoras.length
    },
    logsRecentes: logs
  };
}


