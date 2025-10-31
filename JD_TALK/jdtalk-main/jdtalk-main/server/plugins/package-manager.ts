import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import unzipper from 'unzipper';
import { storage } from '../storage';
import { log } from '../vite';
import { InsertPlugin, Plugin, PluginManifest } from '@shared/schema';

/**
 * Caminho para a pasta de plugins
 */
const PLUGINS_DIR = path.join(process.cwd(), 'plugins');

/**
 * Faz o download de um arquivo de uma URL
 */
async function downloadFile(url: string, destination: string): Promise<string> {
  try {
    log(`Baixando plugin de ${url}`, 'plugin-manager');
    
    // Certifica-se de que o diretório de destino existe
    await fsPromises.mkdir(path.dirname(destination), { recursive: true });
    
    // Faz o download do arquivo
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro ao baixar arquivo: ${response.status} ${response.statusText}`);
    }
    
    // Converte o stream de resposta para buffer
    const buffer = await response.arrayBuffer();
    
    // Salva o arquivo
    await fsPromises.writeFile(destination, Buffer.from(buffer));
    
    log(`Download concluído com sucesso: ${destination}`, 'plugin-manager');
    return destination;
  } catch (error) {
    log(`Erro ao baixar arquivo: ${error}`, 'plugin-manager');
    throw error;
  }
}

/**
 * Extrai um arquivo zip para um diretório
 */
async function extractZip(zipFile: string, destination: string): Promise<void> {
  try {
    log(`Extraindo ${zipFile} para ${destination}`, 'plugin-manager');
    
    // Certifica-se de que o diretório de destino existe
    await fsPromises.mkdir(destination, { recursive: true });
    
    // Lê o arquivo zip
    const readStream = fs.createReadStream(zipFile);
    
    // Extrai o conteúdo
    await new Promise<void>((resolve, reject) => {
      readStream
        .pipe(unzipper.Extract({ path: destination }))
        .on('close', () => {
          log('Extração concluída com sucesso', 'plugin-manager');
          resolve();
        })
        .on('error', (err: Error) => {
          log(`Erro ao extrair arquivo: ${err}`, 'plugin-manager');
          reject(err);
        });
    });
  } catch (error) {
    log(`Erro ao extrair arquivo: ${error}`, 'plugin-manager');
    throw error;
  }
}

/**
 * Carrega o manifesto de um plugin
 */
async function loadManifest(pluginPath: string): Promise<PluginManifest | null> {
  try {
    // Verifica a presença do arquivo manifest.json
    const manifestPath = path.join(pluginPath, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      log(`Manifesto não encontrado em ${manifestPath}`, 'plugin-manager');
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
      log('Manifesto inválido: campos obrigatórios ausentes', 'plugin-manager');
      return null;
    }
    
    return manifest;
  } catch (error) {
    log(`Erro ao carregar manifesto: ${error}`, 'plugin-manager');
    return null;
  }
}

/**
 * Instala um plugin a partir de uma URL
 */
export async function installPluginFromUrl(url: string, activate = true): Promise<Plugin | null> {
  try {
    // Criar diretório de plugins se não existir
    await fsPromises.mkdir(PLUGINS_DIR, { recursive: true });
    
    // Fazer download do arquivo
    const tempDir = path.join(PLUGINS_DIR, '_temp');
    await fsPromises.mkdir(tempDir, { recursive: true });
    
    const filename = `plugin_${Date.now()}.zip`;
    const zipPath = path.join(tempDir, filename);
    
    await downloadFile(url, zipPath);
    
    // Extrair arquivo
    const extractPath = path.join(tempDir, `extract_${Date.now()}`);
    await extractZip(zipPath, extractPath);
    
    // Carregar manifesto
    const manifest = await loadManifest(extractPath);
    
    if (!manifest) {
      // Limpar arquivos temporários
      await fsPromises.rm(zipPath, { force: true });
      await fsPromises.rm(extractPath, { recursive: true, force: true });
      
      log('Plugin inválido: manifesto não encontrado ou inválido', 'plugin-manager');
      throw new Error('Plugin inválido: manifesto não encontrado ou inválido');
    }
    
    // Verificar se o plugin já existe
    const existingPlugin = await storage.getPluginBySlug(manifest.slug);
    
    if (existingPlugin) {
      // Limpar arquivos temporários
      await fsPromises.rm(zipPath, { force: true });
      await fsPromises.rm(extractPath, { recursive: true, force: true });
      
      log(`Plugin já instalado: ${manifest.slug}`, 'plugin-manager');
      throw new Error(`Plugin já instalado: ${manifest.slug}`);
    }
    
    // Criar diretório final para o plugin
    const pluginDir = path.join(PLUGINS_DIR, manifest.slug);
    
    // Se já existir um diretório com este nome, remova-o
    if (fs.existsSync(pluginDir)) {
      await fsPromises.rm(pluginDir, { recursive: true, force: true });
    }
    
    // Mover os arquivos extraídos para o diretório final
    await fsPromises.rename(extractPath, pluginDir);
    
    // Registrar o plugin no banco de dados
    const newPlugin: InsertPlugin = {
      name: manifest.name,
      slug: manifest.slug,
      description: manifest.description || null,
      version: manifest.version,
      author: manifest.author || null,
      homepageUrl: manifest.homepage || null,
      repositoryUrl: manifest.repository || null,
      icon: manifest.icon || null,
      isActive: activate,
      isCore: false,
      installPath: pluginDir,
      manifest
    };
    
    const plugin = await storage.createPlugin(newPlugin);
    
    // Limpar arquivos temporários
    await fsPromises.rm(zipPath, { force: true });
    
    log(`Plugin instalado com sucesso: ${manifest.name} (${manifest.slug}) v${manifest.version}`, 'plugin-manager');
    return plugin;
  } catch (error) {
    log(`Erro ao instalar plugin: ${error}`, 'plugin-manager');
    throw error;
  }
}

/**
 * Atualiza um plugin existente a partir de uma URL
 */
export async function updatePluginFromUrl(pluginId: number, url: string): Promise<Plugin | null> {
  try {
    // Verificar se o plugin existe
    const existingPlugin = await storage.getPlugin(pluginId);
    
    if (!existingPlugin) {
      log(`Plugin não encontrado: ID ${pluginId}`, 'plugin-manager');
      throw new Error(`Plugin não encontrado: ID ${pluginId}`);
    }
    
    // Desativar o plugin temporariamente
    const wasActive = existingPlugin.isActive;
    if (wasActive) {
      await storage.deactivatePlugin(pluginId);
    }
    
    // Fazer download do arquivo
    const tempDir = path.join(PLUGINS_DIR, '_temp');
    await fsPromises.mkdir(tempDir, { recursive: true });
    
    const filename = `plugin_update_${Date.now()}.zip`;
    const zipPath = path.join(tempDir, filename);
    
    await downloadFile(url, zipPath);
    
    // Extrair arquivo
    const extractPath = path.join(tempDir, `extract_update_${Date.now()}`);
    await extractZip(zipPath, extractPath);
    
    // Carregar manifesto
    const manifest = await loadManifest(extractPath);
    
    if (!manifest) {
      // Limpar arquivos temporários
      await fsPromises.rm(zipPath, { force: true });
      await fsPromises.rm(extractPath, { recursive: true, force: true });
      
      // Restaurar estado anterior de ativação
      if (wasActive) {
        await storage.activatePlugin(pluginId);
      }
      
      log('Plugin inválido: manifesto não encontrado ou inválido', 'plugin-manager');
      throw new Error('Plugin inválido: manifesto não encontrado ou inválido');
    }
    
    // Verificar se o slug corresponde ao plugin existente
    if (manifest.slug !== existingPlugin.slug) {
      // Limpar arquivos temporários
      await fsPromises.rm(zipPath, { force: true });
      await fsPromises.rm(extractPath, { recursive: true, force: true });
      
      // Restaurar estado anterior de ativação
      if (wasActive) {
        await storage.activatePlugin(pluginId);
      }
      
      log(`Incompatibilidade de plugins: esperado ${existingPlugin.slug}, recebido ${manifest.slug}`, 'plugin-manager');
      throw new Error(`Incompatibilidade de plugins: esperado ${existingPlugin.slug}, recebido ${manifest.slug}`);
    }
    
    // Backup do diretório atual do plugin
    const pluginDir = existingPlugin.installPath;
    const backupDir = path.join(PLUGINS_DIR, `_backup_${existingPlugin.slug}_${Date.now()}`);
    
    if (pluginDir && fs.existsSync(pluginDir)) {
      await fsPromises.rename(pluginDir, backupDir);
    }
    
    // Mover os arquivos extraídos para o diretório do plugin
    const newPluginDir = path.join(PLUGINS_DIR, manifest.slug);
    await fsPromises.rename(extractPath, newPluginDir);
    
    try {
      // Atualizar o plugin no banco de dados
      const updatedPlugin = await storage.updatePlugin(pluginId, {
        name: manifest.name,
        description: manifest.description || null,
        version: manifest.version,
        author: manifest.author || null,
        homepageUrl: manifest.homepage || null,
        repositoryUrl: manifest.repository || null,
        icon: manifest.icon || null,
        installPath: newPluginDir,
        manifest,
        updatedAt: new Date()
      });
      
      // Restaurar estado anterior de ativação
      if (wasActive) {
        await storage.activatePlugin(pluginId);
      }
      
      // Limpar arquivos temporários
      await fsPromises.rm(zipPath, { force: true });
      await fsPromises.rm(backupDir, { recursive: true, force: true });
      
      log(`Plugin atualizado com sucesso: ${manifest.name} (${manifest.slug}) v${manifest.version}`, 'plugin-manager');
      return updatedPlugin;
    } catch (error) {
      // Em caso de erro, restaurar o backup
      if (fs.existsSync(backupDir)) {
        // Remover o diretório com a atualização falha
        await fsPromises.rm(newPluginDir, { recursive: true, force: true });
        // Restaurar o backup
        await fsPromises.rename(backupDir, pluginDir || path.join(PLUGINS_DIR, existingPlugin.slug));
      }
      
      // Restaurar estado anterior de ativação
      if (wasActive) {
        await storage.activatePlugin(pluginId);
      }
      
      log(`Erro ao atualizar plugin no banco de dados: ${error}`, 'plugin-manager');
      throw error;
    }
  } catch (error) {
    log(`Erro ao atualizar plugin: ${error}`, 'plugin-manager');
    throw error;
  }
}

/**
 * Desinstala um plugin pelo ID
 */
export async function uninstallPlugin(pluginId: number): Promise<boolean> {
  try {
    // Verificar se o plugin existe
    const plugin = await storage.getPlugin(pluginId);
    
    if (!plugin) {
      log(`Plugin não encontrado: ID ${pluginId}`, 'plugin-manager');
      return false;
    }
    
    // Não permitir desinstalar plugins core
    if (plugin.isCore) {
      log(`Não é possível desinstalar um plugin core: ${plugin.slug}`, 'plugin-manager');
      return false;
    }
    
    // Remover o diretório do plugin
    if (plugin.installPath && fs.existsSync(plugin.installPath)) {
      await fsPromises.rm(plugin.installPath, { recursive: true, force: true });
    }
    
    // Remover o plugin do banco de dados
    const deleted = await storage.deletePlugin(pluginId);
    
    if (deleted) {
      log(`Plugin desinstalado com sucesso: ${plugin.name} (${plugin.slug})`, 'plugin-manager');
    } else {
      log(`Falha ao remover plugin do banco de dados: ${plugin.slug}`, 'plugin-manager');
    }
    
    return deleted;
  } catch (error) {
    log(`Erro ao desinstalar plugin: ${error}`, 'plugin-manager');
    return false;
  }
}

/**
 * Obtém o diretório de instalação de plugins
 */
export function getPluginsDirectory(): string {
  return PLUGINS_DIR;
}

/**
 * Obtém o diretório de um plugin específico
 */
export async function getPluginDirectory(pluginIdOrSlug: number | string): Promise<string | null> {
  try {
    let plugin: Plugin | undefined;
    
    if (typeof pluginIdOrSlug === 'number') {
      plugin = await storage.getPlugin(pluginIdOrSlug);
    } else {
      plugin = await storage.getPluginBySlug(pluginIdOrSlug);
    }
    
    if (!plugin || !plugin.installPath) {
      return null;
    }
    
    return plugin.installPath;
  } catch (error) {
    log(`Erro ao obter diretório do plugin: ${error}`, 'plugin-manager');
    return null;
  }
}

export default {
  installPluginFromUrl,
  updatePluginFromUrl,
  uninstallPlugin,
  getPluginsDirectory,
  getPluginDirectory
};