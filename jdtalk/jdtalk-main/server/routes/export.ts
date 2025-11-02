import { Express, Request, Response } from 'express';
import path from 'path';
import { exportService } from '../services/exportService';

export function registerExportRoutes(app: Express) {
  // Criar diretório de exportação se não existir
  const exportDir = path.join(process.cwd(), 'exports');
  
  // Rota para exportar clientes para CSV
  app.get('/api/export/customers', async (req: Request, res: Response) => {
    try {
      const outputPath = path.join(exportDir, `customers_${Date.now()}.csv`);
      const filePath = await exportService.exportCustomersToCSV(outputPath);
      
      res.download(filePath, 'clientes.csv', (err) => {
        if (err) {
          console.error('Erro ao enviar arquivo CSV:', err);
        }
      });
    } catch (error) {
      console.error('Erro ao exportar clientes:', error);
      res.status(500).json({ error: 'Falha ao exportar clientes para CSV' });
    }
  });
  
  // Rota para exportar conversas para CSV
  app.get('/api/export/conversations', async (req: Request, res: Response) => {
    try {
      const outputPath = path.join(exportDir, `conversations_${Date.now()}.csv`);
      const filePath = await exportService.exportConversationsToCSV(outputPath);
      
      res.download(filePath, 'conversas.csv', (err) => {
        if (err) {
          console.error('Erro ao enviar arquivo CSV:', err);
        }
      });
    } catch (error) {
      console.error('Erro ao exportar conversas:', error);
      res.status(500).json({ error: 'Falha ao exportar conversas para CSV' });
    }
  });
  
  // Rota para exportar dados de treinamento para CSV
  app.get('/api/export/training-data', async (req: Request, res: Response) => {
    try {
      const outputPath = path.join(exportDir, `training_data_${Date.now()}.csv`);
      const filePath = await exportService.exportTrainingDataToCSV(outputPath);
      
      res.download(filePath, 'dados_treinamento.csv', (err) => {
        if (err) {
          console.error('Erro ao enviar arquivo CSV:', err);
        }
      });
    } catch (error) {
      console.error('Erro ao exportar dados de treinamento:', error);
      res.status(500).json({ error: 'Falha ao exportar dados de treinamento para CSV' });
    }
  });
}