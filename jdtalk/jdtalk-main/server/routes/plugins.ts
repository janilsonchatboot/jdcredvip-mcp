import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import pluginManager from '../plugins';
import packageManager from '../plugins/package-manager';
import { log } from '../vite';

const router = Router();

// Schema de validação para instalação/atualização de plugin
const installPluginSchema = z.object({
  url: z.string().url(),
  activate: z.boolean().optional().default(true)
});

// Schema de validação para configuração de plugin
const updateSettingSchema = z.object({
  key: z.string(),
  value: z.any()
});

/**
 * Lista todos os plugins instalados
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const plugins = await storage.getAllPlugins();
    res.json(plugins);
  } catch (error) {
    log(`Erro ao listar plugins: ${error}`, 'plugin-api');
    res.status(500).json({ message: 'Erro ao listar plugins', error: String(error) });
  }
});

/**
 * Obtém detalhes de um plugin específico
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pluginId = parseInt(req.params.id);
    
    if (isNaN(pluginId)) {
      return res.status(400).json({ message: 'ID do plugin inválido' });
    }
    
    const plugin = await storage.getPlugin(pluginId);
    
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin não encontrado' });
    }
    
    res.json(plugin);
  } catch (error) {
    log(`Erro ao obter plugin: ${error}`, 'plugin-api');
    res.status(500).json({ message: 'Erro ao obter plugin', error: String(error) });
  }
});

/**
 * Obtém detalhes de um plugin específico pelo slug
 */
router.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const plugin = await storage.getPluginBySlug(slug);
    
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin não encontrado' });
    }
    
    res.json(plugin);
  } catch (error) {
    log(`Erro ao obter plugin: ${error}`, 'plugin-api');
    res.status(500).json({ message: 'Erro ao obter plugin', error: String(error) });
  }
});

/**
 * Instala um plugin a partir de uma URL
 */
router.post('/install', async (req: Request, res: Response) => {
  try {
    const validation = installPluginSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ message: 'Dados inválidos', errors: validation.error.format() });
    }
    
    const { url, activate } = validation.data;
    const plugin = await packageManager.installPluginFromUrl(url, activate);
    
    if (!plugin) {
      return res.status(500).json({ message: 'Falha ao instalar plugin' });
    }
    
    res.status(201).json(plugin);
  } catch (error) {
    log(`Erro ao instalar plugin: ${error}`, 'plugin-api');
    res.status(500).json({ message: 'Erro ao instalar plugin', error: String(error) });
  }
});

/**
 * Atualiza um plugin a partir de uma URL
 */
router.post('/:id/update', async (req: Request, res: Response) => {
  try {
    const pluginId = parseInt(req.params.id);
    
    if (isNaN(pluginId)) {
      return res.status(400).json({ message: 'ID do plugin inválido' });
    }
    
    const validation = installPluginSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ message: 'Dados inválidos', errors: validation.error.format() });
    }
    
    const { url } = validation.data;
    const plugin = await packageManager.updatePluginFromUrl(pluginId, url);
    
    if (!plugin) {
      return res.status(500).json({ message: 'Falha ao atualizar plugin' });
    }
    
    res.json(plugin);
  } catch (error) {
    log(`Erro ao atualizar plugin: ${error}`, 'plugin-api');
    res.status(500).json({ message: 'Erro ao atualizar plugin', error: String(error) });
  }
});

/**
 * Desinstala um plugin
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pluginId = parseInt(req.params.id);
    
    if (isNaN(pluginId)) {
      return res.status(400).json({ message: 'ID do plugin inválido' });
    }
    
    // Verificar se o plugin existe
    const plugin = await storage.getPlugin(pluginId);
    
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin não encontrado' });
    }
    
    // Descarregar o plugin se estiver carregado
    if (plugin.isActive) {
      pluginManager.unloadPlugin(plugin.slug);
      await storage.deactivatePlugin(pluginId);
    }
    
    // Desinstalar o plugin
    const success = await packageManager.uninstallPlugin(pluginId);
    
    if (!success) {
      return res.status(500).json({ message: 'Falha ao desinstalar plugin' });
    }
    
    res.status(204).end();
  } catch (error) {
    log(`Erro ao desinstalar plugin: ${error}`, 'plugin-api');
    res.status(500).json({ message: 'Erro ao desinstalar plugin', error: String(error) });
  }
});

/**
 * Ativa um plugin
 */
router.patch('/:id/activate', async (req: Request, res: Response) => {
  try {
    const pluginId = parseInt(req.params.id);
    
    if (isNaN(pluginId)) {
      return res.status(400).json({ message: 'ID do plugin inválido' });
    }
    
    // Ativa o plugin no banco de dados
    const plugin = await storage.activatePlugin(pluginId);
    
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin não encontrado' });
    }
    
    // Carrega o plugin na memória
    const loadedPlugin = await pluginManager.loadPlugin(pluginId);
    
    if (!loadedPlugin && plugin.isActive) {
      // Reverte a ativação no banco se o carregamento falhar
      await storage.deactivatePlugin(pluginId);
      return res.status(500).json({ message: 'Falha ao carregar plugin' });
    }
    
    res.json(plugin);
  } catch (error) {
    log(`Erro ao ativar plugin: ${error}`, 'plugin-api');
    res.status(500).json({ message: 'Erro ao ativar plugin', error: String(error) });
  }
});

/**
 * Desativa um plugin
 */
router.patch('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const pluginId = parseInt(req.params.id);
    
    if (isNaN(pluginId)) {
      return res.status(400).json({ message: 'ID do plugin inválido' });
    }
    
    // Obtém o plugin antes de desativar
    const currentPlugin = await storage.getPlugin(pluginId);
    
    if (!currentPlugin) {
      return res.status(404).json({ message: 'Plugin não encontrado' });
    }
    
    // Desativa o plugin no banco de dados
    const plugin = await storage.deactivatePlugin(pluginId);
    
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin não encontrado' });
    }
    
    // Descarrega o plugin da memória
    pluginManager.unloadPlugin(currentPlugin.slug);
    
    res.json(plugin);
  } catch (error) {
    log(`Erro ao desativar plugin: ${error}`, 'plugin-api');
    res.status(500).json({ message: 'Erro ao desativar plugin', error: String(error) });
  }
});

/**
 * Lista configurações de um plugin
 */
router.get('/:id/settings', async (req: Request, res: Response) => {
  try {
    const pluginId = parseInt(req.params.id);
    
    if (isNaN(pluginId)) {
      return res.status(400).json({ message: 'ID do plugin inválido' });
    }
    
    // Verifica se o plugin existe
    const plugin = await storage.getPlugin(pluginId);
    
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin não encontrado' });
    }
    
    // Obtém as configurações
    const settings = await storage.getPluginSettings(pluginId);
    
    res.json(settings);
  } catch (error) {
    log(`Erro ao obter configurações do plugin: ${error}`, 'plugin-api');
    res.status(500).json({ message: 'Erro ao obter configurações do plugin', error: String(error) });
  }
});

/**
 * Atualiza uma configuração de plugin
 */
router.patch('/:id/settings', async (req: Request, res: Response) => {
  try {
    const pluginId = parseInt(req.params.id);
    
    if (isNaN(pluginId)) {
      return res.status(400).json({ message: 'ID do plugin inválido' });
    }
    
    // Verifica se o plugin existe
    const plugin = await storage.getPlugin(pluginId);
    
    if (!plugin) {
      return res.status(404).json({ message: 'Plugin não encontrado' });
    }
    
    // Valida os dados
    const validation = updateSettingSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ message: 'Dados inválidos', errors: validation.error.format() });
    }
    
    const { key, value } = validation.data;
    
    // Verifica se a configuração já existe
    let setting = await storage.getPluginSetting(pluginId, key);
    
    if (setting) {
      // Atualiza a configuração existente
      setting = await storage.updatePluginSetting(setting.id, value);
    } else {
      // Cria uma nova configuração
      setting = await storage.createPluginSetting({
        pluginId,
        key,
        value
      });
    }
    
    res.json(setting);
  } catch (error) {
    log(`Erro ao atualizar configuração do plugin: ${error}`, 'plugin-api');
    res.status(500).json({ message: 'Erro ao atualizar configuração do plugin', error: String(error) });
  }
});

/**
 * Lista os plugins disponíveis no registro
 */
router.get('/registry/available', async (req: Request, res: Response) => {
  try {
    const registryItems = await storage.getPluginRegistryItems();
    res.json(registryItems);
  } catch (error) {
    log(`Erro ao listar plugins do registro: ${error}`, 'plugin-api');
    res.status(500).json({ message: 'Erro ao listar plugins do registro', error: String(error) });
  }
});

export default router;