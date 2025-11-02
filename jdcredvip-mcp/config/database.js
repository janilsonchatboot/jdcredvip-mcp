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

  const hasCrefaz = await db.schema.hasTable("crefaz_proposals");

  if (!hasCrefaz) {
    await db.schema.createTable("crefaz_proposals", (table) => {
      table.increments("id").primary();
      table.string("cliente_nome").notNullable();
      table.string("cliente_documento").notNullable();
      table.string("produto").notNullable();
      table.decimal("valor_solicitado", 15, 2).notNullable();
      table.decimal("valor_liquido", 15, 2).notNullable();
      table.integer("prazo").unsigned().notNullable();
      table.string("promotora").notNullable();
      table.string("status").notNullable().defaultTo("simulado");
      table.string("esteira_url");
      if (env.db.client === "pg") {
        table.jsonb("dados_simulacao");
        table.jsonb("dados_contrato");
      } else {
        table.json("dados_simulacao");
        table.json("dados_contrato");
      }
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
      table.index(["status", "promotora"], "crefaz_idx_status_promotora");
    });
  }

  const hasNexxoContracts = await db.schema.hasTable("nexxo_contracts");

  if (!hasNexxoContracts) {
    await db.schema.createTable("nexxo_contracts", (table) => {
      table.increments("id").primary();
      table.string("contrato_id").notNullable();
      table.string("cliente_nome").notNullable();
      table.string("produto").notNullable();
      table.string("status").notNullable();
      table.decimal("valor_bruto", 15, 2).defaultTo(0);
      table.decimal("valor_liquido", 15, 2).defaultTo(0);
      table.string("promotora").notNullable();
      table.date("data_contratacao");
      if (env.db.client === "pg") {
        table.jsonb("payload");
      } else {
        table.json("payload");
      }
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
      table.unique(["contrato_id"], "nexxo_contracts_contrato_unique");
      table.index(["promotora", "status"], "nexxo_contracts_promotora_status");
    });
  }

  const hasNexxoCommissions = await db.schema.hasTable("nexxo_commissions");

  if (!hasNexxoCommissions) {
    await db.schema.createTable("nexxo_commissions", (table) => {
      table.increments("id").primary();
      table.string("referencia").notNullable();
      table.string("promotora").notNullable();
      table.string("produto").notNullable();
      table.decimal("valor", 15, 2).defaultTo(0);
      if (env.db.client === "pg") {
        table.jsonb("payload");
      } else {
        table.json("payload");
      }
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.unique(["referencia", "promotora", "produto"], "nexxo_commissions_unique_ref");
    });
  }

  const hasIntegrationLogs = await db.schema.hasTable("integration_logs");

  if (!hasIntegrationLogs) {
    await db.schema.createTable("integration_logs", (table) => {
      table.increments("id").primary();
      table.string("integracao").notNullable();
      table.string("acao").notNullable();
      table.string("status").notNullable();
      table.text("mensagem");
      if (env.db.client === "pg") {
        table.jsonb("detalhes");
      } else {
        table.json("detalhes");
      }
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.index(["integracao", "status"], "integration_logs_idx_integracao_status");
    });
  }
}

export async function closeDatabase() {
  await db.destroy();
}
