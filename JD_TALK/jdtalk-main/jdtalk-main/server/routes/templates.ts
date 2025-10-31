/**
 * JDTalk - Routes para Templates do WhatsApp
 * 
 * Implementação das APIs relacionadas aos templates de mensagem do WhatsApp
 */

import { Express, Request, Response } from 'express';
import axios from 'axios';
import { storage } from '../storage';

/**
 * Registra as rotas relacionadas aos templates do WhatsApp
 * @param app Express app
 */
export function registerTemplateRoutes(app: Express) {
  // Obter todos os templates
  app.get('/api/whatsapp/templates', async (req: Request, res: Response) => {
    try {
      // Obter a configuração do WhatsApp
      const config = await storage.getWhatsAppConfig();
      
      if (!config || !config.token || !config.phoneNumberId) {
        return res.status(400).json({
          success: false,
          message: 'Configuração do WhatsApp não encontrada'
        });
      }
      
      // Faz requisição para a API do WhatsApp
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${config.phoneNumberId}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return res.json({
        success: true,
        data: response.data.data || []
      });
    } catch (error) {
      console.error('Erro ao obter templates:', error);
      
      // Verifica se é um erro da API do Facebook
      if (error.response && error.response.data) {
        return res.status(error.response.status || 500).json({
          success: false,
          message: 'Erro ao obter templates do WhatsApp',
          error: error.response.data
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter templates do WhatsApp'
      });
    }
  });
  
  // Criar novo template
  app.post('/api/whatsapp/templates', async (req: Request, res: Response) => {
    try {
      // Valida o corpo da requisição
      const template = req.body;
      
      if (!template || !template.name || !template.language || !template.category || !template.components) {
        return res.status(400).json({
          success: false,
          message: 'Dados do template incompletos'
        });
      }
      
      // Obter a configuração do WhatsApp
      const config = await storage.getWhatsAppConfig();
      
      if (!config || !config.token || !config.phoneNumberId) {
        return res.status(400).json({
          success: false,
          message: 'Configuração do WhatsApp não encontrada'
        });
      }
      
      // Faz requisição para a API do WhatsApp
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${config.phoneNumberId}/message_templates`,
        template,
        {
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return res.json({
        success: true,
        data: response.data
      });
    } catch (error) {
      console.error('Erro ao criar template:', error);
      
      // Verifica se é um erro da API do Facebook
      if (error.response && error.response.data) {
        return res.status(error.response.status || 500).json({
          success: false,
          message: 'Erro ao criar template do WhatsApp',
          error: error.response.data
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar template do WhatsApp'
      });
    }
  });
  
  // Obter detalhes de um template
  app.get('/api/whatsapp/templates/:name', async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Nome do template não fornecido'
        });
      }
      
      // Obter a configuração do WhatsApp
      const config = await storage.getWhatsAppConfig();
      
      if (!config || !config.token || !config.phoneNumberId) {
        return res.status(400).json({
          success: false,
          message: 'Configuração do WhatsApp não encontrada'
        });
      }
      
      // Obtem todos os templates e filtra pelo nome
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${config.phoneNumberId}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const templates = response.data.data || [];
      const template = templates.find((t: any) => t.name === name);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template não encontrado'
        });
      }
      
      return res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Erro ao obter detalhes do template:', error);
      
      // Verifica se é um erro da API do Facebook
      if (error.response && error.response.data) {
        return res.status(error.response.status || 500).json({
          success: false,
          message: 'Erro ao obter detalhes do template',
          error: error.response.data
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter detalhes do template'
      });
    }
  });
  
  // Excluir um template
  app.delete('/api/whatsapp/templates/:name', async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Nome do template não fornecido'
        });
      }
      
      // Obter a configuração do WhatsApp
      const config = await storage.getWhatsAppConfig();
      
      if (!config || !config.token || !config.phoneNumberId) {
        return res.status(400).json({
          success: false,
          message: 'Configuração do WhatsApp não encontrada'
        });
      }
      
      // Faz requisição para a API do WhatsApp
      await axios.delete(
        `https://graph.facebook.com/v18.0/${config.phoneNumberId}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json'
          },
          data: {
            name: name
          }
        }
      );
      
      return res.json({
        success: true,
        message: 'Template excluído com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      
      // Verifica se é um erro da API do Facebook
      if (error.response && error.response.data) {
        return res.status(error.response.status || 500).json({
          success: false,
          message: 'Erro ao excluir template',
          error: error.response.data
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao excluir template'
      });
    }
  });
  
  // Enviar mensagem usando template
  app.post('/api/whatsapp/send-template', async (req: Request, res: Response) => {
    try {
      const { to, templateName, language, components } = req.body;
      
      if (!to || !templateName || !language) {
        return res.status(400).json({
          success: false,
          message: 'Dados incompletos para envio de template'
        });
      }
      
      // Obter a configuração do WhatsApp
      const config = await storage.getWhatsAppConfig();
      
      if (!config || !config.token || !config.phoneNumberId) {
        return res.status(400).json({
          success: false,
          message: 'Configuração do WhatsApp não encontrada'
        });
      }
      
      // Formata o número de telefone (adiciona código do país se necessário)
      let formattedPhone = to;
      
      if (!formattedPhone.startsWith('+')) {
        // Assume Brazil como padrão se não tiver código do país
        formattedPhone = `+55${formattedPhone.replace(/\D/g, '')}`;
      }
      
      // Prepara o payload para a API do WhatsApp
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language
          }
        }
      };
      
      // Adiciona componentes se fornecidos
      if (components && components.length > 0) {
        payload.template.components = components;
      }
      
      // Faz requisição para a API do WhatsApp
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return res.json({
        success: true,
        data: response.data
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem com template:', error);
      
      // Verifica se é um erro da API do Facebook
      if (error.response && error.response.data) {
        return res.status(error.response.status || 500).json({
          success: false,
          message: 'Erro ao enviar mensagem com template',
          error: error.response.data
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem com template'
      });
    }
  });
}