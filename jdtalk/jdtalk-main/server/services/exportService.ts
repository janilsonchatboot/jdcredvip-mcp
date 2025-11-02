import fs from 'fs';
import path from 'path';
import { storage } from '../storage';

/**
 * Serviço para exportação de dados do sistema para formatos externos (CSV, Excel, etc)
 */
export class ExportService {
  /**
   * Exporta dados de clientes para um arquivo CSV
   */
  async exportCustomersToCSV(outputPath: string = 'exports/customers.csv'): Promise<string> {
    try {
      // Obter todos os clientes (vamos usar um método que ainda não existe, mas podemos implementar)
      const customers = await this.getAllCustomers();
      
      // Definir cabeçalhos
      const headers = [
        'ID', 
        'Nome', 
        'Telefone', 
        'Email', 
        'Endereço', 
        'Cidade', 
        'Estado', 
        'CEP', 
        'Notas', 
        'Data de Criação'
      ];
      
      // Converter dados para formato CSV
      let csvContent = headers.join(',') + '\n';
      
      for (const customer of customers) {
        const row = [
          customer.id,
          this.escapeCSV(customer.name),
          this.escapeCSV(customer.phoneNumber),
          this.escapeCSV(customer.email || ''),
          this.escapeCSV(customer.address || ''),
          this.escapeCSV(customer.city || ''),
          this.escapeCSV(customer.state || ''),
          this.escapeCSV(customer.zipCode || ''),
          this.escapeCSV(customer.notes || ''),
          customer.createdAt instanceof Date ? customer.createdAt.toISOString() : customer.createdAt
        ];
        
        csvContent += row.join(',') + '\n';
      }
      
      // Garantir que o diretório existe
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Salvar o arquivo
      fs.writeFileSync(outputPath, csvContent);
      
      return outputPath;
    } catch (error) {
      console.error('Erro ao exportar clientes para CSV:', error);
      throw error;
    }
  }
  
  /**
   * Exporta dados de conversas para um arquivo CSV
   * Inclui detalhes dos clientes e mensagens para uso em treinamento de IA
   */
  async exportConversationsToCSV(outputPath: string = 'exports/conversations.csv'): Promise<string> {
    try {
      // Obter todas as conversas com clientes
      const conversations = await storage.getConversationsWithCustomers();
      
      // Definir cabeçalhos
      const headers = [
        'ID da Conversa',
        'Nome do Cliente',
        'Telefone do Cliente',
        'Status da Conversa',
        'Canal',
        'Data de Criação',
        'Última Atualização',
        'Perguntas do Cliente',
        'Respostas do Sistema',
        'Assuntos Abordados'
      ];
      
      // Converter dados para formato CSV
      let csvContent = headers.join(',') + '\n';
      
      for (const conversation of conversations) {
        // Buscar mensagens da conversa
        const messages = await storage.getMessagesByConversationId(conversation.id);
        
        // Separar perguntas e respostas
        const customerMessages = messages
          .filter(msg => msg.senderType === 'customer')
          .map(msg => this.escapeCSV(msg.content ?? ''))
          .join('||');

        const systemMessages = messages
          .filter(msg => msg.senderType === 'user')
          .map(msg => this.escapeCSV(msg.content ?? ''))
          .join('||');

        // Identificar assuntos (simplesmente agrupando palavras-chave)
        const conversationTopics = this.identifyTopics(
          messages
            .map(msg => msg.content ?? '')
            .filter((content): content is string => content.length > 0),
        );

        const updatedAt = conversation.lastMessageAt
          ? conversation.lastMessageAt instanceof Date
            ? conversation.lastMessageAt.toISOString()
            : conversation.lastMessageAt
          : 'N/A';

        const row = [
          conversation.id,
          this.escapeCSV(conversation.customer.name ?? 'Cliente'),
          this.escapeCSV(conversation.customer.phoneNumber),
          'N/A',
          'whatsapp',
          'N/A',
          updatedAt,
          customerMessages,
          systemMessages,
          this.escapeCSV(conversationTopics.join(', '))
        ];
        
        csvContent += row.join(',') + '\n';
      }
      
      // Garantir que o diretório existe
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Salvar o arquivo
      fs.writeFileSync(outputPath, csvContent);
      
      return outputPath;
    } catch (error) {
      console.error('Erro ao exportar conversas para CSV:', error);
      throw error;
    }
  }
  
  /**
   * Exporta dados de treinamento de IA para um arquivo CSV
   * Inclui perguntas e respostas específicas para treinamento
   */
  async exportTrainingDataToCSV(outputPath: string = 'exports/training_data.csv'): Promise<string> {
    try {
      // Obter todas as conversas com clientes
      const conversations = await storage.getConversationsWithCustomers();
      
      // Definir cabeçalhos
      const headers = [
        'Pergunta',
        'Resposta',
        'Tópico',
        'Produto'
      ];
      
      // Converter dados para formato CSV
      let csvContent = headers.join(',') + '\n';
      let pairs: {question: string, answer: string, topic: string, product: string}[] = [];
      
      for (const conversation of conversations) {
        // Buscar mensagens da conversa
        const messages = await storage.getMessagesByConversationId(conversation.id);
        
        // Criar pares de perguntas e respostas
        for (let i = 0; i < messages.length - 1; i++) {
          if (messages[i].senderType === 'customer' && messages[i+1].senderType === 'user') {
            const question = messages[i].content ?? '';
            const answer = messages[i+1].content ?? '';
            
            // Identificar tópico e produto
            const topics = this.identifyTopics([question, answer]);
            const product = this.identifyProduct([question, answer]);
            
            pairs.push({
              question,
              answer,
              topic: topics.length > 0 ? topics[0] : 'Geral',
              product: product ?? 'Desconhecido'
            });
          }
        }
      }
      
      // Adicionar os pares ao CSV
      for (const pair of pairs) {
        const row = [
          this.escapeCSV(pair.question),
          this.escapeCSV(pair.answer),
          this.escapeCSV(pair.topic),
          this.escapeCSV(pair.product)
        ];
        
        csvContent += row.join(',') + '\n';
      }
      
      // Garantir que o diretório existe
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Salvar o arquivo
      fs.writeFileSync(outputPath, csvContent);
      
      return outputPath;
    } catch (error) {
      console.error('Erro ao exportar dados de treinamento para CSV:', error);
      throw error;
    }
  }
  
  /**
   * Método auxiliar para obter todos os clientes
   * Obs: Precisamos implementar esse método no storage
   */
  private async getAllCustomers() {
    // Vamos simular este método por enquanto, mas deve ser implementado no storage
    const conversations = await storage.getConversationsWithCustomers();
    const uniqueCustomers = new Map();
    
    conversations.forEach(conv => {
      if (!uniqueCustomers.has(conv.customer.id)) {
        uniqueCustomers.set(conv.customer.id, conv.customer);
      }
    });
    
    return Array.from(uniqueCustomers.values());
  }
  
  /**
   * Escapa strings para formato CSV
   */
  private escapeCSV(text: string): string {
    if (!text) return '';
    
    // Se contiver vírgulas, aspas ou quebras de linha, coloque entre aspas duplas
    if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
      // Substituir aspas duplas por duas aspas duplas
      return '"' + text.replace(/"/g, '""') + '"';
    }
    
    return text;
  }
  
  /**
   * Identifica tópicos com base em palavras-chave nas mensagens
   */
  private identifyTopics(messages: string[]): string[] {
    const text = messages.join(' ').toLowerCase();
    const topics: string[] = [];
    
    // Palavras-chave para cada tópico
    const topicKeywords: Record<string, string[]> = {
      'Empréstimo Consignado': ['consignado', 'inss', 'aposentado', 'pensionista', 'benefício', 'beneficio', 'margem'],
      'Empréstimo Pessoal': ['empréstimo pessoal', 'emprestimo pessoal', 'crédito pessoal', 'credito pessoal'],
      'Antecipação FGTS': ['fgts', 'antecipação', 'antecipacao', 'saque', 'aniversário', 'aniversario'],
      'Crédito Bolsa Família': ['bolsa família', 'bolsa familia', 'auxílio brasil', 'auxilio brasil'],
      'Empréstimo Conta de Luz': ['conta de luz', 'fatura de energia', 'conta de energia', 'copel'],
      'Documentação': ['documentos', 'documentação', 'documentacao', 'rg', 'cpf', 'comprovante'],
      'Pagamento': ['pagamento', 'pago', 'parcela', 'vencimento', 'atraso', 'juros'],
      'Contrato': ['contrato', 'assinar', 'assinatura', 'termo', 'acordo'],
      'Dúvidas Gerais': ['dúvida', 'duvida', 'ajuda', 'informação', 'informacao', 'como']
    };
    
    // Verificar cada tópico
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        topics.push(topic);
      }
    }
    
    // Se nenhum tópico foi identificado, retornar "Geral"
    if (topics.length === 0) {
      topics.push('Geral');
    }
    
    return topics;
  }
  
  /**
   * Identifica o produto mencionado nas mensagens
   */
  private identifyProduct(messages: string[]): string {
    const text = messages.join(' ').toLowerCase();
    
    // Produtos disponíveis
    const products: Record<string, string[]> = {
      'Consignado INSS': ['inss', 'aposentado', 'pensionista', 'benefício', 'beneficio'],
      'Consignado Servidor': ['servidor', 'prefeitura', 'municipal', 'estadual', 'federal'],
      'Antecipação FGTS': ['fgts', 'saque aniversário', 'saque aniversario'],
      'Crédito Bolsa Família': ['bolsa família', 'bolsa familia', 'auxílio brasil', 'auxilio brasil'],
      'Empréstimo Pessoal': ['pessoal', 'sem garantia'],
      'Empréstimo Conta de Luz': ['conta de luz', 'energia', 'copel']
    };
    
    // Verificar cada produto
    for (const [product, keywords] of Object.entries(products)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return product;
      }
    }
    
    return 'Não identificado';
  }
}

export const exportService = new ExportService();