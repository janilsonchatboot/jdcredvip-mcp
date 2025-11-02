/**
 * Módulo de conexão com o banco de dados para o JDTalk
 * Oferece funções para execução de queries e gerenciamento de conexões
 */

const mysql = require('mysql2/promise');
const logger = require('./logger');

// Configurações de conexão (normalmente estão no .env)
const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jdtalk',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Criar pool de conexões
const pool = mysql.createPool(config);

/**
 * Executa uma query SQL
 * @param {string} sql - Comando SQL
 * @param {Array} params - Parâmetros da query
 * @returns {Promise<Array>} Resultado da query
 */
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error(`Erro ao executar query: ${sql}`, error);
    throw error;
  }
}

/**
 * Obtém uma conexão do pool
 * @returns {Promise<Connection>} Conexão do banco de dados
 */
async function getConnection() {
  try {
    return await pool.getConnection();
  } catch (error) {
    logger.error('Erro ao obter conexão com o banco de dados', error);
    throw error;
  }
}

/**
 * Inicia uma transação
 * @returns {Promise<Connection>} Conexão com a transação iniciada
 */
async function beginTransaction() {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    return connection;
  } catch (error) {
    connection.release();
    logger.error('Erro ao iniciar transação', error);
    throw error;
  }
}

/**
 * Confirma uma transação
 * @param {Connection} connection - Conexão com a transação
 */
async function commit(connection) {
  try {
    await connection.commit();
  } catch (error) {
    logger.error('Erro ao confirmar transação', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Desfaz uma transação
 * @param {Connection} connection - Conexão com a transação
 */
async function rollback(connection) {
  try {
    await connection.rollback();
  } catch (error) {
    logger.error('Erro ao desfazer transação', error);
  } finally {
    connection.release();
  }
}

// Exportar funções do módulo
module.exports = {
  query,
  getConnection,
  beginTransaction,
  commit,
  rollback
};