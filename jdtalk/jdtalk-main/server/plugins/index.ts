import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { storage } from '../storage';
import { log } from '../vite';
import { Plugin, PluginManifest } from '@shared/schema';

// Mapa de plugins carregados na memória
const loadedPlugins = new Map<string, LoadedPlugin>();

// Interface para plugins carregados
export interface LoadedPlugin {
  id: number;
  name: string;
  slug: string;
  version: string;
  isActive: boolean;
  path: string;
  manifest: PluginManifest;
  instance: any;
}

/**
 * Carrega o arquivo de manifesto de um plugin
 */
export async function loadPluginManifest(pluginPath: string): Promise<PluginManifest | null> {
  try {
    // Verifica a presença do arquivo manifest.json
    const manifestPath = path.join(pluginPath, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      log(`Manifesto não encontrado em ${manifestPath}`, 'plugin-system');
      return null;
    }
    
    // Lê e valida o manifesto
    const manifestContent = await fsPromises.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent) as PluginManifest;
    
    // Valida campos obrigatórios do manifesto
    if (
      !manifest.name || 
      !manifest.slug || 
      !manifest.version || 
      !manifest.main
    ) {
      log('Manifesto inválido: campos obrigatórios ausentes', 'plugin-system');
      return null;
    }
    
    return manifest;
  } catch (error) {
    log(`Erro ao carregar manifesto: ${error}`, 'plugin-system');
    return null;
  }
}

/**
 * Carrega um plugin específico pelo ID
 */
export async function loadPlugin(pluginId: number): Promise<LoadedPlugin | null> {
  try {
    // Verificar se o plugin existe no banco de dados
    const pluginData = await storage.getPlugin(pluginId);
    
    if (!pluginData || !pluginData.installPath || !pluginData.isActive) {
      log(`Plugin não encontrado ou não está ativo: ID ${pluginId}`, 'plugin-system');
      return null;
    }
    
    // Verificar se o plugin já está carregado
    if (loadedPlugins.has(pluginData.slug)) {
      log(`Plugin já carregado: ${pluginData.slug}`, 'plugin-system');
      return loadedPlugins.get(pluginData.slug) || null;
    }
    
    // Verificar o path do plugin
    if (!fs.existsSync(pluginData.installPath)) {
      log(`Diretório do plugin não encontrado: ${pluginData.installPath}`, 'plugin-system');
      return null;
    }
    
    // Obter manifesto
    const manifest = pluginData.manifest as PluginManifest || 
      await loadPluginManifest(pluginData.installPath);
    
    if (!manifest) {
      log(`Manifesto inválido para o plugin: ${pluginData.slug}`, 'plugin-system');
      return null;
    }
    
    // Carregar o módulo do plugin
    const mainFilePath = path.join(pluginData.installPath, manifest.main);
    
    if (!fs.existsSync(mainFilePath)) {
      log(`Arquivo principal do plugin não encontrado: ${mainFilePath}`, 'plugin-system');
      return null;
    }
    
    try {
      // Carregar o módulo do plugin
      const pluginModule = await import(mainFilePath);
      
      // Criar objeto do plugin carregado
      const loadedPlugin: LoadedPlugin = {
        id: pluginData.id,
        name: pluginData.name,
        slug: pluginData.slug,
        version: pluginData.version,
        isActive: pluginData.isActive,
        path: pluginData.installPath,
        manifest,
        instance: pluginModule.default || pluginModule
      };
      
      // Registrar o plugin no mapa de plugins carregados
      loadedPlugins.set(pluginData.slug, loadedPlugin);
      
      log(`Plugin carregado com sucesso: ${pluginData.name} (${pluginData.slug}) v${pluginData.version}`, 'plugin-system');
      return loadedPlugin;
    } catch (error) {
      log(`Erro ao carregar módulo do plugin: ${error}`, 'plugin-system');
      return null;
    }
  } catch (error) {
    log(`Erro ao carregar plugin: ${error}`, 'plugin-system');
    return null;
  }
}

/**
 * Carrega todos os plugins ativos
 */
export async function loadAllPlugins(): Promise<LoadedPlugin[]> {
  try {
    // Obter todos os plugins ativos
    const activePlugins = await storage.getActivePlugins();
    
    if (!activePlugins.length) {
      log('Nenhum plugin ativo encontrado', 'plugin-system');
      return [];
    }
    
    // Carregar cada plugin
    const loadedPluginsList: LoadedPlugin[] = [];
    
    for (const plugin of activePlugins) {
      const loadedPlugin = await loadPlugin(plugin.id);
      
      if (loadedPlugin) {
        loadedPluginsList.push(loadedPlugin);
      }
    }
    
    log(`${loadedPluginsList.length} plugins carregados com sucesso`, 'plugin-system');
    return loadedPluginsList;
  } catch (error) {
    log(`Erro ao carregar plugins: ${error}`, 'plugin-system');
    throw error;
  }
}

/**
 * Obtém um plugin carregado pelo slug
 */
export function getPlugin(slug: string): LoadedPlugin | undefined {
  return loadedPlugins.get(slug);
}

/**
 * Lista todos os plugins carregados
 */
export function getAllLoadedPlugins(): LoadedPlugin[] {
  return Array.from(loadedPlugins.values());
}

/**
 * Descarrega um plugin específico
 */
export function unloadPlugin(slug: string): boolean {
  try {
    // Verificar se o plugin está carregado
    if (!loadedPlugins.has(slug)) {
      log(`Plugin não está carregado: ${slug}`, 'plugin-system');
      return false;
    }
    
    // Obter o plugin
    const plugin = loadedPlugins.get(slug);
    
    if (!plugin) {
      return false;
    }
    
    // Chamar método de desativação do plugin, se existir
    if (plugin.instance && typeof plugin.instance.deactivate === 'function') {
      try {
        plugin.instance.deactivate();
      } catch (error) {
        log(`Erro ao chamar método de desativação do plugin: ${error}`, 'plugin-system');
      }
    }
    
    // Remover o plugin do mapa de plugins carregados
    loadedPlugins.delete(slug);
    
    log(`Plugin descarregado: ${plugin.name} (${plugin.slug})`, 'plugin-system');
    return true;
  } catch (error) {
    log(`Erro ao descarregar plugin: ${error}`, 'plugin-system');
    return false;
  }
}

/**
 * Descarrega todos os plugins
 */
export function unloadAllPlugins(): void {
  try {
    const pluginSlugs = Array.from(loadedPlugins.keys());
    
    for (const slug of pluginSlugs) {
      unloadPlugin(slug);
    }
    
    log('Todos os plugins foram descarregados', 'plugin-system');
  } catch (error) {
    log(`Erro ao descarregar todos os plugins: ${error}`, 'plugin-system');
  }
}

/**
 * Inicializa todos os plugins carregados
 */
export async function initializePlugins(): Promise<void> {
  try {
    const plugins = Array.from(loadedPlugins.values());
    
    // Inicializar os plugins na ordem correta (primeiro os core plugins)
    const corePlugins = plugins.filter(plugin => 
      plugin.manifest.requires?.core === 'core' || 
      plugin.slug === 'core' || 
      plugin.slug === 'jdtalk-core');
    
    const normalPlugins = plugins.filter(plugin => 
      !(plugin.manifest.requires?.core === 'core' || 
        plugin.slug === 'core' || 
        plugin.slug === 'jdtalk-core'));
    
    // Inicializar plugins core primeiro
    for (const plugin of corePlugins) {
      if (plugin.instance && typeof plugin.instance.initialize === 'function') {
        try {
          await plugin.instance.initialize();
          log(`Plugin core inicializado: ${plugin.name} (${plugin.slug})`, 'plugin-system');
        } catch (error) {
          log(`Erro ao inicializar plugin core: ${plugin.name} (${plugin.slug}) - ${error}`, 'plugin-system');
        }
      }
    }
    
    // Inicializar plugins normais
    for (const plugin of normalPlugins) {
      if (plugin.instance && typeof plugin.instance.initialize === 'function') {
        try {
          await plugin.instance.initialize();
          log(`Plugin inicializado: ${plugin.name} (${plugin.slug})`, 'plugin-system');
        } catch (error) {
          log(`Erro ao inicializar plugin: ${plugin.name} (${plugin.slug}) - ${error}`, 'plugin-system');
        }
      }
    }
    
    log('Inicialização de plugins concluída', 'plugin-system');
  } catch (error) {
    log(`Erro ao inicializar plugins: ${error}`, 'plugin-system');
    throw error;
  }
}

export default {
  loadPlugin,
  loadAllPlugins,
  getPlugin,
  getAllLoadedPlugins,
  unloadPlugin,
  unloadAllPlugins,
  initializePlugins
};