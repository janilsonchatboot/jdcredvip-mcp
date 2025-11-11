import { pgTable, text, serial, integer, boolean, jsonb, timestamp, numeric, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("agent"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  role: true,
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customer schema
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  name: text("name"),
  email: text("email"),
  customerSince: timestamp("customer_since").notNull(),
  whatsappId: text("whatsapp_id").notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  phoneNumber: true,
  name: true,
  email: true,
  customerSince: true,
  whatsappId: true,
});

// Conversation schema
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  lastMessageAt: timestamp("last_message_at").notNull(),
  unreadCount: integer("unread_count").notNull().default(0),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  customerId: true,
  lastMessageAt: true,
  unreadCount: true,
});

// Message schema
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderId: text("sender_id").notNull(),
  senderType: text("sender_type").notNull(), // "customer" or "agent"
  content: text("content"),
  mediaType: text("media_type"), // "image", "audio", "file", null for text messages
  mediaUrl: text("media_url"),
  timestamp: timestamp("timestamp").notNull(),
  status: text("status").notNull(), // "sent", "delivered", "read"
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  senderId: true,
  senderType: true,
  content: true,
  mediaType: true,
  mediaUrl: true,
  timestamp: true,
  status: true,
});

// Ticket schema
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  assignedToId: integer("assigned_to_id"),
  status: text("status").notNull().default("open"), // "open", "in_progress", "resolved"
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high"
  createdAt: timestamp("created_at").notNull(),
  tags: text("tags").array(),
});

export const insertTicketSchema = createInsertSchema(tickets).pick({
  conversationId: true,
  assignedToId: true,
  status: true,
  priority: true,
  createdAt: true,
  tags: true,
});

// Order schema for related orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").notNull(),
  orderDate: timestamp("order_date").notNull(),
  totalAmount: jsonb("total_amount").notNull(),
  status: text("status").notNull(), // "pending", "shipped", "delivered"
  items: jsonb("items").notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  orderNumber: true,
  customerId: true,
  orderDate: true,
  totalAmount: true,
  status: true,
  items: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// API Response types
export type ConversationWithCustomer = Conversation & {
  customer: Customer;
  lastMessage?: Message;
};

export type MessageWithSender = Message & {
  sender: User | Customer;
};

export type TicketWithDetails = Ticket & {
  conversation: Conversation;
  customer: Customer;
  assignedTo?: User;
  orders?: Order[];
};

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Auth types
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

// WebSocket message types
export type WebSocketMessage = {
  type: "new_message" | "message_status_change" | "new_conversation" | "ticket_update" | "lead_update";
  payload: any;
};

// Pipeline schema (para Trello-like Kanban)
export const pipelines = pgTable("pipelines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPipelineSchema = createInsertSchema(pipelines).pick({
  name: true,
  description: true,
  isActive: true,
});

// Estágios do pipeline (colunas do Kanban)
export const pipelineStages = pgTable("pipeline_stages", {
  id: serial("id").primaryKey(),
  pipelineId: integer("pipeline_id").notNull().references(() => pipelines.id),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  color: text("color").default("#3498db"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPipelineStageSchema = createInsertSchema(pipelineStages).pick({
  pipelineId: true,
  name: true,
  description: true,
  order: true,
  color: true,
});

// Leads/oportunidades de negócio (cartões do Kanban)
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  conversationId: integer("conversation_id").references(() => conversations.id),
  pipelineId: integer("pipeline_id").notNull().references(() => pipelines.id),
  stageId: integer("stage_id").notNull().references(() => pipelineStages.id),
  title: text("title").notNull(),
  description: text("description"),
  amount: numeric("amount"), // Valor do empréstimo/contrato
  productType: text("product_type"), // consignado, pessoal, FGTS, bolsa família, etc.
  assignedTo: integer("assigned_to").references(() => users.id),
  status: text("status").default("active"), // active, won, lost
  expiresAt: timestamp("expires_at"), // Data limite para a oportunidade
  wonAt: timestamp("won_at"), // Data em que o negócio foi fechado
  lostAt: timestamp("lost_at"), // Data em que a oportunidade foi perdida
  lostReason: text("lost_reason"), // Motivo da perda
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).pick({
  customerId: true,
  conversationId: true,
  pipelineId: true,
  stageId: true,
  title: true,
  description: true,
  amount: true,
  productType: true,
  assignedTo: true,
  status: true,
  expiresAt: true,
});

// Notas e atividades do lead
export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // note, call, meeting, email, task, etc.
  content: text("content").notNull(),
  scheduledAt: timestamp("scheduled_at"), // Para atividades agendadas
  completedAt: timestamp("completed_at"), // Para atividades concluídas
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeadActivitySchema = createInsertSchema(leadActivities).pick({
  leadId: true,
  userId: true,
  type: true,
  content: true,
  scheduledAt: true,
  completedAt: true,
});

// Type definitions adicionais
export type Pipeline = typeof pipelines.$inferSelect;
export type InsertPipeline = z.infer<typeof insertPipelineSchema>;

export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = z.infer<typeof insertLeadActivitySchema>;

// Response types adicionais
export type LeadWithDetails = Lead & {
  customer: Customer;
  conversation?: Conversation;
  stage: PipelineStage;
  pipeline: Pipeline;
  assignedUser?: User;
  activities?: LeadActivity[];
};

// WhatsApp Config
export const whatsappConfig = pgTable("whatsapp_config", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(),
  phoneNumberId: varchar("phone_number_id", { length: 100 }).notNull(),
  webhookSecret: varchar("webhook_secret", { length: 100 }).notNull(),
  autoReply: boolean("auto_reply").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertWhatsappConfigSchema = createInsertSchema(whatsappConfig).pick({
  token: true,
  phoneNumberId: true,
  webhookSecret: true,
  autoReply: true
});

export type WhatsAppConfig = typeof whatsappConfig.$inferSelect;
export type InsertWhatsAppConfig = z.infer<typeof insertWhatsappConfigSchema>;

// Plugin System
export const plugins = pgTable("plugins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  version: text("version").notNull(),
  author: text("author"),
  homepageUrl: text("homepage_url"),
  repositoryUrl: text("repository_url"),
  icon: text("icon"),
  isActive: boolean("is_active").default(false),
  isCore: boolean("is_core").default(false),
  installPath: text("install_path"),
  manifest: jsonb("manifest"),
  installedAt: timestamp("installed_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPluginSchema = createInsertSchema(plugins).pick({
  name: true,
  slug: true,
  description: true,
  version: true,
  author: true,
  homepageUrl: true,
  repositoryUrl: true,
  icon: true,
  isActive: true,
  isCore: true,
  installPath: true,
  manifest: true
});

export const pluginDependencies = pgTable("plugin_dependencies", {
  id: serial("id").primaryKey(),
  pluginId: integer("plugin_id").notNull().references(() => plugins.id),
  dependsOnPluginId: integer("depends_on_plugin_id").notNull().references(() => plugins.id),
  versionConstraint: text("version_constraint")
});

export const insertPluginDependencySchema = createInsertSchema(pluginDependencies).pick({
  pluginId: true,
  dependsOnPluginId: true,
  versionConstraint: true
});

export const pluginSettings = pgTable("plugin_settings", {
  id: serial("id").primaryKey(),
  pluginId: integer("plugin_id").notNull().references(() => plugins.id),
  key: text("key").notNull(),
  value: jsonb("value"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPluginSettingSchema = createInsertSchema(pluginSettings).pick({
  pluginId: true,
  key: true,
  value: true
});

// Plugin Registry for remote plugins
export const pluginRegistry = pgTable("plugin_registry", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  version: text("version").notNull(),
  author: text("author"),
  homepageUrl: text("homepage_url"),
  repositoryUrl: text("repository_url"),
  downloadUrl: text("download_url").notNull(),
  icon: text("icon"),
  isVerified: boolean("is_verified").default(false),
  isFeatured: boolean("is_featured").default(false),
  category: text("category"),
  tags: jsonb("tags"),
  manifest: jsonb("manifest"),
  addedAt: timestamp("added_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPluginRegistrySchema = createInsertSchema(pluginRegistry).pick({
  name: true,
  slug: true,
  description: true,
  version: true,
  author: true,
  homepageUrl: true,
  repositoryUrl: true,
  downloadUrl: true,
  icon: true,
  isVerified: true,
  isFeatured: true,
  category: true,
  tags: true,
  manifest: true
});

// Type definitions for plugin system
export type Plugin = typeof plugins.$inferSelect;
export type InsertPlugin = z.infer<typeof insertPluginSchema>;

export type PluginDependency = typeof pluginDependencies.$inferSelect;
export type InsertPluginDependency = z.infer<typeof insertPluginDependencySchema>;

export type PluginSetting = typeof pluginSettings.$inferSelect;
export type InsertPluginSetting = z.infer<typeof insertPluginSettingSchema>;

export type PluginRegistry = typeof pluginRegistry.$inferSelect;
export type InsertPluginRegistry = z.infer<typeof insertPluginRegistrySchema>;

// Plugin-specific types
export type PluginManifest = {
  name: string;
  slug: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  icon?: string;
  main: string;
  frontend?: string;
  requires?: {
    core?: string;
    plugins?: Record<string, string>;
  };
  permissions?: string[];
  hooks?: string[];
  settings?: {
    schema: Record<string, any>;
    defaults: Record<string, any>;
  };
};
