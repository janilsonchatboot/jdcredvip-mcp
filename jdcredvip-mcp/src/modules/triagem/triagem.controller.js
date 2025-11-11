const normaliza = (texto = "") =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function avaliar(req, res) {
  const { nome = "", produtoInformado = "", volumeLiquido = 0, perfil = {} } = req.body ?? {};

  let produtoIdeal = produtoInformado.trim() || "Analise pendente";
  let motivo = "OK";
  let limiteEstimado = 0;
  let comissaoPercent = 0;
  let upsell = "";
  let status = "Nao apto";

  const possuiPerfil = perfil?.isBA || perfil?.isINSS || perfil?.isCLT;
  const produtoNormalizado = normaliza(produtoInformado);

  if (!nome.trim()) {
    status = "Atencao: Revisar";
    motivo = "Informe o nome do cliente para registrar no CRM.";
  }

  if (!possuiPerfil && !produtoNormalizado) {
    status = "Atencao: Revisar";
    motivo = "Defina o perfil (INSS, Bolsa Familia, CLT) ou o produto desejado.";
  }

  if (perfil?.isBA) {
    produtoIdeal = "Credito Bolsa Familia";
    limiteEstimado = 750;
    comissaoPercent = 0.09;
    upsell = "Conta de Luz";
  } else if (perfil?.isINSS) {
    produtoIdeal = "INSS Consignado";
    limiteEstimado = 15000;
    comissaoPercent = 0.17;
    upsell = "Portabilidade + Refin";
  } else if (perfil?.isCLT) {
    produtoIdeal = "Credito Trabalhador CLT";
    limiteEstimado = 20000;
    comissaoPercent = 0.1;
    upsell = "FGTS / Conta de Luz";
  } else if (produtoNormalizado.includes("fgts")) {
    produtoIdeal = "FGTS Saque-Aniversario";
    limiteEstimado = 5000;
    comissaoPercent = 0.12;
    upsell = "Conta de Luz";
  } else if (!possuiPerfil) {
    produtoIdeal = "Credito Pessoal Seguro";
    limiteEstimado = 1000;
    comissaoPercent = 0.08;
  }

  const volume = Number(volumeLiquido) || 0;
  const comissaoEstimada = Number((volume * comissaoPercent).toFixed(2));

  res.json({
    status: "ok",
    dados: {
      nome: nome.trim(),
      produtoIdeal,
      motivo,
      limiteEstimado,
      comissaoPercent,
      comissaoEstimada,
      upsell,
      status
    }
  });
}
