// === JD CRED VIP — Camada de banco de dados ===
import knex from "knex";
import { env } from "./env.js";

const connection = {
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password
};

if (env.db.ssl) {
  connection.ssl = { rejectUnauthorized: false };
}

export const db = knex({
  client: env.db.client,
  connection,
  pool: {
    min: env.db.poolMin,
    max: env.db.poolMax
  },
  migrations: {
    tableName: "knex_migrations"
  }
});

export async function ensureDatabase() {
  const hasMetaPublication = await db.schema.hasTable("meta_publications");

  if (!hasMetaPublication) {
    await db.schema.createTable("meta_publications", (table) => {
      table.increments("id").primary();
      table.string("titulo").notNullable();
      table.date("data_referencia").notNullable();
      table.string("publicado_por").notNullable();
      table.integer("total_contratos").unsigned().defaultTo(0);
      table.decimal("volume_bruto", 15, 2).defaultTo(0);
      table.decimal("volume_liquido", 15, 2).defaultTo(0);
      table.decimal("comissao_total", 15, 2).defaultTo(0);
      if (env.db.client === "pg") {
        table.jsonb("metadata");
      } else {
        table.json("metadata");
      }
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.unique(["data_referencia", "titulo"]);
    });
  }

  const hasMetaProducts = await db.schema.hasTable("meta_products");

  if (!hasMetaProducts) {
    await db.schema.createTable("meta_products", (table) => {
      table.increments("id").primary();
      table
        .integer("meta_id")
        .unsigned()
        .references("id")
        .inTable("meta_publications")
        .onDelete("CASCADE");
      table.string("produto").notNullable();
      table.integer("quantidade").unsigned().defaultTo(0);
      table.decimal("volume_bruto", 15, 2).defaultTo(0);
      table.decimal("volume_liquido", 15, 2).defaultTo(0);
      table.decimal("comissao", 15, 2).defaultTo(0);
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.index(["meta_id", "produto"], "meta_products_idx_meta_produto");
    });
  }
}

export async function closeDatabase() {
  await db.destroy();
}
