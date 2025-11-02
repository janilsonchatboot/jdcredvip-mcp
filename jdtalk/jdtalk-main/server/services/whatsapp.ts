import axios from "axios";
import { storage } from "../storage";
import { openAIService } from "./openai";
import WebSocket, { RawData, WebSocketServer } from "ws";
import {
  WebSocketMessage,
  InsertMessage,
  InsertCustomer,
  InsertConversation,
  Customer,
  Conversation,
} from "@shared/schema";
import { Server } from "http";
import { MultiDeviceManager } from "./multi-device";

interface WebhookPayload {
  entry: Array<{
    changes: Array<{
      value: {
        metadata: {
          phone_number_id: string;
          display_phone_number: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          type: "text" | "image" | "audio" | "document" | "location" | "button";
          text?: {
            body: string;
          };
          image?: {
            caption?: string;
            mime_type: string;
            sha256: string;
            id: string;
          };
          audio?: {
            mime_type: string;
            sha256: string;
            id: string;
            voice: boolean;
          };
          document?: {
            caption?: string;
            filename: string;
            mime_type: string;
            sha256: string;
            id: string;
          };
        }>;
      };
    }>;
  }>;
}

export class WhatsAppService {
  private token: string | null = null;
  private phoneNumberId: string | null = null;
  private webhookSecret: string | null = null;
  private webSocketServer: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private autoReplyEnabled: boolean = true;
  private initialized: boolean = false;
  private multiDeviceManager: MultiDeviceManager | null = null;

  constructor() {}

  /**
   * Inicializa o serviço com token e IDs necessários
   */
  initialize(token: string, phoneNumberId: string, webhookSecret: string, server: Server) {
    this.token = token;
    this.phoneNumberId = phoneNumberId;
    this.webhookSecret = webhookSecret;
    this.initialized = true;
    
    // Inicializa o gerenciador multi-dispositivo
    this.multiDeviceManager = new MultiDeviceManager(this);
    console.log("Multi-device manager initialized");

    // Inicializa WebSocket para comunicação em tempo real
    this.webSocketServer = new WebSocketServer({ server });
    this.webSocketServer.on("connection", (ws: WebSocket) => {
      console.log("New WebSocket client connected");
      this.clients.add(ws);

      ws.on("message", async (message: RawData) => {
        try {
          const parsedMessage = JSON.parse(message.toString()) as {
            type: string;
            payload: any;
          };

          if (parsedMessage.type === "toggleAutoReply") {
            this.autoReplyEnabled = parsedMessage.payload.enabled;
            console.log(`Auto reply ${this.autoReplyEnabled ? "enabled" : "disabled"}`);
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        console.log("WebSocket client disconnected");
      });
    });

    console.log("WhatsApp service initialized");
  }

  /**
   * Verifica status da inicialização
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Ativa ou desativa as respostas automáticas
   */
  setAutoReplyEnabled(enabled: boolean): void {
    this.autoReplyEnabled = enabled;
    console.log(`Auto-reply ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Retorna o estado atual de respostas automáticas
   */
  isAutoReplyEnabled(): boolean {
    return this.autoReplyEnabled;
  }
  
  /**
   * Retorna o gerenciador de múltiplos dispositivos
   */
  getMultiDeviceManager(): MultiDeviceManager | null {
    return this.multiDeviceManager;
  }

  /**
   * Manipula webhook do WhatsApp (recebimento de mensagens)
   */
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      const entry = payload.entry[0];
      const changes = entry.changes[0];
      const value = changes.value;
      const messages = value.messages;

      if (!messages || messages.length === 0) {
        return;
      }

      const message = messages[0];
      const from = message.from;
      const timestamp = new Date(parseInt(message.timestamp) * 1000);
      
      // Verificar se a mensagem veio do dispositivo móvel ou da API
      let isFromDevice = false;
      let messageId = message.id;
      
      if (this.multiDeviceManager) {
        // Processa a mensagem pelo gerenciador multi-dispositivo
        const result = await this.multiDeviceManager.processWebhookMessage(
          messageId,
          from,
          message.text?.body || null,
          null, // mediaUrl será obtido depois se necessário
          null, // mediaType será determinado depois se necessário
          timestamp,
          value.metadata
        );
        
        // Se a mensagem já foi processada, pular
        if (!result.messageData) {
          console.log(`Mensagem ${messageId} já foi processada anteriormente.`);
          return;
        }
        
        isFromDevice = result.isFromDevice;
        console.log(`Mensagem ${isFromDevice ? 'do dispositivo' : 'da API'} recebida: ${messageId}`);
      }

      // Busca ou cria o cliente baseado no número do WhatsApp
      let customer = await storage.getCustomerByPhone(from);
      if (!customer) {
        const contact = value.contacts && value.contacts[0];
        const name = contact ? contact.profile.name : `Unknown (${from})`;
        
        const newCustomer: InsertCustomer = {
          phoneNumber: from,
          name,
          whatsappId: from,
          customerSince: new Date(),
          email: null,
        };
        
        customer = await storage.createCustomer(newCustomer);
        console.log(`New customer created: ${customer.name}`);
      }

      // Busca ou cria conversa para o cliente
      let conversation = await storage.getConversationByCustomerId(customer.id);
      if (!conversation) {
        const newConversation: InsertConversation = {
          customerId: customer.id,
          lastMessageAt: timestamp,
          unreadCount: 1,
        };
        
        conversation = await storage.createConversation(newConversation);
        console.log(`New conversation created for: ${customer.name}`);

        // Notifica clientes conectados por WebSocket
        this.broadcastToClients({
          type: "new_conversation",
          payload: {
            id: conversation.id,
            customer: customer,
            lastMessageAt: conversation.lastMessageAt,
            unreadCount: conversation.unreadCount
          }
        });
      } else {
        // Atualiza conversa existente
        await storage.updateConversation(conversation.id, { 
          lastMessageAt: timestamp,
          unreadCount: conversation.unreadCount + 1 
        });
      }

      // Processamento baseado no tipo de mensagem
      let content: string | null = null;
      let mediaType: "image" | "audio" | "file" | null = null;
      let mediaUrl: string | null = null;

      if (message.type === "text" && message.text) {
        content = message.text.body;
      } else if (message.type === "image" && message.image) {
        mediaType = "image";
        mediaUrl = await this.downloadMedia(message.image.id);
        content = message.image.caption || null;
      } else if (message.type === "audio" && message.audio) {
        mediaType = "audio";
        mediaUrl = await this.downloadMedia(message.audio.id);
      } else if (message.type === "document" && message.document) {
        mediaType = "file";
        mediaUrl = await this.downloadMedia(message.document.id);
        content = message.document.caption || message.document.filename || null;
      }

      // Salva a mensagem recebida
      const newMessage: InsertMessage = {
        conversationId: conversation.id,
        senderId: from,
        senderType: "customer",
        content,
        mediaType,
        mediaUrl,
        timestamp,
        status: "delivered",
      };
      
      const savedMessage = await storage.createMessage(newMessage);
      console.log(`Message from ${customer.name} received and saved`);

      // Notifica clientes conectados por WebSocket
      this.broadcastToClients({
        type: "new_message",
        payload: savedMessage
      });

      // Resposta automática se ativada
      if (this.autoReplyEnabled) {
        await this.handleAutomaticReply(conversation.id, content || "");
      }
    } catch (error) {
      console.error("Error handling webhook:", error);
    }
  }

  /**
   * Gera e envia resposta automática usando OpenAI quando ativado
   */
  private async handleAutomaticReply(conversationId: number, messageContent: string): Promise<void> {
    try {
      // Busca mensagens da conversa para contexto
      const messages = await storage.getMessagesByConversationId(conversationId);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        throw new Error("Conversation not found");
      }
      
      const customer = await storage.getCustomer(conversation.customerId);
      
      if (!customer) {
        throw new Error("Customer not found");
      }

      // Formata mensagens para o formato esperado pelo OpenAI
      const formatMessages = messages.slice(-10).map((msg): { role: "user" | "assistant"; content: string } => ({
        role: msg.senderType === "customer" ? "user" : "assistant",
        content: msg.content ?? "(Mídia enviada)",
      }));

      // Detectar leads potenciais
      const leadInfo = await openAIService.detectLeadIntent(messageContent);
      
      // Criar lead automático se detectado com confiança alta
      if (leadInfo.isLead && leadInfo.confidence > 0.7) {
        await this.createLeadFromConversation(conversation, customer, leadInfo);
      }

      // Gera resposta com OpenAI
      const response = await openAIService.generateChatbotResponse(
        messageContent,
        formatMessages
      );

      // Salva a resposta no banco de dados
      const botMessage = await storage.createMessage({
        conversationId,
        senderId: "chatbot",
        senderType: "agent",
        content: response,
        mediaType: null,
        mediaUrl: null,
        timestamp: new Date(),
        status: "sent"
      });

      // Envia resposta ao cliente via WhatsApp
      if (response) {
        const sent = await this.sendWhatsAppMessage(
          customer.phoneNumber,
          response, 
          null
        );
        
        if (sent) {
          // Atualiza o status da mensagem para "delivered"
          await storage.updateMessageStatus(botMessage.id, "delivered");
          
          // Notifica clientes conectados por WebSocket
          this.broadcastToClients({
            type: "new_message",
            payload: {
              ...botMessage,
              status: "delivered"
            }
          });
        }
      }
    } catch (error) {
      console.error("Error generating automatic reply:", error);
    }
  }
  
  /**
   * Cria um lead automaticamente a partir de uma conversa de WhatsApp
   */
  private async createLeadFromConversation(
    conversation: Conversation, 
    customer: Customer, 
    leadInfo: {
      isLead: boolean;
      confidence: number;
      loanType?: string;
      loanAmount?: number;
      clientType?: string;
      urgency: "low" | "medium" | "high";
      notes?: string;
    }
  ): Promise<void> {
    try {
      // Verificar se já existe um lead para esta conversa
      const existingLead = await storage.getLeadByConversation(conversation.id);
      if (existingLead) {
        console.log(`Lead already exists for conversation ${conversation.id}`);
        return;
      }
      
      // Buscar pipeline padrão e estágio inicial
      const pipelines = await storage.getPipelines();
      if (pipelines.length === 0) {
        console.log("No pipeline found to create lead");
        return;
      }
      
      const defaultPipeline = pipelines[0];
      const stages = await storage.getPipelineStages(defaultPipeline.id);
      if (stages.length === 0) {
        console.log("No stages found in pipeline to create lead");
        return;
      }
      
      // Usar o primeiro estágio (normalmente "Novo Lead" ou similar)
      const initialStage = stages[0];
      
      // Formatação do título do lead
      const loanTypeText = leadInfo.loanType ? 
        `[${leadInfo.loanType.toUpperCase()}]` : 
        '';
      
      const amountText = leadInfo.loanAmount ? 
        `R$ ${leadInfo.loanAmount.toLocaleString('pt-BR')}` : 
        '';
      
      // Criar lead
      const newLead = await storage.createLead({
        title: `${loanTypeText} ${customer.name || "Cliente"} ${amountText}`.trim(),
        customerId: customer.id,
        stageId: initialStage.id,
        pipelineId: defaultPipeline.id,
        status: "active",
        conversationId: conversation.id,
        amount: leadInfo.loanAmount ? leadInfo.loanAmount.toString() : null,
        productType: leadInfo.loanType || null,
        assignedTo: null,
        description: `Lead criado automaticamente com urgência ${leadInfo.urgency}.`,
        expiresAt: null,
      });
      
      // Adicionar nota com detalhes do lead
      const noteContent = `Lead criado automaticamente:
Tipo de empréstimo: ${leadInfo.loanType || 'Não especificado'}
Perfil de cliente: ${leadInfo.clientType || 'Não especificado'}
Valor estimado: ${leadInfo.loanAmount ? `R$ ${leadInfo.loanAmount.toLocaleString('pt-BR')}` : 'Não especificado'}
Urgência: ${leadInfo.urgency}
Observações: ${leadInfo.notes || 'N/A'}`;

      await storage.createLeadActivity({
        leadId: newLead.id,
        type: "note",
        content: noteContent,
        userId: 1, // ID do sistema/bot
        scheduledAt: null,
        completedAt: null,
      });
      
      console.log(`Lead ${newLead.id} created automatically from conversation ${conversation.id}`);
      
      // Notificar via websocket
      this.broadcastToClients({
        type: "lead_update",
        payload: {
          action: "created",
          leadId: newLead.id
        }
      });
      
    } catch (error) {
      console.error("Error creating lead from conversation:", error);
    }
  }

  /**
   * Envia mensagem para um número de WhatsApp
   */
  async sendWhatsAppMessage(
    to: string,
    text: string | null,
    mediaUrl: string | null,
    mediaType: "image" | "audio" | "document" | null = null
  ): Promise<boolean> {
    if (!this.isInitialized()) {
      console.error("WhatsApp service not initialized");
      return false;
    }

    try {
      let messageData: any = {};

      if (text && !mediaUrl) {
        // Mensagem de texto
        messageData = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: {
            body: text
          }
        };
      } else if (mediaUrl) {
        // Mensagem com mídia
        messageData = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: mediaType,
          [mediaType as string]: {
            link: mediaUrl,
            caption: text || undefined
          }
        };
      } else {
        console.error("Invalid message: must provide text or media");
        return false;
      }

      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
      
      const response = await axios.post(url, messageData, {
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        }
      });

      // Processa a resposta da API
      if (response.data && response.data.messages && response.data.messages.length > 0) {
        const messageId = response.data.messages[0].id;
        console.log(`Message sent with ID: ${messageId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      return false;
    }
  }

  /**
   * Faz download de mídia do WhatsApp
   */
  private async downloadMedia(mediaId: string): Promise<string> {
    if (!this.isInitialized()) {
      throw new Error("WhatsApp service not initialized");
    }

    try {
      // Primeiro, obtem a URL da mídia
      const mediaUrl = `https://graph.facebook.com/v18.0/${mediaId}`;
      const mediaInfoResponse = await axios.get(mediaUrl, {
        headers: {
          "Authorization": `Bearer ${this.token}`
        }
      });

      // Baixa a mídia
      if (mediaInfoResponse.data && mediaInfoResponse.data.url) {
        const downloadUrl = mediaInfoResponse.data.url;
        const mediaResponse = await axios.get(downloadUrl, {
          headers: {
            "Authorization": `Bearer ${this.token}`
          },
          responseType: "arraybuffer"
        });

        // Em um sistema real, você armazenaria esse arquivo em um serviço como S3
        // Aqui apenas retornamos uma URL fictícia, já que não podemos armazenar arquivos
        return `https://media.example.com/${mediaId}`;
      }

      throw new Error("Failed to download media");
    } catch (error) {
      console.error("Error downloading media:", error);
      throw error;
    }
  }

  /**
   * Envia mensagem para todos os clientes WebSocket conectados
   */
  broadcastToClients(message: WebSocketMessage): void {
    const messageString = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }

  /**
   * Verifica webhook
   */
  verifyWebhook(mode: string, token: string): boolean {
    return mode === "subscribe" && token === this.webhookSecret;
  }
}

export const whatsAppService = new WhatsAppService();
