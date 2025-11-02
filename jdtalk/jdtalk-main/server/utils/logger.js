/**
 * Módulo de logger para o JDTalk
 * Este logger simplificado registra mensagens no console
 * Em produção, pode ser estendido para gravar em arquivos ou enviar para serviços de logging
 */

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Nível de log baseado no ambiente
const currentLevel = process.env.NODE_ENV === 'production' ? 1 : 3;

// Função para formatar a data/hora
function getTimestamp() {
  const now = new Date();
  return now.toISOString();
}

// Função para verificar se o nível de log atual permite o log
function canLog(level) {
  return levels[level] <= currentLevel;
}

/**
 * Função de log de erro
 * @param {string} message - Mensagem de erro
 * @param {Error|Object} error - Objeto de erro ou detalhes adicionais
 */
function error(message, error) {
  if (!canLog('error')) return;
  
  console.error(`[${getTimestamp()}] [ERROR] ${message}`);
  if (error) {
    if (error instanceof Error) {
      console.error(`[${getTimestamp()}] [ERROR] ${error.stack || error.message}`);
    } else {
      console.error(`[${getTimestamp()}] [ERROR]`, error);
    }
  }
}

/**
 * Função de log de aviso
 * @param {string} message - Mensagem de aviso
 * @param {Object} [details] - Detalhes adicionais (opcional)
 */
function warn(message, details) {
  if (!canLog('warn')) return;
  
  console.warn(`[${getTimestamp()}] [WARN] ${message}`);
  if (details) {
    console.warn(`[${getTimestamp()}] [WARN]`, details);
  }
}

/**
 * Função de log informativo
 * @param {string} message - Mensagem informativa
 * @param {Object} [details] - Detalhes adicionais (opcional)
 */
function info(message, details) {
  if (!canLog('info')) return;
  
  console.info(`[${getTimestamp()}] [INFO] ${message}`);
  if (details) {
    console.info(`[${getTimestamp()}] [INFO]`, details);
  }
}

/**
 * Função de log de depuração
 * @param {string} message - Mensagem de depuração
 * @param {Object} [details] - Detalhes adicionais (opcional)
 */
function debug(message, details) {
  if (!canLog('debug')) return;
  
  console.debug(`[${getTimestamp()}] [DEBUG] ${message}`);
  if (details) {
    console.debug(`[${getTimestamp()}] [DEBUG]`, details);
  }
}

module.exports = {
  error,
  warn,
  info,
  debug
};