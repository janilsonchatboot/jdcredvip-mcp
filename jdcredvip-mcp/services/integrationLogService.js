// === JD CRED VIP – Registro de integrações ===
import { db } from "../config/database.js";

/**
 * Persiste um log de integração de forma resiliente (não falha o fluxo principal).
 * @param {string} integracao - Nome da integração (ex.: 'crefaz', 'nexxo')
 * @param {string} acao - Ação executada (ex.: 'simulacao', 'sync')
 * @param {string} status - Resultado (ex.: 'sucesso', 'erro')
 * @param {string|null} mensagem - Mensagem descritiva
 * @param {object|null} detalhes - Objeto com dados adicionais
 */
export async function logIntegration(integracao, acao, status, mensagem = null, detalhes = null) {
  try {
    await db("integration_logs").insert({
      integracao,
      acao,
      status,
      mensagem,
      detalhes
    });
  } catch (error) {
    // Não interrompe o fluxo principal caso ocorra falha ao logar.
    console.error("Falha ao registrar log de integração:", error.message);
  }
}

export async function getLatestLogs(limit = 10) {
  return db("integration_logs").orderBy("created_at", "desc").limit(limit);
}
