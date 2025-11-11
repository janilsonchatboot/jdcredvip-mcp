// === JD CRED VIP — Serviços de Metas e Indicadores ===
import { db } from "#core/database.js";
import { env } from "#core/env.js";
import { createTtlCache } from "#utils/cache.js";
import { invalidateDashboardInsightsCache } from "../dashboard/dashboard.service.js";

const isPostgres = env.db.client === "pg";
const latestMetaCache = createTtlCache({ ttlMs: 10 * 60 * 1000 });

const decimalToNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const normalized = Number(value);
  return Number.isNaN(normalized) ? 0 : normalized;
};

const toOptionalNumber = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = parseFloat(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : undefined;
};

const mapMetaRow = (row) => {
  let metadata = row.metadata ?? null;

  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch (_error) {
      metadata = row.metadata;
    }
  }

  const volumeImportado =
    metadata?.volumeImportado ?? metadata?.volume_importado ?? metadata?.importVolume ?? null;
  const comissaoImportada =
    metadata?.comissaoImportada ?? metadata?.comissao_importada ?? metadata?.commissionImported ?? null;
  const promotorasAtivas =
    metadata?.promotorasAtivas ?? metadata?.promotoras_ativas ?? metadata?.activePromoters ?? null;

  return {
    id: row.id,
    titulo: row.titulo,
    dataReferencia: row.data_referencia,
    publicadoPor: row.publicado_por,
    metrics: {
      totalContratos: Number(row.total_contratos || 0),
      volumeBruto: decimalToNumber(row.volume_bruto),
      volumeLiquido: decimalToNumber(row.volume_liquido),
      comissaoTotal: decimalToNumber(row.comissao_total),
      volumeImportado: toOptionalNumber(volumeImportado),
      comissaoImportada: toOptionalNumber(comissaoImportada),
      promotorasAtivas: toOptionalNumber(promotorasAtivas)
    },
    metadata,
    createdAt: row.created_at
  };
};

const mapProductRow = (row) => ({
  id: row.id,
  metaId: row.meta_id,
  produto: row.produto,
  quantidade: Number(row.quantidade || 0),
  volumeBruto: decimalToNumber(row.volume_bruto),
  volumeLiquido: decimalToNumber(row.volume_liquido),
  comissao: decimalToNumber(row.comissao),
  createdAt: row.created_at
});

export async function publishMeta(data) {
  return db.transaction(async (trx) => {
    const metaPayload = {
      titulo: data.titulo,
      data_referencia: data.dataReferencia,
      publicado_por: data.publicadoPor,
      total_contratos: data.metrics.totalContratos,
      volume_bruto: data.metrics.volumeBruto,
      volume_liquido: data.metrics.volumeLiquido,
      comissao_total: data.metrics.comissaoTotal,
      metadata: data.metadata || null
    };

    let metaId;

    if (isPostgres) {
      const [row] = await trx("meta_publications").insert(metaPayload).returning(["id"]);
      metaId = row.id;
    } else {
      const [id] = await trx("meta_publications").insert(metaPayload);
      metaId = id;
    }

    if (data.products?.length) {
      const productRows = data.products.map((product) => ({
        meta_id: metaId,
        produto: product.produto,
        quantidade: product.quantidade,
        volume_bruto: product.volumeBruto,
        volume_liquido: product.volumeLiquido,
        comissao: product.comissao
      }));

      await trx("meta_products").insert(productRows);
    }

    const meta = await trx("meta_publications").where({ id: metaId }).first();
    const products = await trx("meta_products").where({ meta_id: metaId }).orderBy("produto", "asc");

    const resultado = {
      meta: mapMetaRow(meta),
      products: products.map(mapProductRow)
    };

    latestMetaCache.clear();
    invalidateDashboardInsightsCache();

    return resultado;
  });
}

export async function getLatestDashboard() {
  const cached = latestMetaCache.get("latest");
  if (cached) {
    return cached;
  }

  const meta = await db("meta_publications").orderBy("data_referencia", "desc").orderBy("created_at", "desc").first();

  if (!meta) {
    return null;
  }

  const products = await db("meta_products").where({ meta_id: meta.id }).orderBy("produto", "asc");

  const payload = {
    meta: mapMetaRow(meta),
    products: products.map(mapProductRow)
  };

  latestMetaCache.set("latest", payload);
  return payload;
}

export async function listMetas(limit = 20, offset = 0) {
  const metas = await db("meta_publications")
    .orderBy("data_referencia", "desc")
    .orderBy("created_at", "desc")
    .limit(limit)
    .offset(offset);

  return metas.map(mapMetaRow);
}

export async function getMetaById(id) {
  const meta = await db("meta_publications").where({ id }).first();
  if (!meta) return null;

  const products = await db("meta_products").where({ meta_id: id }).orderBy("produto", "asc");

  return {
    meta: mapMetaRow(meta),
    products: products.map(mapProductRow)
  };
}

export async function saveOrUpdateMeta(metaId, data) {
  if (!metaId) {
    const error = new Error("Identificador da meta é obrigatório.");
    error.status = 400;
    throw error;
  }

  return db.transaction(async (trx) => {
    const exists = await trx("meta_publications").where({ id: metaId }).first();
    if (!exists) {
      const error = new Error("Meta nao encontrada.");
      error.status = 404;
      throw error;
    }

    const metaPayload = {
      titulo: data.titulo,
      data_referencia: data.dataReferencia,
      publicado_por: data.publicadoPor,
      total_contratos: data.metrics.totalContratos,
      volume_bruto: data.metrics.volumeBruto,
      volume_liquido: data.metrics.volumeLiquido,
      comissao_total: data.metrics.comissaoTotal,
      metadata: data.metadata || null,
      updated_at: trx.fn.now()
    };

    await trx("meta_publications").where({ id: metaId }).update(metaPayload);
    await trx("meta_products").where({ meta_id: metaId }).del();

    if (data.products?.length) {
      const productRows = data.products.map((product) => ({
        meta_id: metaId,
        produto: product.produto,
        quantidade: product.quantidade,
        volume_bruto: product.volumeBruto,
        volume_liquido: product.volumeLiquido,
        comissao: product.comissao
      }));

      await trx("meta_products").insert(productRows);
    }

    const meta = await trx("meta_publications").where({ id: metaId }).first();
    const products = await trx("meta_products").where({ meta_id: metaId }).orderBy("produto", "asc");

    latestMetaCache.clear();
    invalidateDashboardInsightsCache();

    return {
      meta: mapMetaRow(meta),
      products: products.map(mapProductRow)
    };
  });
}
