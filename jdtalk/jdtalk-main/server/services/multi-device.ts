/**
 * Serviço de gerenciamento Multi-Device para WhatsApp
 * Permite sincronização entre mensagens enviadas pelo celular e pela API
 */
import { storage } from "../storage";
import { WhatsAppService } from "./whatsapp";
import { Customer, Conversation, InsertConversation, InsertMessage, InsertCustomer } from "@shared/schema";

interface MessageSourceData {
  source: 'api' | 'device';
  messageId: string;
  phoneNumber: string;
  content?: string;
  mediaUrl?: string;
  timestamp: number;
}

export class MultiDeviceManager {
  private whatsappService: WhatsAppService;
  private messageRegistry: Set<string> = new Set();  // Para evitar duplicação
  private deviceMessageQueue: MessageSourceData[] = [];  // Fila de mensagens do dispositivo
  private processingQueue: boolean = false;
  
  constructor(whatsappService: WhatsAppService) {
    this.whatsappService = whatsappService;
    
    // Inicializar timer para processar mensagens
    setInterval(() => this.processDeviceQueue(), 10000); // A cada 10 segundos
  }
  
  /**
   * Registra uma mensagem recebida do webhook e determina sua origem
   */
  async processWebhookMessage(
    messageId: string,
    from: string,
    content: string | null,
    mediaUrl: string | null,
    mediaType: string | null,
    timestamp: Date,
    metadata: any
  ): Promise<{ messageData: any, isFromDevice: boolean }> {
    // Verificar se esta mensagem já foi processada
    if (this.messageRegistry.has(messageId)) {
      console.log(`Mensagem ${messageId} já processada anteriormente.`);
      return { messageData: null, isFromDevice: false };
    }
    
    // Registrar ID para evitar duplicidade
    this.messageRegistry.add(messageId);
    
    // Limitar o tamanho do registro para não consumir muita memória
    if (this.messageRegistry.size > 1000) {
      // Remover os IDs mais antigos (aproximadamente)
      const itemsToRemove = Array.from(this.messageRegistry).slice(0, 200);
      itemsToRemove.forEach(id => this.messageRegistry.delete(id));
    }
    
    // Determinar se a mensagem veio do dispositivo ou da API
    // Mensagens enviadas pela API têm metadados específicos e formato distinto
    const isFromDevice = this.determineIfFromDevice(metadata);
    
    // Se for do dispositivo, adicionar à fila de processamento
    if (isFromDevice) {
      this.deviceMessageQueue.push({
        source: 'device',
        messageId,
        phoneNumber: from,
        content: content || undefined,
        mediaUrl: mediaUrl || undefined,
        timestamp: timestamp.getTime()
      });
      
      // Iniciar processamento da fila
      if (!this.processingQueue) {
        this.processDeviceQueue();
      }
    }
    
    // Retornar os dados da mensagem com a flag de origem
    return {
      messageData: {
        id: messageId,
        from,
        content,
        mediaUrl,
        mediaType,
        timestamp,
        metadata,
        from_device: isFromDevice
      },
      isFromDevice
    };
  }
  
  /**
   * Analisa características da mensagem para determinar se veio do dispositivo móvel
   */
  private determineIfFromDevice(metadata: any): boolean {
    // Verifica metadados específicos da API do WhatsApp
    // Mensagens da API geralmente incluem metadados de autenticação e identificadores
    if (metadata && metadata.api_source) {
      return false;
    }
    
    if (metadata && metadata.sent_from_server === true) {
      return false;
    }
    
    // Considerar mensagens sem metadados específicos como vindas do dispositivo
    return true;
  }
  
  /**
   * Processa a fila de mensagens do dispositivo
   */
  private async processDeviceQueue(): Promise<void> {
    if (this.processingQueue || this.deviceMessageQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    
    try {
      // Processar em lotes para melhor performance
      const batch = this.deviceMessageQueue.splice(0, Math.min(10, this.deviceMessageQueue.length));
      
      for (const message of batch) {
        await this.saveDeviceMessage(message);
      }
    } catch (error) {
      console.error('Erro ao processar fila de mensagens do dispositivo:', error);
    } finally {
      this.processingQueue = false;
      
      // Se ainda houver mensagens, continuar processando
      if (this.deviceMessageQueue.length > 0) {
        setTimeout(() => this.processDeviceQueue(), 1000);
      }
    }
  }
  
  /**
   * Salva mensagem enviada pelo dispositivo no banco de dados
   */
  private async saveDeviceMessage(message: MessageSourceData): Promise<void> {
    try {
      // Buscar ou criar cliente
      let customer = await storage.getCustomerByPhone(message.phoneNumber);
      if (!customer) {
        const newCustomer: InsertCustomer = {
          phoneNumber: message.phoneNumber,
          name: `Cliente (${message.phoneNumber})`,
          whatsappId: message.phoneNumber,
          customerSince: new Date(),
          email: null,
        };
        
        customer = await storage.createCustomer(newCustomer);
      }
      
      // Buscar ou criar conversa
      let conversation = await storage.getConversationByCustomerId(customer.id);
      if (!conversation) {
        const newConversation: InsertConversation = {
          customerId: customer.id,
          lastMessageAt: new Date(message.timestamp),
          unreadCount: 0,
        };
        
        conversation = await storage.createConversation(newConversation);
      }
      
      // Criar mensagem
      // Importante: Marcamos como agent (e não customer) pois esta é uma mensagem
      // enviada do dispositivo pelo atendente, não pelo cliente
      const messageData: InsertMessage = {
        conversationId: conversation.id,
        senderId: "device_" + message.phoneNumber, // Identificador único
        senderType: "agent", // Agente, pois veio do dispositivo do atendente
        content: message.content || null,
        mediaType: message.mediaUrl ? "file" : null,
        mediaUrl: message.mediaUrl || null,
        timestamp: new Date(message.timestamp),
        status: "sent", // Mensagens do dispositivo já foram enviadas
      };
      
      const savedMessage = await storage.createMessage(messageData);
      
      // Se tiver webhook ativo, notificar listeners
      if (this.whatsappService) {
        this.whatsappService.broadcastToClients({
          type: "new_message",
          payload: {
            ...savedMessage,
            from_device: true
          }
        });
        
        // Atualizar conversa com timestamp
        await storage.updateConversation(conversation.id, {
          lastMessageAt: new Date(message.timestamp)
        });
      }
      
      console.log(`Mensagem do dispositivo salva: ${savedMessage.id}`);
    } catch (error) {
      console.error('Erro ao salvar mensagem do dispositivo:', error);
    }
  }
  
  /**
   * Sincroniza mensagens entre dispositivo e API
   */
  async syncMessages(fromTimestamp: number): Promise<any[]> {
    // Em implementação real, você buscaria mensagens enviadas pelo celular
    // usando a API oficial do WhatsApp Business ou outras soluções
    // Para este protótipo, retornamos apenas as mensagens já armazenadas
    
    try {
      const messages = [];
      const conversations = await storage.getConversationsWithCustomers();
      
      // Para cada conversa, buscar mensagens recentes
      for (const conversation of conversations) {
        const conversationMessages = await storage.getMessagesByConversationId(conversation.id);
        
        // Filtrar apenas mensagens após o timestamp e enviadas pelo dispositivo
        const deviceMessages = conversationMessages.filter(msg => {
          return msg.timestamp.getTime() > fromTimestamp && 
                 msg.senderId.startsWith('device_');
        });
        
        messages.push(...deviceMessages.map(msg => ({
          ...msg,
          from_device: true,
          customer: conversation.customer
        })));
      }
      
      return messages;
    } catch (error) {
      console.error('Erro ao sincronizar mensagens do dispositivo:', error);
      return [];
    }
  }
}