import {
  simularCrefaz,
  contratarCrefaz,
  listarPropostasCrefaz
} from "./crefaz.service.js";
import {
  sincronizarNexxo,
  listarContratosNexxo,
  listarComissoesNexxo,
  resumoIntegracoes
} from "./nexxo.service.js";
import { ensureIntegrationAuthorized, actorFromRequest } from "#core/middlewares/auth.js";

export async function simularCrefazController(req, res) {
  try {
    ensureIntegrationAuthorized("crefaz", req);
    const dados = await simularCrefaz(req.body, actorFromRequest(req));
    res.json({ status: "ok", dados });
  } catch (error) {
    console.error("Erro ao simular proposta Crefaz:", error);
    res.status(error.status || 500).json({
      status: "erro",
      mensagem: error.message || "Falha ao simular proposta."
    });
  }
}

export async function contratarCrefazController(req, res) {
  try {
    ensureIntegrationAuthorized("crefaz", req);
    const proposta = await contratarCrefaz(req.body, actorFromRequest(req));
    res.json({ status: "ok", dados: proposta });
  } catch (error) {
    console.error("Erro ao contratar proposta Crefaz:", error);
    res.status(error.status || 400).json({
      status: "erro",
      mensagem: error.message || "Falha ao contratar proposta."
    });
  }
}

export async function listarPropostasCrefazController(req, res) {
  try {
    ensureIntegrationAuthorized("crefaz", req);
    const propostas = await listarPropostasCrefaz({
      status: req.query.status,
      promotora: req.query.promotora,
      cliente: req.query.cliente,
      documento: req.query.documento,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim,
      limit: req.query.limit,
      offset: req.query.offset
    });
    res.json({ status: "ok", dados: propostas });
  } catch (error) {
    console.error("Erro ao listar propostas Crefaz:", error);
    res.status(error.status || 500).json({
      status: "erro",
      mensagem: error.message || "Falha ao listar propostas."
    });
  }
}

export async function sincronizarNexxoController(req, res) {
  try {
    ensureIntegrationAuthorized("nexxo", req);
    const summary = await sincronizarNexxo(req.body, actorFromRequest(req));
    res.status(202).json({ status: "ok", dados: summary });
  } catch (error) {
    console.error("Erro ao sincronizar dados da Nexxo:", error);
    res.status(error.status || 500).json({
      status: "erro",
      mensagem: error.message || "Falha ao sincronizar dados da Nexxo."
    });
  }
}

export async function listarContratosNexxoController(req, res) {
  try {
    ensureIntegrationAuthorized("nexxo", req);
    const contratos = await listarContratosNexxo({
      promotora: req.query.promotora,
      status: req.query.status,
      produto: req.query.produto,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim,
      cliente: req.query.cliente,
      limit: req.query.limit,
      offset: req.query.offset
    });
    res.json({ status: "ok", dados: contratos });
  } catch (error) {
    console.error("Erro ao listar contratos da Nexxo:", error);
    res.status(error.status || 500).json({
      status: "erro",
      mensagem: error.message || "Falha ao listar contratos."
    });
  }
}

export async function listarComissoesNexxoController(req, res) {
  try {
    ensureIntegrationAuthorized("nexxo", req);
    const comissoes = await listarComissoesNexxo({
      referencia: req.query.referencia,
      promotora: req.query.promotora,
      produto: req.query.produto,
      limit: req.query.limit
    });
    res.json({ status: "ok", dados: comissoes });
  } catch (error) {
    console.error("Erro ao listar comissoes da Nexxo:", error);
    res.status(error.status || 500).json({
      status: "erro",
      mensagem: error.message || "Falha ao listar comissoes."
    });
  }
}

export async function statusIntegracoesController(req, res) {
  try {
    ensureIntegrationAuthorized("nexxo", req);
    const resumo = await resumoIntegracoes();
    res.json({ status: "ok", dados: resumo });
  } catch (error) {
    console.error("Erro ao consultar status das integracoes:", error);
    res.status(error.status || 500).json({
      status: "erro",
      mensagem: error.message || "Falha ao consultar status."
    });
  }
}
