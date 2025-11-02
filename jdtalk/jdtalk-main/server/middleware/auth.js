/**
 * Middleware de autenticação para JDTalk
 * Verifica se o usuário está autenticado com JWT
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Chave JWT (normalmente está no .env)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware de autenticação
 * @param {Object} req - Objeto de requisição Express
 * @param {Object} res - Objeto de resposta Express
 * @param {Function} next - Função next do Express
 */
function authMiddleware(req, res, next) {
  // Verificar header de autorização
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Extrair token do header
  const token = authHeader.substring(7);
  
  try {
    // Verificar e decodificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Adicionar usuário à requisição
    req.user = decoded;
    
    // Continuar processamento
    next();
  } catch (error) {
    logger.error('Erro na autenticação:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = authMiddleware;