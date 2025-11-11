// === JD CRED VIP — Camada de banco de dados ===
import knex from "knex";
import { env } from "./env.js";

const isPostgres = env.db.client === "pg";

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

const addUuidPrimary = (table, column = "id") => {
  if (isPostgres) {
    table.uuid(column).primary().defaultTo(db.raw("gen_random_uuid()"));
  } else {
    table.string(column, 36).primary();
  }
};

const timestampColumn = (table, column, useDefault = true) => {
  const builder = table.timestamp(column, { useTz: isPostgres });
  if (useDefault) {
    builder.defaultTo(db.fn.now());
  }
  return builder;
};

export async function ensureDatabase() {
  if (isPostgres) {
    await db.raw("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  }

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

  const metaHasUpdatedAt = await db.schema.hasColumn("meta_publications", "updated_at");
  if (!metaHasUpdatedAt) {
    await db.schema.alterTable("meta_publications", (table) => {
      timestampColumn(table, "updated_at");
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

  const hasImportedReports = await db.schema.hasTable("imported_reports");

  if (!hasImportedReports) {
    await db.schema.createTable("imported_reports", (table) => {
      table.increments("id").primary();
      table.string("filename").notNullable();
      table.string("promotora").defaultTo("Desconhecida");
      table.integer("total_registros").unsigned().defaultTo(0);
      table.decimal("volume_total", 15, 2).defaultTo(0);
      table.decimal("comissao_total", 15, 2).defaultTo(0);
      if (env.db.client === "pg") {
        table.jsonb("metadata");
      } else {
        table.json("metadata");
      }
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.index(["promotora", "created_at"], "imported_reports_promotora_idx");
    });
  }

  const hasCmsPosts = await db.schema.hasTable("cms_posts");

  if (!hasCmsPosts) {
    await db.schema.createTable("cms_posts", (table) => {
      table.increments("id").primary();
      table.string("title").notNullable();
      table.string("slug").notNullable().unique();
      table.text("excerpt");
      table.text("content");
      table.string("status").notNullable().defaultTo("draft");
      table.timestamp("scheduled_for");
      if (env.db.client === "pg") {
        table.jsonb("metadata");
      } else {
        table.json("metadata");
      }
      table.timestamp("published_at");
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
      table.index(["status", "scheduled_for"], "cms_posts_status_idx");
    });
  }

  const hasFollowups = await db.schema.hasTable("crm_followups");

  if (!hasFollowups) {
    await db.schema.createTable("crm_followups", (table) => {
      table.increments("id").primary();
      table.string("cliente_nome").notNullable();
      table.string("cliente_documento");
      table.string("contato");
      table.string("responsavel");
      table.string("status").notNullable().defaultTo("pendente");
      table.string("origem").defaultTo("manual");
      table.string("resultado");
      table.text("descricao");
      table.timestamp("data_agendada");
      table.timestamp("concluido_em");
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
      table.index(["status", "data_agendada"], "crm_followups_status_data_idx");
      table.index(["responsavel"], "crm_followups_responsavel_idx");
    });
  }

  const hasBanks = await db.schema.hasTable("crm_bancos");

  if (!hasBanks) {
    await db.schema.createTable("crm_bancos", (table) => {
      table.increments("id").primary();
      table.string("nome").notNullable();
      table.string("apelido");
      table.string("codigo");
      table.decimal("taxa_media", 10, 4);
      table.boolean("ativo").defaultTo(true);
      if (env.db.client === "pg") {
        table.jsonb("metadata");
      } else {
        table.json("metadata");
      }
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
      table.index(["nome"], "crm_bancos_nome_idx");
    });
  }

  const hasPromoters = await db.schema.hasTable("crm_promotoras");

  if (!hasPromoters) {
    await db.schema.createTable("crm_promotoras", (table) => {
      table.increments("id").primary();
      table.string("nome").notNullable();
      table.string("documento");
      table.string("responsavel");
      table.string("contato");
      table.string("status").defaultTo("ativo");
      if (env.db.client === "pg") {
        table.jsonb("metadata");
      } else {
        table.json("metadata");
      }
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
      table.index(["status", "nome"], "crm_promotoras_status_nome_idx");
    });
  }

  const hasProducts = await db.schema.hasTable("crm_produtos");

  if (!hasProducts) {
    await db.schema.createTable("crm_produtos", (table) => {
      table.increments("id").primary();
      table.string("nome").notNullable();
      table.string("tipo").defaultTo("generico");
      table.integer("banco_id").unsigned();
      table.integer("promotora_id").unsigned();
      table.decimal("taxa_media", 10, 4);
      table.decimal("comissao_percent", 10, 4);
      table.boolean("ativo").defaultTo(true);
      if (env.db.client === "pg") {
        table.jsonb("metadata");
      } else {
        table.json("metadata");
      }
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
      table
        .foreign("banco_id")
        .references("crm_bancos.id")
        .onDelete("SET NULL");
      table
        .foreign("promotora_id")
        .references("crm_promotoras.id")
        .onDelete("SET NULL");
      table.index(["nome"], "crm_produtos_nome_idx");
      table.index(["tipo", "ativo"], "crm_produtos_tipo_idx");
    });
  }

  const hasActivityLogs = await db.schema.hasTable("activity_logs");

  if (!hasActivityLogs) {
    await db.schema.createTable("activity_logs", (table) => {
      table.increments("id").primary();
      table.string("request_id", 64).notNullable();
      table.string("source", 64);
      table.string("route", 255).notNullable();
      table.string("method", 16).notNullable();
      table.string("user_id", 120);
      table.string("user_role", 64);
      table.string("username", 120);
      table.integer("status_code");
      table.integer("duration_ms");
      table.boolean("success").notNullable().defaultTo(false);
      table.string("message", 512);
      table.text("payload_preview");
      table.string("ip", 64);
      table.string("user_agent", 255);
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.index(["route", "created_at"], "activity_logs_route_idx");
      table.index(["user_id", "created_at"], "activity_logs_user_idx");
      table.index(["created_at"], "activity_logs_created_idx");
    });
  }

  const hasImportedRecords = await db.schema.hasTable("imported_records");

  if (!hasImportedRecords) {
    await db.schema.createTable("imported_records", (table) => {
      table.increments("id").primary();
      table.string("fonte").notNullable().defaultTo("desconhecida");
      table.string("origem");
      table.string("arquivo");
      table.string("source_file");
      table.string("import_batch_id");
      table.string("promotora");
      table.string("cliente_nome");
      table.string("documento");
      table.string("telefone");
      table.string("produto");
      table.string("convenio");
      table.string("contrato");
      table.string("contrato_ade");
      table.string("banco");
      table.string("status");
      table.string("status_comercial");
      table.string("situacao");
      table.timestamp("ultimo_contato");
      table.timestamp("proximo_contato");
      table.integer("dias_ate_followup");
      table.timestamp("data_operacao");
      table.timestamp("data_pagamento");
      table.decimal("volume_bruto", 15, 2).defaultTo(0);
      table.decimal("volume_liquido", 15, 2).defaultTo(0);
      table.decimal("comissao_valor", 15, 2).defaultTo(0);
      table.decimal("comissao_percentual", 10, 6);
      table.decimal("comissao_liquida", 15, 2).defaultTo(0);
      table.string("origem_comissao");
      table.string("situacao_comissao");
      table.text("observacoes_estrategicas");
      table.string("resultado");
      table.string("motivo_perda");
      if (env.db.client === "pg") {
        table.jsonb("raw");
      } else {
        table.json("raw");
      }
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.timestamp("updated_at").defaultTo(db.fn.now());
      table.index(["promotora"], "imported_records_promotora_idx");
      table.index(["documento"], "imported_records_documento_idx");
      table.index(["contrato"], "imported_records_contrato_idx");
      table.index(["import_batch_id"], "imported_records_batch_idx");
    });
  }

  await ensureImportedRecordsColumns();

  const hasImportHistory = await db.schema.hasTable("import_history");

  if (!hasImportHistory) {
    await db.schema.createTable("import_history", (table) => {
      table.increments("id").primary();
      table.string("arquivo").notNullable();
      table.string("promotora");
      table.integer("registros").unsigned().defaultTo(0);
      table.decimal("volume_bruto", 15, 2).defaultTo(0);
      table.decimal("volume_liquido", 15, 2).defaultTo(0);
      table.decimal("comissao", 15, 2).defaultTo(0);
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.index(["promotora", "created_at"], "import_history_promotora_idx");
    });
  }

  const hasClientes = await db.schema.hasTable("clientes");

  if (!hasClientes) {
    await db.schema.createTable("clientes", (table) => {
      table.increments("id").primary();
      table.string("nome").notNullable();
      table.string("documento").unique();
      table.string("telefone");
      table.string("origem");
      table.decimal("volume_liquido_total", 15, 2).defaultTo(0);
      table.decimal("volume_bruto_total", 15, 2).defaultTo(0);
      table.decimal("comissao_total", 15, 2).defaultTo(0);
      table.integer("total_contratos").unsigned().defaultTo(0);
      table.timestamp("ultima_atualizacao");
      table.timestamp("created_at").defaultTo(db.fn.now());
      table.index(["documento"], "clientes_documento_idx");
      table.index(["nome"], "clientes_nome_idx");
    });
  }

  const hasContratos = await db.schema.hasTable("contratos");

  if (!hasContratos) {
    await db.schema.createTable("contratos", (table) => {
      table.increments("id").primary();
      table
        .integer("cliente_id")
        .unsigned()
        .references("clientes.id")
        .onDelete("SET NULL");
      table.string("produto");
      table.string("promotora");
      table.string("banco");
      table.string("contrato").unique();
      table.string("status");
      table.decimal("volume_bruto", 15, 2).defaultTo(0);
      table.decimal("volume_liquido", 15, 2).defaultTo(0);
      table.decimal("comissao_valor", 15, 2).defaultTo(0);
      timestampColumn(table, "data_operacao", false);
      timestampColumn(table, "created_at");
      timestampColumn(table, "updated_at");
      table.index(["cliente_id"], "contratos_cliente_idx");
      table.index(["promotora"], "contratos_promotora_idx");
      table.index(["produto"], "contratos_produto_idx");
    });
  } else {
    const hasUpdatedAt = await db.schema.hasColumn("contratos", "updated_at");
    if (!hasUpdatedAt) {
      await db.schema.alterTable("contratos", (table) => {
        timestampColumn(table, "updated_at");
      });
    }
  }

  await ensureSupabaseCompatibilityTables();
  await ensureDashboardViews();
}

export async function closeDatabase() {
  await db.destroy();
}

async function ensureDashboardViews() {
  const resumoView = `
    CREATE OR REPLACE VIEW dashboard_resumo AS
    SELECT
      COALESCE(SUM(volume_liquido), 0) AS volume_total,
      COALESCE(SUM(comissao_valor), 0) AS comissao_total,
      COUNT(*) AS qtd_contratos
    FROM imported_records
  `;

  const rankingView = `
    CREATE OR REPLACE VIEW dashboard_ranking AS
    SELECT 'promotora' AS tipo,
           COALESCE(promotora, 'Desconhecida') AS chave,
           COALESCE(SUM(volume_liquido), 0) AS volume_liq,
           COALESCE(SUM(comissao_valor), 0) AS comissao,
           COUNT(*) AS qtd
    FROM imported_records
    GROUP BY 1, 2
    UNION ALL
    SELECT 'produto' AS tipo,
           COALESCE(produto, 'Desconhecido') AS chave,
           COALESCE(SUM(volume_liquido), 0) AS volume_liq,
           COALESCE(SUM(comissao_valor), 0) AS comissao,
           COUNT(*) AS qtd
    FROM imported_records
    GROUP BY 1, 2
  `;

  await db.raw(resumoView);
  await db.raw(rankingView);
}

async function ensureImportedRecordsColumns() {
  const columns = [
    ["origem", (table) => table.string("origem")],
    ["source_file", (table) => table.string("source_file")],
    ["import_batch_id", (table) => table.string("import_batch_id")],
    ["telefone", (table) => table.string("telefone")],
    ["convenio", (table) => table.string("convenio")],
    ["contrato_ade", (table) => table.string("contrato_ade")],
    ["status_comercial", (table) => table.string("status_comercial")],
    ["situacao", (table) => table.string("situacao")],
    ["ultimo_contato", (table) => timestampColumn(table, "ultimo_contato", false)],
    ["proximo_contato", (table) => timestampColumn(table, "proximo_contato", false)],
    ["dias_ate_followup", (table) => table.integer("dias_ate_followup")],
    ["data_pagamento", (table) => timestampColumn(table, "data_pagamento", false)],
    ["comissao_liquida", (table) => table.decimal("comissao_liquida", 15, 2).defaultTo(0)],
    ["origem_comissao", (table) => table.string("origem_comissao")],
    ["situacao_comissao", (table) => table.string("situacao_comissao")],
    ["observacoes_estrategicas", (table) => table.text("observacoes_estrategicas")],
    ["resultado", (table) => table.string("resultado")],
    ["motivo_perda", (table) => table.string("motivo_perda")],
    ["updated_at", (table) => timestampColumn(table, "updated_at")],
    ["data_operacao", (table) => timestampColumn(table, "data_operacao", false)],
    ["comissao_percentual", (table) => table.decimal("comissao_percentual", 10, 6)]
  ];

  for (const [column, builder] of columns) {
    const exists = await db.schema.hasColumn("imported_records", column);
    if (!exists) {
      await db.schema.alterTable("imported_records", (table) => {
        builder(table);
      });
    }
  }
}

async function ensureSupabaseCompatibilityTables() {
  if (!(await db.schema.hasTable("analise_extrato_inss"))) {
    await db.schema.createTable("analise_extrato_inss", (table) => {
      addUuidPrimary(table);
      table.text("nome_cliente").notNullable();
      table.text("cpf").notNullable();
      table.date("data_nascimento");
      table.text("arquivo_pdf_url");
      table.text("nome_arquivo");
      timestampColumn(table, "data_upload");
      table.text("banco");
      table.text("contrato");
      table.text("tipo_operacao");
      table.date("data_inicio");
      table.date("data_fim");
      table.integer("prazo_meses");
      table.decimal("valor_parcela", 18, 2);
      table.decimal("valor_liberado", 18, 2);
      table.decimal("valor_total", 18, 2);
      table.decimal("taxa_juros", 10, 4);
      table.decimal("margem_comprometida", 10, 4);
      table.decimal("margem_livre", 10, 4);
      table.text("situacao_atual");
      table.text("recomendacao");
      table.text("justificativa");
      table.integer("prioridade").defaultTo(0);
      table.text("status_analise").defaultTo("pendente");
      table.timestamp("data_analise", { useTz: isPostgres });
      table.text("analisado_por").defaultTo("Codex Agent");
      table.text("observacoes");
      table.uuid("id_cliente");
      table.text("origem").defaultTo("upload_pdf");
      timestampColumn(table, "created_at");
      timestampColumn(table, "updated_at");
    });
  }

  const simpleImportTables = [
    "bolsa_familia",
    "clt_trabalhador",
    "conta_luz",
    "credito_pessoal",
    "fgts_saque_aniversario",
    "inss"
  ];

  for (const tableName of simpleImportTables) {
    if (!(await db.schema.hasTable(tableName))) {
      await db.schema.createTable(tableName, (table) => {
        addUuidPrimary(table);
        table.text("nome_do_cliente");
        table.text("cpf");
        table.text("telefone");
        table.text("produto");
        table.text("convenio");
        table.text("banco");
        table.double("volume_bruto_r");
        table.double("volume_liquido_r");
        table.text("status_comercial");
        table.bigInteger("ultimo_contato");
        table.double("proximo_contato");
        table.bigInteger("dias_ate_o_follow_up");
        table.text("situacao");
        table.double("comissao_liquida");
        table.bigInteger("data_do_pagamento");
        table.text("origem_comissao");
        table.text("situacao_comissao");
        table.text("observacoes_estrategicas");
        table.text("promotora");
        table.text("contrato_ade");
        table.text("resultado_fechado_nao_fechado");
        table.text("motivo_da_perda_observacoes_estrategicas");
      });
    }
  }

  if (!(await db.schema.hasTable("carteira_triagem_historico"))) {
    await db.schema.createTable("carteira_triagem_historico", (table) => {
      addUuidPrimary(table);
      table.double("data_hora");
      table.text("nome_do_cliente");
      table.text("telefone");
      table.text("estado");
      table.text("concessionaria");
      table.text("renda_beneficio");
      table.text("classificacao_inss_clt_ba");
      table.text("produto_recomendado");
      table.text("limite_estimado_r");
      table.double("comissao");
      table.double("comissao_estimada_r");
      table.text("upsell_sugerido");
      table.text("status_atendimento_apto_nao_apto");
      table.text("resultado_final_fechado_nao_fechado");
      table.text("motivo_da_perda");
      table.text("retorno_agendado_data");
      table.text("observacoes_comerciais");
    });
  }

  if (!(await db.schema.hasTable("follow_ups"))) {
    await db.schema.createTable("follow_ups", (table) => {
      addUuidPrimary(table);
      table.text("nome_do_cliente");
      table.text("cpf");
      table.bigInteger("telefone");
      table.text("produto");
      table.text("convenio");
      table.bigInteger("ultimo_contato");
      table.double("proximo_contato");
      table.text("situacao");
      table.text("status_comercial");
      table.text("observacoes");
    });
  }

  if (!(await db.schema.hasTable("ranking_base"))) {
    await db.schema.createTable("ranking_base", (table) => {
      addUuidPrimary(table);
      table.text("cpf");
      table.text("nome_do_cliente");
      table.bigInteger("ano");
      table.bigInteger("qtde_contratos");
      table.double("volume_total_r");
      table.text("banco_mais_freq");
      table.text("produtos_contratados");
    });
  }
}
