const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');

/**
 * @route GET /api/templates
 * @description Listar todos os templates de mensagens
 * @access Privado
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const templates = await db.query(
      `SELECT * FROM message_templates ORDER BY created_at DESC`
    );
    
    res.json(templates);
  } catch (error) {
    logger.error('Erro ao listar templates:', error);
    res.status(500).json({ error: 'Erro ao buscar templates' });
  }
});

/**
 * @route GET /api/templates/:id
 * @description Obter um template específico
 * @access Privado
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [template] = await db.query(
      `SELECT * FROM message_templates WHERE id = ?`,
      [req.params.id]
    );
    
    if (!template) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }
    
    res.json(template);
  } catch (error) {
    logger.error(`Erro ao buscar template ${req.params.id}:`, error);
    res.status(500).json({ error: 'Erro ao buscar template' });
  }
});

/**
 * @route POST /api/templates
 * @description Criar um novo template
 * @access Privado
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, category, content, variables, whatsapp_template_name } = req.body;
    
    // Validação básica
    if (!name || !content) {
      return res.status(400).json({ error: 'Nome e conteúdo são obrigatórios' });
    }
    
    // Verificar se já existe um template com esse nome
    const [existingTemplate] = await db.query(
      `SELECT id FROM message_templates WHERE name = ?`,
      [name]
    );
    
    if (existingTemplate) {
      return res.status(400).json({ error: 'Já existe um template com esse nome' });
    }
    
    // Preparar variáveis JSON
    const variablesJson = variables ? JSON.stringify(variables) : null;
    
    // Criar template
    const result = await db.query(
      `INSERT INTO message_templates 
       (name, category, content, variables, whatsapp_template_name, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, category, content, variablesJson, whatsapp_template_name, req.user.id]
    );
    
    // Buscar template completo
    const [newTemplate] = await db.query(
      `SELECT * FROM message_templates WHERE id = ?`,
      [result.insertId]
    );
    
    res.status(201).json(newTemplate);
  } catch (error) {
    logger.error('Erro ao criar template:', error);
    res.status(500).json({ error: 'Erro ao criar template' });
  }
});

/**
 * @route PUT /api/templates/:id
 * @description Atualizar um template existente
 * @access Privado
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, category, content, variables, whatsapp_template_name, whatsapp_template_status } = req.body;
    
    // Validação básica
    if (!name || !content) {
      return res.status(400).json({ error: 'Nome e conteúdo são obrigatórios' });
    }
    
    // Verificar se o template existe
    const [template] = await db.query(
      `SELECT * FROM message_templates WHERE id = ?`,
      [req.params.id]
    );
    
    if (!template) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }
    
    // Verificar se já existe outro template com o mesmo nome
    if (name !== template.name) {
      const [existingTemplate] = await db.query(
        `SELECT id FROM message_templates WHERE name = ? AND id != ?`,
        [name, req.params.id]
      );
      
      if (existingTemplate) {
        return res.status(400).json({ error: 'Já existe outro template com esse nome' });
      }
    }
    
    // Preparar variáveis JSON
    const variablesJson = variables ? JSON.stringify(variables) : null;
    
    // Atualizar template
    await db.query(
      `UPDATE message_templates 
       SET name = ?, 
           category = ?, 
           content = ?, 
           variables = ?,
           whatsapp_template_name = ?,
           whatsapp_template_status = ?
       WHERE id = ?`,
      [
        name, 
        category, 
        content, 
        variablesJson, 
        whatsapp_template_name,
        whatsapp_template_status || template.whatsapp_template_status,
        req.params.id
      ]
    );
    
    // Buscar template atualizado
    const [updatedTemplate] = await db.query(
      `SELECT * FROM message_templates WHERE id = ?`,
      [req.params.id]
    );
    
    res.json(updatedTemplate);
  } catch (error) {
    logger.error(`Erro ao atualizar template ${req.params.id}:`, error);
    res.status(500).json({ error: 'Erro ao atualizar template' });
  }
});

/**
 * @route DELETE /api/templates/:id
 * @description Excluir um template
 * @access Privado
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Verificar se o template existe
    const [template] = await db.query(
      `SELECT * FROM message_templates WHERE id = ?`,
      [req.params.id]
    );
    
    if (!template) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }
    
    // Excluir template
    await db.query(
      `DELETE FROM message_templates WHERE id = ?`,
      [req.params.id]
    );
    
    res.json({ message: 'Template excluído com sucesso' });
  } catch (error) {
    logger.error(`Erro ao excluir template ${req.params.id}:`, error);
    res.status(500).json({ error: 'Erro ao excluir template' });
  }
});

/**
 * @route POST /api/templates/:id/submit
 * @description Submeter template para aprovação no WhatsApp
 * @access Privado
 */
router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    // Verificar se o template existe
    const [template] = await db.query(
      `SELECT * FROM message_templates WHERE id = ?`,
      [req.params.id]
    );
    
    if (!template) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }
    
    // Aqui seria implementada a integração com a API do WhatsApp
    // para submeter o template para aprovação
    
    // Atualizar status do template para 'pending'
    await db.query(
      `UPDATE message_templates SET whatsapp_template_status = 'pending' WHERE id = ?`,
      [req.params.id]
    );
    
    // Buscar template atualizado
    const [updatedTemplate] = await db.query(
      `SELECT * FROM message_templates WHERE id = ?`,
      [req.params.id]
    );
    
    res.json({
      message: 'Template submetido para aprovação',
      template: updatedTemplate
    });
  } catch (error) {
    logger.error(`Erro ao submeter template ${req.params.id}:`, error);
    res.status(500).json({ error: 'Erro ao submeter template' });
  }
});

/**
 * @route GET /api/templates/category/:category
 * @description Buscar templates por categoria
 * @access Privado
 */
router.get('/category/:category', authMiddleware, async (req, res) => {
  try {
    const templates = await db.query(
      `SELECT * FROM message_templates WHERE category = ? ORDER BY created_at DESC`,
      [req.params.category]
    );
    
    res.json(templates);
  } catch (error) {
    logger.error(`Erro ao buscar templates da categoria ${req.params.category}:`, error);
    res.status(500).json({ error: 'Erro ao buscar templates' });
  }
});

/**
 * @route POST /api/templates/search
 * @description Pesquisar templates
 * @access Privado
 */
router.post('/search', authMiddleware, async (req, res) => {
  try {
    const { query, category } = req.body;
    
    let sql = `SELECT * FROM message_templates WHERE 1=1`;
    const params = [];
    
    if (query) {
      sql += ` AND (name LIKE ? OR content LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`);
    }
    
    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }
    
    sql += ` ORDER BY created_at DESC`;
    
    const templates = await db.query(sql, params);
    
    res.json(templates);
  } catch (error) {
    logger.error('Erro ao pesquisar templates:', error);
    res.status(500).json({ error: 'Erro ao pesquisar templates' });
  }
});

/**
 * @route POST /api/templates/preview
 * @description Gerar preview de template com variáveis substituídas
 * @access Privado
 */
router.post('/preview', authMiddleware, async (req, res) => {
  try {
    const { templateId, variables } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: 'ID do template é obrigatório' });
    }
    
    // Buscar template
    const [template] = await db.query(
      `SELECT * FROM message_templates WHERE id = ?`,
      [templateId]
    );
    
    if (!template) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }
    
    // Substituir variáveis no conteúdo
    let previewContent = template.content;
    
    if (variables && typeof variables === 'object') {
      // Substituir cada variável
      Object.keys(variables).forEach(key => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        previewContent = previewContent.replace(placeholder, variables[key]);
      });
    }
    
    res.json({
      original: template.content,
      preview: previewContent
    });
  } catch (error) {
    logger.error('Erro ao gerar preview do template:', error);
    res.status(500).json({ error: 'Erro ao gerar preview' });
  }
});

module.exports = router;