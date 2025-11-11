// @ts-nocheck
import mysql from 'mysql2/promise';
import {
  User, InsertUser,
  Customer, InsertCustomer,
  Conversation, InsertConversation, ConversationWithCustomer,
  Message, InsertMessage,
  Ticket, InsertTicket, TicketWithDetails,
  Order, InsertOrder,
  Pipeline, InsertPipeline,
  PipelineStage, InsertPipelineStage,
  Lead, InsertLead, LeadWithDetails,
  LeadActivity, InsertLeadActivity
} from '@shared/schema';
import { IStorage } from './storage';
import { hashPassword, PASSWORD_HASH_PREFIX } from "./utils/password";

/**
 * Implementação da interface IStorage usando MySQL
 * Esta classe será usada para conectar ao banco MySQL do Hostgator
 */
export class MySQLStorage implements IStorage {
  private pool: mysql.Pool;
  
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'janils70_whatsapp',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    console.log('MySQL Database connection pool initialized');
  }
  
  /**
   * Função auxiliar para executar consultas SQL
   */
  private async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    const [rows] = await this.pool.execute(sql, params);
    return rows as T[];
  }
  
  // Implementação de User
  
  async getUser(id: number): Promise<User | undefined> {
    const users = await this.query<User>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return users[0];
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await this.query<User>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return users[0];
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const password = user.password.startsWith(`${PASSWORD_HASH_PREFIX}$`)
      ? user.password
      : hashPassword(user.password);

    const result = await this.query(
      'INSERT INTO users (username, password, displayName, role) VALUES (?, ?, ?, ?)',
      [user.username, password, user.displayName, user.role]
    );
    
    const insertId = (result as any).insertId;
    return {
      id: insertId,
      ...user,
      password,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async updateUserPassword(id: number, password: string): Promise<void> {
    await this.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [password, id]
    );
  }
  
  // Implementação de Customer
  
  async getCustomer(id: number): Promise<Customer | undefined> {
    const customers = await this.query<Customer>(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );
    return customers[0];
  }
  
  async getCustomerByPhone(phoneNumber: string): Promise<Customer | undefined> {
    const customers = await this.query<Customer>(
      'SELECT * FROM customers WHERE phoneNumber = ?',
      [phoneNumber]
    );
    return customers[0];
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const result = await this.query(
      'INSERT INTO customers (name, phoneNumber, email, address, city, state, zipCode, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        customer.name, 
        customer.phoneNumber, 
        customer.email, 
        customer.address, 
        customer.city, 
        customer.state, 
        customer.zipCode, 
        customer.notes
      ]
    );
    
    const insertId = (result as any).insertId;
    return {
      id: insertId,
      ...customer,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  async updateCustomer(id: number, customerUpdate: Partial<Customer>): Promise<Customer | undefined> {
    // Criar o conjunto de campos a serem atualizados
    const fieldsToUpdate = Object.entries(customerUpdate)
      .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .map(([key, value]) => `${key} = ?`);
    
    const values = Object.entries(customerUpdate)
      .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .map(([_, value]) => value);
    
    if (fieldsToUpdate.length === 0) {
      return this.getCustomer(id);
    }
    
    // Adicionar id e updatedAt aos valores
    values.push(new Date());
    values.push(id);
    
    await this.query(
      `UPDATE customers SET ${fieldsToUpdate.join(', ')}, updatedAt = ? WHERE id = ?`,
      values
    );
    
    return this.getCustomer(id);
  }
  
  // Implementação de Conversation
  
  async getConversation(id: number): Promise<Conversation | undefined> {
    const conversations = await this.query<Conversation>(
      'SELECT * FROM conversations WHERE id = ?',
      [id]
    );
    return conversations[0];
  }
  
  async getConversationByCustomerId(customerId: number): Promise<Conversation | undefined> {
    const conversations = await this.query<Conversation>(
      'SELECT * FROM conversations WHERE customerId = ? ORDER BY updatedAt DESC LIMIT 1',
      [customerId]
    );
    return conversations[0];
  }
  
  async getConversationsWithCustomers(): Promise<ConversationWithCustomer[]> {
    const conversations = await this.query<any>(
      `SELECT c.*, 
              cust.id as customer_id, cust.name as customer_name, cust.phoneNumber as customer_phoneNumber,
              m.id as lastMessage_id, m.content as lastMessage_content, m.timestamp as lastMessage_timestamp
       FROM conversations c
       JOIN customers cust ON c.customerId = cust.id
       LEFT JOIN (
         SELECT conversationId, id, content, timestamp,
                ROW_NUMBER() OVER (PARTITION BY conversationId ORDER BY timestamp DESC) as rn
         FROM messages
       ) m ON c.id = m.conversationId AND m.rn = 1
       ORDER BY c.updatedAt DESC`
    );
    
    return conversations.map((row: any) => ({
      id: row.id,
      customerId: row.customerId,
      status: row.status,
      channel: row.channel,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: {
        id: row.customer_id,
        name: row.customer_name,
        phoneNumber: row.customer_phoneNumber,
      },
      lastMessage: row.lastMessage_id ? {
        id: row.lastMessage_id,
        content: row.lastMessage_content,
        timestamp: row.lastMessage_timestamp,
      } : undefined,
    }));
  }
  
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const result = await this.query(
      'INSERT INTO conversations (customerId, status, channel) VALUES (?, ?, ?)',
      [conversation.customerId, conversation.status, conversation.channel]
    );
    
    const insertId = (result as any).insertId;
    return {
      id: insertId,
      ...conversation,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  async updateConversation(id: number, conversationUpdate: Partial<Conversation>): Promise<Conversation | undefined> {
    const fieldsToUpdate = Object.entries(conversationUpdate)
      .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .map(([key, value]) => `${key} = ?`);
    
    const values = Object.entries(conversationUpdate)
      .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .map(([_, value]) => value);
    
    if (fieldsToUpdate.length === 0) {
      return this.getConversation(id);
    }
    
    values.push(new Date());
    values.push(id);
    
    await this.query(
      `UPDATE conversations SET ${fieldsToUpdate.join(', ')}, updatedAt = ? WHERE id = ?`,
      values
    );
    
    return this.getConversation(id);
  }
  
  // Implementação de Message
  
  async getMessage(id: number): Promise<Message | undefined> {
    const messages = await this.query<Message>(
      'SELECT * FROM messages WHERE id = ?',
      [id]
    );
    return messages[0];
  }
  
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return this.query<Message>(
      'SELECT * FROM messages WHERE conversationId = ? ORDER BY timestamp ASC',
      [conversationId]
    );
  }
  
  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await this.query(
      'INSERT INTO messages (conversationId, senderId, senderType, content, contentType, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        message.conversationId,
        message.senderId,
        message.senderType,
        message.content,
        message.contentType,
        message.status,
        message.timestamp || new Date()
      ]
    );
    
    // Atualizar a data de atualização da conversa
    await this.query(
      'UPDATE conversations SET updatedAt = ? WHERE id = ?',
      [new Date(), message.conversationId]
    );
    
    const insertId = (result as any).insertId;
    return {
      id: insertId,
      ...message,
      timestamp: message.timestamp || new Date()
    };
  }
  
  async updateMessageStatus(id: number, status: string): Promise<Message | undefined> {
    await this.query(
      'UPDATE messages SET status = ? WHERE id = ?',
      [status, id]
    );
    
    return this.getMessage(id);
  }
  
  // Implementação de Ticket
  
  async getTicket(id: number): Promise<Ticket | undefined> {
    const tickets = await this.query<Ticket>(
      'SELECT * FROM tickets WHERE id = ?',
      [id]
    );
    return tickets[0];
  }
  
  async getTicketByConversationId(conversationId: number): Promise<Ticket | undefined> {
    const tickets = await this.query<Ticket>(
      'SELECT * FROM tickets WHERE conversationId = ? AND status != "closed" LIMIT 1',
      [conversationId]
    );
    return tickets[0];
  }
  
  async getTicketsWithDetails(): Promise<TicketWithDetails[]> {
    const tickets = await this.query<any>(
      `SELECT t.*,
              c.status as conversation_status, c.channel as conversation_channel,
              cust.id as customer_id, cust.name as customer_name, cust.phoneNumber as customer_phoneNumber,
              u.id as assignedTo_id, u.displayName as assignedTo_displayName
       FROM tickets t
       JOIN conversations c ON t.conversationId = c.id
       JOIN customers cust ON c.customerId = cust.id
       LEFT JOIN users u ON t.assignedToId = u.id
       ORDER BY t.priority DESC, t.createdAt ASC`
    );
    
    return tickets.map((row: any) => ({
      id: row.id,
      conversationId: row.conversationId,
      subject: row.subject,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assignedToId: row.assignedToId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      conversation: {
        id: row.conversationId,
        status: row.conversation_status,
        channel: row.conversation_channel,
      },
      customer: {
        id: row.customer_id,
        name: row.customer_name,
        phoneNumber: row.customer_phoneNumber,
      },
      assignedTo: row.assignedTo_id ? {
        id: row.assignedTo_id,
        displayName: row.assignedTo_displayName,
      } : undefined,
    }));
  }
  
  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const result = await this.query(
      'INSERT INTO tickets (conversationId, subject, description, status, priority, assignedToId) VALUES (?, ?, ?, ?, ?, ?)',
      [
        ticket.conversationId,
        ticket.subject,
        ticket.description,
        ticket.status,
        ticket.priority,
        ticket.assignedToId
      ]
    );
    
    const insertId = (result as any).insertId;
    return {
      id: insertId,
      ...ticket,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  async updateTicket(id: number, ticketUpdate: Partial<Ticket>): Promise<Ticket | undefined> {
    const fieldsToUpdate = Object.entries(ticketUpdate)
      .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .map(([key, value]) => `${key} = ?`);
    
    const values = Object.entries(ticketUpdate)
      .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .map(([_, value]) => value);
    
    if (fieldsToUpdate.length === 0) {
      return this.getTicket(id);
    }
    
    values.push(new Date());
    values.push(id);
    
    await this.query(
      `UPDATE tickets SET ${fieldsToUpdate.join(', ')}, updatedAt = ? WHERE id = ?`,
      values
    );
    
    return this.getTicket(id);
  }
  
  // Implementação de Order
  
  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    return this.query<Order>(
      'SELECT * FROM orders WHERE customerId = ? ORDER BY createdAt DESC',
      [customerId]
    );
  }
  
  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await this.query(
      'INSERT INTO orders (customerId, amount, status, items, paymentMethod) VALUES (?, ?, ?, ?, ?)',
      [
        order.customerId,
        order.amount,
        order.status,
        JSON.stringify(order.items),
        order.paymentMethod
      ]
    );
    
    const insertId = (result as any).insertId;
    return {
      id: insertId,
      ...order,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  // Implementação de Pipeline
  
  async getPipelines(): Promise<Pipeline[]> {
    return this.query<Pipeline>('SELECT * FROM pipelines ORDER BY createdAt ASC');
  }
  
  async getPipeline(id: number): Promise<Pipeline | undefined> {
    const pipelines = await this.query<Pipeline>(
      'SELECT * FROM pipelines WHERE id = ?',
      [id]
    );
    return pipelines[0];
  }
  
  async createPipeline(pipeline: InsertPipeline): Promise<Pipeline> {
    const result = await this.query(
      'INSERT INTO pipelines (name, description) VALUES (?, ?)',
      [pipeline.name, pipeline.description]
    );
    
    const insertId = (result as any).insertId;
    return {
      id: insertId,
      ...pipeline,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  async updatePipeline(id: number, pipelineUpdate: Partial<Pipeline>): Promise<Pipeline | undefined> {
    const fieldsToUpdate = Object.entries(pipelineUpdate)
      .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .map(([key, value]) => `${key} = ?`);
    
    const values = Object.entries(pipelineUpdate)
      .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .map(([_, value]) => value);
    
    if (fieldsToUpdate.length === 0) {
      return this.getPipeline(id);
    }
    
    values.push(new Date());
    values.push(id);
    
    await this.query(
      `UPDATE pipelines SET ${fieldsToUpdate.join(', ')}, updatedAt = ? WHERE id = ?`,
      values
    );
    
    return this.getPipeline(id);
  }
  
  // Implementação de PipelineStage
  
  async getPipelineStages(pipelineId: number): Promise<PipelineStage[]> {
    return this.query<PipelineStage>(
      'SELECT * FROM pipeline_stages WHERE pipelineId = ? ORDER BY position ASC',
      [pipelineId]
    );
  }
  
  async getPipelineStage(id: number): Promise<PipelineStage | undefined> {
    const stages = await this.query<PipelineStage>(
      'SELECT * FROM pipeline_stages WHERE id = ?',
      [id]
    );
    return stages[0];
  }
  
  async createPipelineStage(stage: InsertPipelineStage): Promise<PipelineStage> {
    // Encontrar a posição máxima atual para o pipeline
    const positionResult = await this.query<{maxPosition: number}>(
      'SELECT MAX(position) as maxPosition FROM pipeline_stages WHERE pipelineId = ?',
      [stage.pipelineId]
    );
    
    const position = (positionResult[0]?.maxPosition || 0) + 1;
    
    const result = await this.query(
      'INSERT INTO pipeline_stages (pipelineId, name, color, position) VALUES (?, ?, ?, ?)',
      [stage.pipelineId, stage.name, stage.color, position]
    );
    
    const insertId = (result as any).insertId;
    return {
      id: insertId,
      position,
      ...stage,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  async updatePipelineStage(id: number, stageUpdate: Partial<PipelineStage>): Promise<PipelineStage | undefined> {
    const fieldsToUpdate = Object.entries(stageUpdate)
      .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .map(([key, value]) => `${key} = ?`);
    
    const values = Object.entries(stageUpdate)
      .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .map(([_, value]) => value);
    
    if (fieldsToUpdate.length === 0) {
      return this.getPipelineStage(id);
    }
    
    values.push(new Date());
    values.push(id);
    
    await this.query(
      `UPDATE pipeline_stages SET ${fieldsToUpdate.join(', ')}, updatedAt = ? WHERE id = ?`,
      values
    );
    
    return this.getPipelineStage(id);
  }
  
  // Implementação de Lead
  
  async getLead(id: number): Promise<Lead | undefined> {
    const leads = await this.query<Lead>(
      'SELECT * FROM leads WHERE id = ?',
      [id]
    );
    return leads[0];
  }
  
  async getLeadsByPipeline(pipelineId: number): Promise<LeadWithDetails[]> {
    const leads = await this.query<Lead>(
      'SELECT l.* FROM leads l JOIN pipeline_stages ps ON l.stageId = ps.id WHERE ps.pipelineId = ?',
      [pipelineId]
    );
    
    return this.hydrateLeadsWithDetails(leads);
  }
  
  async getLeadsByStage(stageId: number): Promise<LeadWithDetails[]> {
    const leads = await this.query<Lead>(
      'SELECT * FROM leads WHERE stageId = ?',
      [stageId]
    );
    
    return this.hydrateLeadsWithDetails(leads);
  }
  
  async getLeadsByCustomer(customerId: number): Promise<LeadWithDetails[]> {
    const leads = await this.query<Lead>(
      'SELECT * FROM leads WHERE customerId = ?',
      [customerId]
    );
    
    return this.hydrateLeadsWithDetails(leads);
  }
  
  async getLeadByConversation(conversationId: number): Promise<LeadWithDetails | undefined> {
    const leads = await this.query<Lead>(
      'SELECT * FROM leads WHERE conversationId = ?',
      [conversationId]
    );
    
    if (leads.length === 0) {
      return undefined;
    }
    
    const hydratedLeads = await this.hydrateLeadsWithDetails(leads);
    return hydratedLeads[0];
  }
  
  async createLead(lead: InsertLead): Promise<Lead> {
    const result = await this.query(
      `INSERT INTO leads (
        title, description, customerId, stageId, conversationId, 
        assignedToId, status, amount, productType, probability, 
        expectedCloseDate, lostReason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lead.title,
        lead.description,
        lead.customerId,
        lead.stageId,
        lead.conversationId,
        lead.assignedToId,
        lead.status || 'active',
        lead.amount,
        lead.productType,
        lead.probability,
        lead.expectedCloseDate,
        lead.lostReason
      ]
    );
    
    const insertId = (result as any).insertId;
    return {
      id: insertId,
      ...lead,
      status: lead.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  async updateLead(id: number, leadUpdate: Partial<Lead>): Promise<Lead | undefined> {
    const fieldsToUpdate = Object.entries(leadUpdate)
      .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .map(([key, value]) => `${key} = ?`);
    
    const values = Object.entries(leadUpdate)
      .filter(([key]) => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .map(([_, value]) => value);
    
    if (fieldsToUpdate.length === 0) {
      return this.getLead(id);
    }
    
    values.push(new Date());
    values.push(id);
    
    await this.query(
      `UPDATE leads SET ${fieldsToUpdate.join(', ')}, updatedAt = ? WHERE id = ?`,
      values
    );
    
    return this.getLead(id);
  }
  
  // Implementação de LeadActivity
  
  async getLeadActivities(leadId: number): Promise<LeadActivity[]> {
    return this.query<LeadActivity>(
      'SELECT * FROM lead_activities WHERE leadId = ? ORDER BY createdAt DESC',
      [leadId]
    );
  }
  
  async createLeadActivity(activity: InsertLeadActivity): Promise<LeadActivity> {
    const result = await this.query(
      'INSERT INTO lead_activities (leadId, type, content, createdById) VALUES (?, ?, ?, ?)',
      [activity.leadId, activity.type, activity.content, activity.createdById]
    );
    
    const insertId = (result as any).insertId;
    return {
      id: insertId,
      ...activity,
      createdAt: new Date()
    };
  }
  
  // Função auxiliar para hidratar leads com seus detalhes relacionados
  private async hydrateLeadsWithDetails(leadsList: Lead[]): Promise<LeadWithDetails[]> {
    if (leadsList.length === 0) {
      return [];
    }
    
    const leadIds = leadsList.map(lead => lead.id);
    const leadIdsStr = leadIds.join(',');
    
    // Buscar todos os estágios para os leads
    const stages = await this.query<PipelineStage>(
      `SELECT * FROM pipeline_stages WHERE id IN (SELECT stageId FROM leads WHERE id IN (${leadIdsStr}))`
    );
    
    // Buscar todos os pipelines para os estágios
    const stageIds = stages.map(stage => stage.id);
    const stageIdsStr = stageIds.join(',');
    
    const pipelines = await this.query<Pipeline>(
      `SELECT * FROM pipelines WHERE id IN (SELECT pipelineId FROM pipeline_stages WHERE id IN (${stageIdsStr}))`
    );
    
    // Buscar todos os clientes para os leads
    const customers = await this.query<Customer>(
      `SELECT * FROM customers WHERE id IN (SELECT customerId FROM leads WHERE id IN (${leadIdsStr}))`
    );
    
    // Buscar todos os usuários assignados para os leads
    const users = await this.query<User>(
      `SELECT * FROM users WHERE id IN (SELECT assignedToId FROM leads WHERE id IN (${leadIdsStr}) AND assignedToId IS NOT NULL)`
    );
    
    // Buscar todas as conversas para os leads
    const conversations = await this.query<Conversation>(
      `SELECT * FROM conversations WHERE id IN (SELECT conversationId FROM leads WHERE id IN (${leadIdsStr}) AND conversationId IS NOT NULL)`
    );
    
    // Buscar todas as atividades para os leads
    const activities = await this.query<LeadActivity>(
      `SELECT * FROM lead_activities WHERE leadId IN (${leadIdsStr}) ORDER BY createdAt DESC`
    );
    
    // Mapear os dados relacionados por ID para fácil acesso
    const stagesMap = new Map(stages.map(stage => [stage.id, stage]));
    const pipelinesMap = new Map(pipelines.map(pipeline => [pipeline.id, pipeline]));
    const customersMap = new Map(customers.map(customer => [customer.id, customer]));
    const usersMap = new Map(users.map(user => [user.id, user]));
    const conversationsMap = new Map(conversations.map(conv => [conv.id, conv]));
    
    // Agrupar atividades por lead ID
    const activitiesByLeadId = activities.reduce((acc, activity) => {
      if (!acc[activity.leadId]) {
        acc[activity.leadId] = [];
      }
      acc[activity.leadId].push(activity);
      return acc;
    }, {} as Record<number, LeadActivity[]>);
    
    // Construir os leads com detalhes
    return leadsList.map(lead => {
      const stage = stagesMap.get(lead.stageId)!;
      const pipeline = pipelinesMap.get(stage.pipelineId)!;
      const customer = customersMap.get(lead.customerId)!;
      const assignedUser = lead.assignedToId ? usersMap.get(lead.assignedToId) : undefined;
      const conversation = lead.conversationId ? conversationsMap.get(lead.conversationId) : undefined;
      const leadActivities = activitiesByLeadId[lead.id] || [];
      
      return {
        ...lead,
        stage,
        pipeline,
        customer,
        assignedUser,
        conversation,
        activities: leadActivities
      };
    });
  }
}

// Exportamos a classe para uso posterior
export default MySQLStorage;
