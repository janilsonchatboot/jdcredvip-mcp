const normaliza = (texto = "") =>
  `${texto}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const PROFILE_RULES = [
  {
    check: (perfil = {}) => perfil.isBA,
    result: {
      produtoIdeal: "Crédito Bolsa Família",
      limiteEstimado: 750,
      comissaoPercent: 0.09,
      upsell: "Conta de Luz"
    }
  },
  {
    check: (perfil = {}) => perfil.isINSS,
    result: {
      produtoIdeal: "INSS Consignado",
      limiteEstimado: 15000,
      comissaoPercent: 0.17,
      upsell: "Portabilidade + Refin"
    }
  },
  {
    check: (perfil = {}) => perfil.isCLT,
    result: {
      produtoIdeal: "Crédito Trabalhador CLT",
      limiteEstimado: 20000,
      comissaoPercent: 0.1,
      upsell: "FGTS / Conta de Luz"
    }
  }
];

const PRODUCT_RULES = [
  {
    check: (_perfil, produtoNormalizado) => produtoNormalizado.includes("fgts"),
    result: {
      produtoIdeal: "FGTS Saque-Aniversário",
      limiteEstimado: 5000,
      comissaoPercent: 0.12,
      upsell: "Conta de Luz"
    }
  }
];

const FALLBACK_RULE = {
  result: {
    produtoIdeal: "Crédito Pessoal Seguro",
    limiteEstimado: 1000,
    comissaoPercent: 0.08,
    upsell: ""
  }
};

const findRule = (perfil, produtoNormalizado, possuiPerfil) =>
  PROFILE_RULES.find(({ check }) => check(perfil)) ??
  PRODUCT_RULES.find(({ check }) => check(perfil, produtoNormalizado)) ??
  (!possuiPerfil ? FALLBACK_RULE : null);

export const triageClient = ({
  nome = "",
  produtoInformado = "",
  volumeLiquido = 0,
  perfil = {}
} = {}) => {
  const nomeLimpo = `${nome}`.trim();
  const produtoNormalizado = normaliza(produtoInformado);
  const possuiPerfil = Boolean(perfil?.isBA || perfil?.isINSS || perfil?.isCLT);

  const alertas = [];

  if (!nomeLimpo) {
    alertas.push("Informe o nome do cliente para registrar no CRM.");
  }

  if (!possuiPerfil && !produtoNormalizado) {
    alertas.push("Defina o perfil (INSS, Bolsa Família, CLT) ou o produto desejado.");
  }

  const regraAplicada = findRule(perfil, produtoNormalizado, possuiPerfil);
  const produtoIdealCalculado =
    regraAplicada?.result.produtoIdeal || produtoInformado.trim() || "Análise pendente";
  const limiteEstimadoCalculado = regraAplicada?.result.limiteEstimado ?? 0;
  const comissaoPercentual = regraAplicada?.result.comissaoPercent ?? 0;
  const upsellSugerido = regraAplicada?.result.upsell ?? "";

  const volume = Number(volumeLiquido) || 0;
  const comissaoEstimada = Number((volume * comissaoPercentual).toFixed(2));

  return {
    nome: nomeLimpo,
    produtoIdeal: produtoIdealCalculado,
    motivo: alertas.length ? alertas.join(" | ") : "OK",
    limiteEstimado: limiteEstimadoCalculado,
    comissaoPercent: comissaoPercentual,
    comissaoEstimada,
    upsell: upsellSugerido,
    status: alertas.length ? "⚠️ Revisar" : "✅ Apto"
  };
};

export default triageClient;
