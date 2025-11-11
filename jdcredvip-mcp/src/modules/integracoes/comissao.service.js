import { db } from "#core/database.js";

const ensureNumber = (valor, fallback = 0) => {
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ensurePositiveInt = (valor, fallback = 0) => {
  const parsed = parseInt(valor, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const getClientName = () => db.client?.config?.client || db.context?.client?.config?.client || "";
const isMySQL = () => getClientName().startsWith("mysql");

export async function upsertComissaoDetalhada(trx, comissao) {
  const referencia = String(comissao.referencia ?? comissao.periodo ?? "").trim();
  const promotora = String(comissao.promotora ?? comissao.parceiro ?? "Nexxo").trim();
  const produto = String(comissao.produto ?? comissao.modalidade ?? "").trim();
  const valor = ensureNumber(comissao.valor, 0);

  if (!referencia || !produto) {
    throw new Error("Comissao recebida sem referencia ou produto.");
  }

  const record = {
    referencia,
    promotora,
    produto,
    valor,
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
  } catch (_error) {
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

export async function registrarComissaoDetalhada(dados) {
  const trx = await db.transaction();
  try {
    await upsertComissaoDetalhada(trx, dados);
    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

export async function listarComissoesDetalhadas({
  referencia,
  produto,
  promotora,
  limit = 100,
  offset = 0
} = {}) {
  const query = db("nexxo_commissions").orderBy("created_at", "desc");

  if (referencia) {
    query.where("referencia", referencia);
  }
  if (produto) {
    query.where("produto", produto);
  }
  if (promotora) {
    query.where("promotora", promotora);
  }

  const rows = await query.limit(ensurePositiveInt(limit, 100)).offset(ensurePositiveInt(offset, 0));

  return rows.map((row) => ({
    id: row.id,
    referencia: row.referencia,
    promotora: row.promotora,
    produto: row.produto,
    valor: ensureNumber(row.valor, 0),
    payload: row.payload,
    criadoEm: row.created_at
  }));
}
