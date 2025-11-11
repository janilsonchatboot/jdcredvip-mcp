import { normalizeKey, normalizeText, parseDateValue } from "#importers/utils/ptbr.js";

const PRODUCT_LABELS = {
  INSS: "INSS",
  FGTS: "FGTS - Saque-aniversario",
  CLT: "Trabalhador CLT",
  BOLSA: "Bolsa Familia",
  LUZ: "Conta de Luz",
  PESSOAL: "Credito Pessoal"
};

const FOLLOWUP_PARAM_MAP = {
  [PRODUCT_LABELS.INSS]: "INSS",
  [PRODUCT_LABELS.FGTS]: "FGTS_SAQUE_ANIVERSARIO",
  [PRODUCT_LABELS.CLT]: "TRABALHADOR_CLT",
  [PRODUCT_LABELS.BOLSA]: "BOLSA_FAMILIA",
  [PRODUCT_LABELS.LUZ]: "CONTA_DE_LUZ",
  [PRODUCT_LABELS.PESSOAL]: "CREDITO_PESSOAL"
};

const COMMISSION_PARAM_MAP = {
  [PRODUCT_LABELS.INSS]: "COMISSAO_INSS",
  [PRODUCT_LABELS.FGTS]: "COMISSAO_FGTS",
  [PRODUCT_LABELS.CLT]: "COMISSAO_TRABALHADOR_CLT",
  [PRODUCT_LABELS.BOLSA]: "COMISSAO_BOLSA_FAMILIA",
  [PRODUCT_LABELS.LUZ]: "COMISSAO_CONTA_DE_LUZ",
  [PRODUCT_LABELS.PESSOAL]: "COMISSAO_CREDITO_PESSOAL"
};

const DEFAULT_BUSINESS_PARAMS = {
  PADRAO: 90,
  INSS: 90,
  FGTS_SAQUE_ANIVERSARIO: 30,
  TRABALHADOR_CLT: 60,
  BOLSA_FAMILIA: 90,
  CONTA_DE_LUZ: 45,
  CREDITO_PESSOAL: 90,
  LIMITE_BOLSA: 750,
  LIMITE_LUZ_RN: 2100,
  LIMITE_LUZ_DEFAULT: 5000,
  COMISSAO_INSS: 0.17,
  COMISSAO_FGTS: 0.12,
  COMISSAO_TRABALHADOR_CLT: 0.1,
  COMISSAO_BOLSA_FAMILIA: 0.09,
  COMISSAO_CONTA_DE_LUZ: 0.08,
  COMISSAO_CREDITO_PESSOAL: 0.08,
  COMISSAO_DEFAULT: 0.1
};

const RAW_FIELD_ALIASES = {
  convenio: new Set(["convenio", "conv", "parcela_convenio"].map(normalizeKey)),
  tabela: new Set(["tabela", "tabela_nome", "produto_tabela"].map(normalizeKey)),
  ultimoContato: new Set(
    [
      "ultimo_contato",
      "ultimo contato",
      "last_contact",
      "lastcontact",
      "data_ultimo_contato",
      "ultimo contato realizado"
    ].map(normalizeKey)
  ),
  observacoes: new Set(
    [
      "observacoes",
      "observacoes_estrategicas",
      "observacoes estrategicas",
      "observacao",
      "obs",
      "anotacoes"
    ].map(normalizeKey)
  ),
  origemComissao: new Set(["origem_comissao", "origem comissao", "origem"].map(normalizeKey)),
  situacaoComissao: new Set(["situacao_comissao", "situacao comissao", "status_comissao"].map(normalizeKey))
};

const todayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const toText = (value) => (value === null || value === undefined ? "" : String(value));

const pickRawValue = (raw, aliasSet) => {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  for (const [key, value] of Object.entries(raw)) {
    if (aliasSet.has(normalizeKey(key))) {
      return value;
    }
  }
  return null;
};

const mergeParams = (customParams = {}) => ({
  ...DEFAULT_BUSINESS_PARAMS,
  ...(customParams || {})
});

const parseDateInput = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    if (value > 1_000_000_000_000) {
      const timestamp = new Date(value);
      return Number.isNaN(timestamp.getTime()) ? null : timestamp;
    }
    const excel = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(excel.getTime()) ? null : excel;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const iso = new Date(trimmed);
    if (!Number.isNaN(iso.getTime())) return iso;
    const parts = trimmed.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
    if (parts) {
      const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
      const parsed = new Date(`${year}-${parts[2]}-${parts[1]}`);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const isoFromUtils = parseDateValue(trimmed);
    if (isoFromUtils) {
      const viaUtils = new Date(isoFromUtils);
      if (!Number.isNaN(viaUtils.getTime())) return viaUtils;
    }
  }
  return null;
};

const sanitizeDocumento = (value) => {
  if (!value) return "0000";
  const digits = String(value).replace(/\D/g, "");
  return digits || "0000";
};

const diffInDays = (future, base = todayStart()) => {
  const a = new Date(base);
  a.setHours(0, 0, 0, 0);
  const b = new Date(future);
  b.setHours(0, 0, 0, 0);
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
};

export const classificarProdutoPorConvenio = (convenio, produto) => {
  const conv = normalizeText(convenio || "");
  const prod = normalizeText(produto || "");
  const combo = `${prod} ${conv}`.trim();

  if (!combo) {
    return null;
  }

  const contains = (value) => combo.includes(value);

  if (contains("energia") || contains("luz") || contains("fatura")) {
    return PRODUCT_LABELS.LUZ;
  }
  if (contains("bolsa") || contains("baixa renda") || conv.includes("ba") || combo.includes("cp baixa renda")) {
    return PRODUCT_LABELS.BOLSA;
  }
  if (contains("fgts")) {
    return PRODUCT_LABELS.FGTS;
  }
  if (contains("clt") || contains("trabalhador") || contains("privado")) {
    return PRODUCT_LABELS.CLT;
  }
  if (contains("inss") || conv.includes("%") || /\d+x/.test(conv) || /\d+x/.test(prod)) {
    return PRODUCT_LABELS.INSS;
  }
  if (contains("pessoal") || contains("debito em conta") || contains("credito pessoal")) {
    return PRODUCT_LABELS.PESSOAL;
  }
  return null;
};

export const classificarProdutoSmart = (dados = {}) => {
  const promotora = normalizeText(dados.promotora || dados.Promotora || "");
  const tabela = normalizeText(dados.tabela || dados.Tabela || "");
  const convenio = normalizeText(dados.convenio || dados.Convenio || "");
  const produto = normalizeText(dados.produto || dados.Produto || "");

  if (!promotora && !convenio && !produto && !tabela) {
    return null;
  }

  const has = (value) => value && value.length > 0;

  if (promotora === "yuppie") {
    if (tabela.includes("excluindo") && tabela.includes("baixa renda")) return PRODUCT_LABELS.PESSOAL;
    if (tabela.includes("energia") || tabela.includes("luz") || tabela.includes("fatura")) return PRODUCT_LABELS.LUZ;
    if (tabela.includes("baixa renda") || tabela.includes("bolsa")) return PRODUCT_LABELS.BOLSA;
    if (tabela.includes("fgts")) return PRODUCT_LABELS.FGTS;
    if (tabela.includes("clt") || tabela.includes("trabalhador") || tabela.includes("privado")) return PRODUCT_LABELS.CLT;
    if (tabela.includes("inss") || convenio.includes("%") || /\d+x/.test(convenio)) return PRODUCT_LABELS.INSS;

    const combined = `${produto} ${convenio}`;
    if (combined.includes("energia") || combined.includes("luz") || combined.includes("fatura")) return PRODUCT_LABELS.LUZ;
    if (combined.includes("baixa renda") || combined.includes("bolsa")) return PRODUCT_LABELS.BOLSA;
    if (combined.includes("fgts")) return PRODUCT_LABELS.FGTS;
    if (combined.includes("clt") || combined.includes("trabalhador") || combined.includes("privado")) return PRODUCT_LABELS.CLT;
    if (combined.includes("inss") || convenio.includes("%") || /\d+x/.test(convenio)) return PRODUCT_LABELS.INSS;
    return PRODUCT_LABELS.PESSOAL;
  }

  const resultado = classificarProdutoPorConvenio(convenio, produto);
  if (resultado) return resultado;

  if (has(produto)) {
    if (produto.includes("fgts")) return PRODUCT_LABELS.FGTS;
    if (produto.includes("clt")) return PRODUCT_LABELS.CLT;
    if (produto.includes("bolsa") || produto.includes("baixa renda")) return PRODUCT_LABELS.BOLSA;
    if (produto.includes("luz") || produto.includes("energia")) return PRODUCT_LABELS.LUZ;
    if (produto.includes("inss")) return PRODUCT_LABELS.INSS;
    if (produto.includes("pessoal")) return PRODUCT_LABELS.PESSOAL;
  }

  return null;
};

export const detectarPerfilCliente = (dados = {}) => {
  const textoBase = [
    dados.Produto,
    dados.Convenio,
    dados.Tabela,
    dados.Observacoes,
    dados.OrigemComissao,
    dados.SituacaoComissao
  ]
    .map((valor) => normalizeText(valor || ""))
    .join(" ");

  return {
    isINSS: textoBase.includes("inss") || textoBase.includes("aposent") || textoBase.includes("pension"),
    isCLT: textoBase.includes("clt") || textoBase.includes("trabalhador") || textoBase.includes("privado"),
    isBA: textoBase.includes("baixa renda") || textoBase.includes("bolsa"),
    isLOASBPC: textoBase.includes("loas") || textoBase.includes("bpc")
  };
};

export const sugerirUpsell = (abaDestino, perfil = {}) => {
  switch (abaDestino) {
    case PRODUCT_LABELS.LUZ:
      if (perfil.isINSS || perfil.isLOASBPC) return "Oferecer linha INSS (consignado, port ou cartao)";
      if (perfil.isCLT) return "Oferecer Credito do Trabalhador (CLT)";
      return "Cliente BA - manter Luz como principal";
    case PRODUCT_LABELS.CLT:
      return "Complementar: FGTS ou Conta de Luz";
    case PRODUCT_LABELS.BOLSA:
      return perfil.isLOASBPC ? "Oferecer INSS ou Credito Pessoal acima de 750" : "Complementar Luz";
    case PRODUCT_LABELS.PESSOAL:
      return perfil.isINSS || perfil.isLOASBPC ? "Portabilidade/Refin/Cartao INSS" : null;
    case PRODUCT_LABELS.FGTS:
      return "Complementar Luz ou Credito do Trabalhador (CLT)";
    default:
      return null;
  }
};

export const calcularProximoContato = (abaDestino, ultimoContato, params = {}) => {
  if (!(ultimoContato instanceof Date) || Number.isNaN(ultimoContato.getTime())) {
    return null;
  }
  const merged = mergeParams(params);
  const paramKey = FOLLOWUP_PARAM_MAP[abaDestino] || "PADRAO";
  const dias = Number(merged[paramKey] ?? merged.PADRAO ?? 90);
  const prox = new Date(ultimoContato.getTime());
  prox.setDate(prox.getDate() + (Number.isNaN(dias) ? 90 : dias));
  return prox;
};

export const getComissaoPercent = (params = {}, abaDestino, produto) => {
  const merged = mergeParams(params);
  const keysToCheck = [];
  if (abaDestino && COMMISSION_PARAM_MAP[abaDestino]) {
    keysToCheck.push(COMMISSION_PARAM_MAP[abaDestino]);
  }
  if (produto) {
    keysToCheck.push(`COMISSAO_${normalizeKey(produto).toUpperCase()}`);
  }
  keysToCheck.push("COMISSAO_DEFAULT");

  for (const key of keysToCheck) {
    const value = merged[key];
    if (value !== undefined && value !== null) {
      const numberValue = Number(value);
      if (!Number.isNaN(numberValue) && numberValue > 0) {
        return numberValue > 1 ? numberValue / 100 : numberValue;
      }
    }
  }
  return merged.COMISSAO_DEFAULT;
};

export const gerarIdUnicoParaContrato = (documento, sequencia = 1, referenceDate = new Date()) => {
  const doc = sanitizeDocumento(documento);
  const seq = String(sequencia || 1).padStart(3, "0");
  const pad = (value, size = 2) => String(value).padStart(size, "0");

  const date = referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const SS = pad(date.getSeconds());
  const cpf4 = doc.slice(-4) || "0000";

  return `AUTO-${YYYY}${MM}${DD}-${HH}${mm}${SS}-${cpf4}-${seq}`;
};

const appendObservacao = (base, novasNotas = []) => {
  const filtradas = novasNotas.filter((item) => Boolean(item));
  if (!filtradas.length) return base || "";
  const prefix = base ? `${base} | ` : "";
  return `${prefix}${filtradas.join(" | ")}`;
};

const buildObservacoes = ({ observacaoAtual, notasComerciais, upsell }) => {
  const notas = [...(notasComerciais || [])];
  if (upsell) {
    notas.push(`Upsell sugerido: ${upsell}`);
  }
  return appendObservacao(observacaoAtual, notas);
};

export const aplicarRegrasComerciaisAoRegistro = (registro = {}, contexto = {}) => {
  const result = { ...registro };
  const raw = registro.raw && typeof registro.raw === "object" ? registro.raw : {};
  const params = mergeParams(contexto.parametros);
  const seqAtual = Number(contexto.seqAtual || 1);

  const convenioRaw = pickRawValue(raw, RAW_FIELD_ALIASES.convenio);
  const tabelaRaw = pickRawValue(raw, RAW_FIELD_ALIASES.tabela);
  const obsRaw = pickRawValue(raw, RAW_FIELD_ALIASES.observacoes);
  const origemComissaoRaw = pickRawValue(raw, RAW_FIELD_ALIASES.origemComissao);
  const situacaoComissaoRaw = pickRawValue(raw, RAW_FIELD_ALIASES.situacaoComissao);

  const produtoDestino =
    classificarProdutoSmart({
      promotora: result.promotora,
      Convenio: convenioRaw,
      Produto: result.produto,
      Tabela: tabelaRaw
    }) || result.produto;

  result.produtoClassificado = produtoDestino;
  if (produtoDestino) {
    result.produto = produtoDestino;
  }

  const perfil = detectarPerfilCliente({
    Produto: result.produto,
    Convenio: convenioRaw,
    Tabela: tabelaRaw,
    Observacoes: obsRaw || result.observacoes,
    OrigemComissao: origemComissaoRaw,
    SituacaoComissao: situacaoComissaoRaw
  });

  const upsell = sugerirUpsell(produtoDestino, perfil);
  if (upsell) {
    result.upsellSugerido = upsell;
  }

  const ultimoContatoValor = pickRawValue(raw, RAW_FIELD_ALIASES.ultimoContato);
  const ultimoContatoDate = ultimoContatoValor ? parseDateInput(ultimoContatoValor) : null;
  if (ultimoContatoDate) {
    result.ultimoContato = ultimoContatoDate.toISOString();
    const proximo = calcularProximoContato(produtoDestino, ultimoContatoDate, params);
    if (proximo) {
      result.proximoContato = proximo.toISOString();
      const dias = diffInDays(proximo);
      result.diasAteFollowup = dias;
      result.statusFollowup = dias < 0 ? "Atrasado" : dias === 0 ? "Hoje" : "Ok";
    }
  }

  const comPercImportado =
    typeof result.comissaoPercentual === "number" && Number.isFinite(result.comissaoPercentual)
      ? result.comissaoPercentual
      : null;
  const comPerc = comPercImportado ?? getComissaoPercent(params, produtoDestino, result.produto);
  result.comissaoPercentual = comPerc;
  if (!Number.isFinite(result.comissao) || Number(result.comissao) === 0) {
    const calculada = Number((Number(result.valorLiquido || 0) * comPerc).toFixed(2));
    result.comissao = calculada;
  }

  if (!result.contrato && !result.contratoId) {
    const autoContrato = gerarIdUnicoParaContrato(result.documento, seqAtual, contexto.referenceDate);
    result.contratoAutoGerado = true;
    result.contratoId = autoContrato;
    result.contrato = autoContrato;
  } else if (!result.contrato && result.contratoId) {
    result.contrato = result.contratoId;
  }

  result.observacoes = buildObservacoes({
    observacaoAtual: result.observacoes || obsRaw,
    notasComerciais: contexto.notasAdicionais,
    upsell
  });

  return result;
};

export const aplicarRegrasComerciais = (registros = [], contexto = {}) => {
  if (!Array.isArray(registros) || registros.length === 0) {
    return [];
  }

  const enriched = [];
  let sequencia = Number(contexto.seqInicial || 1);

  for (const registro of registros) {
    const resultado = aplicarRegrasComerciaisAoRegistro(registro, {
      ...contexto,
      seqAtual: sequencia
    });
    enriched.push(resultado);
    sequencia += 1;
  }

  return enriched;
};

export default {
  classificarProdutoPorConvenio,
  classificarProdutoSmart,
  detectarPerfilCliente,
  sugerirUpsell,
  calcularProximoContato,
  getComissaoPercent,
  gerarIdUnicoParaContrato,
  aplicarRegrasComerciaisAoRegistro,
  aplicarRegrasComerciais
};
