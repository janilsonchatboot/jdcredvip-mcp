import { normalizeKey } from "./utils/ptbr.js";

const alias = (...items) => new Set(items.map((item) => normalizeKey(item)));

export const COLUMN_ALIASES = {
  cliente: alias(
    "cliente",
    "nome",
    "nomecliente",
    "nome_cliente",
    "nome do cliente",
    "seller",
    "beneficiario"
  ),
  documento: alias(
    "cpf",
    "cnpj",
    "documento",
    "cpf_cliente",
    "cpfcliente",
    "cliente_cpf",
    "documento_cliente"
  ),
  contrato: alias("contrato", "contrato_id", "idcontrato", "numero_contrato", "contratoid"),
  contratoAde: alias(
    "contrato_ade",
    "contrato ade",
    "numero_ade",
    "ade",
    "auto",
    "numero"
  ),
  produto: alias(
    "produto",
    "produto_financeiro",
    "modalidade",
    "produto credito",
    "linha",
    "produto_nome"
  ),
  promotora: alias("promotora", "promoter", "parceiro", "origem", "empresa", "canal", "parceria"),
  banco: alias("banco", "instituicao", "instituicao_financeira", "banco_destino", "financeira"),
  status: alias("status", "situacao", "etapa", "fase", "statuscontrato"),
  valorLiquido: alias(
    "valor_liquido",
    "valorliquido",
    "valor liquido",
    "vl_liquido",
    "valor creditado",
    "valorcliente",
    "valor_cliente",
    "valor_pagamento",
    "valorcontrato"
  ),
  valorBruto: alias(
    "valor_bruto",
    "valorbruto",
    "valor bruto",
    "vl_bruto",
    "valor total",
    "valor_total",
    "valor liberado"
  ),
  comissao: alias(
    "comissao",
    "valorcomissao",
    "valor_comissao",
    "comissao_total",
    "vl_comissao",
    "percentual_comissao",
    "taxa_comissao",
    "comissao_liquida"
  ),
  dataReferencia: alias(
    "data",
    "data_contratacao",
    "data pagamento",
    "data_pagamento",
    "datareferencia",
    "data_da_operacao",
    "dt_ref",
    "dtpagamento"
  )
};

const PROMOTORA_OVERRIDES = {
  nexxo: {
    nome: "Nexxo",
    aliases: alias("nexxo", "nx", "nxx"),
    produtoAlias: alias("produto", "produto_nexxo", "modalidade"),
    statusAlias: alias("status", "status_nexxo", "statusatual")
  },
  workbank: {
    nome: "WorkBank",
    aliases: alias("workbank", "work bank", "work-bank", "wb"),
    produtoAlias: alias("produto", "linha", "produto_work"),
    statusAlias: alias("status", "situacao", "fase_workbank")
  },
  yuppie: {
    nome: "Yuppie",
    aliases: alias("yuppie"),
    produtoAlias: alias("produto", "linha"),
    statusAlias: alias("status", "etapa", "andamento")
  }
};

export const PROMOTORA_LIST = Object.values(PROMOTORA_OVERRIDES).map((item) => item.nome);

export const matchPromotoraAlias = (value = "") => {
  const key = normalizeKey(value);
  if (!key) return null;

  for (const override of Object.values(PROMOTORA_OVERRIDES)) {
    if (override.aliases.has(key)) {
      return override.nome;
    }
  }

  return null;
};

export const getPromotoraOverrides = (promotoraNome = "") => {
  const normalized = normalizeKey(promotoraNome);
  for (const override of Object.values(PROMOTORA_OVERRIDES)) {
    if (normalizeKey(override.nome) === normalized) {
      return override;
    }
  }
  return null;
};
