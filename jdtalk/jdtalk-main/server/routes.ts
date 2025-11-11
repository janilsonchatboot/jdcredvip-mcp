import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openAIService } from "./services/openai";
import { whatsAppService } from "./services/whatsapp";
import { log } from "./vite";
import { 
  loginSchema, 
  insertMessageSchema, 
  insertTicketSchema, 
  insertCustomerSchema,
  insertUserSchema
} from "@shared/schema";
import { z } from "zod";
import { WebSocketServer } from "ws";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";

import { registerPipelineRoutes } from './routes/pipeline';
import { registerExportRoutes } from './routes/export';
import { registerTemplateRoutes } from './routes/templates';
import pluginsRouter from './routes/plugins';
import { hashPassword, verifyPassword } from "./utils/password";
import { signJwt, verifyJwt } from "./utils/jwt";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const sessionSecret =
    process.env.SESSION_SECRET ?? "dev-session-secret-change-me";
  const jwtSecret = process.env.AUTH_JWT_SECRET ?? sessionSecret;
  const refreshSecret = process.env.AUTH_REFRESH_SECRET ?? `${jwtSecret}-refresh`;
  const accessExpiresIn = Number(process.env.AUTH_JWT_TTL ?? 60 * 60); // 1h
  const refreshExpiresIn = Number(
    process.env.AUTH_REFRESH_TTL ?? 60 * 60 * 24 * 7
  ); // 7d
  const isProduction = process.env.NODE_ENV === "production";
  
  // Serve static demo page from the public directory
  app.use("/", express.static("public"));
  
  // Add routes for the demo
  app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
  });
  
  app.get('/demo', (req, res) => {
    res.redirect('/client/');
  });

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map();
  
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    const id = Math.random().toString(36).substring(2, 10);
    clients.set(id, ws);
    
    // Enviar mensagem de confirmação ao cliente
    ws.send(JSON.stringify({ type: 'connection_established', payload: { id } }));
    
    ws.on("message", (message) => {
      console.log("Received message from client:", message.toString());
    });
    
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
      clients.delete(id);
    });
    
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });
  
  // Helper function to broadcast messages to all connected clients
  const broadcast = (message: any) => {
    console.log(`Broadcasting message of type: ${message.type}`);
    
    clients.forEach((client, id) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to send message to client ${id}:`, error);
        }
      }
    });
  };

  // Setup session
  const SessionStore = MemoryStore(session);
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7776000000, // 90 dias em milissegundos
        secure: isProduction,      // Defina como true em produção com HTTPS
        httpOnly: true,
        path: '/',         // Disponível em todo o aplicativo
        sameSite: 'lax'    // Proteção contra CSRF permitindo navegação
      },
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Setup passport
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }

        const verification = verifyPassword(user.password, password);
        if (!verification.valid) {
          return done(null, false, { message: "Incorrect password." });
        }

        if (verification.needsRehash) {
          const hashed = hashPassword(password);
          await storage.updateUserPassword(user.id, hashed);
          user.password = hashed;
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  const extractBearerToken = (req: Request): string | null => {
    const authHeader = (req.headers.authorization ||
      (req.headers as Record<string, unknown>)?.Authorization) as string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7).trim();
    }
    const headerToken = req.headers["x-access-token"];
    if (typeof headerToken === "string" && headerToken.length > 0) {
      return headerToken;
    }
    return null;
  };

  const resolveUserFromToken = async (req: Request) => {
    const token = extractBearerToken(req);
    if (!token) {
      return null;
    }

    const verification = verifyJwt(token, jwtSecret);
    if (!verification.valid || !verification.payload?.sub) {
      return null;
    }

    const userId = Number(verification.payload.sub);
    if (!Number.isFinite(userId)) {
      return null;
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return null;
    }

    req.user = user as any;
    return user;
  };

  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user) {
      return next();
    }

    resolveUserFromToken(req)
      .then((user) => {
        if (user) {
          return next();
        }
        res.status(401).json({ message: "Unauthorized" });
      })
      .catch((error) => next(error));
  };

  const requireRole =
    (...roles: string[]) =>
    (req: Request, res: Response, next: Function) => {
      const ensureAccess = (user: any) => {
        if (!user) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        if (!roles.length) {
          return next();
        }
        const currentRole = user?.role ?? "agent";
        if (!roles.includes(String(currentRole))) {
          return res.status(403).json({ message: "Acesso restrito." });
        }
        return next();
      };

      if (req.isAuthenticated() && req.user) {
        return ensureAccess(req.user);
      }

      resolveUserFromToken(req)
        .then((user) => ensureAccess(user))
        .catch((error) => next(error));
    };

  const sanitizeUser = (user: any) => {
    if (!user) return null;
    // Evita expor hashes de senha
    const { password, ...publicUser } = user;
    return publicUser;
  };

  const createUserSchema = insertUserSchema.extend({
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  });

  const updateUserSchema = z
    .object({
      displayName: z.string().min(1, "Nome obrigatório").optional(),
      role: z.string().min(1, "Perfil obrigatório").optional(),
      password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres").optional(),
    })
    .refine(
      (data) => data.displayName || data.role || data.password,
      { message: "Nenhum campo informado para atualização." }
    );

  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "A senha atual é obrigatória"),
    newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
  });

  // Auth routes
  const issueTokens = (user: any) => {
    const access = signJwt(
      {
        sub: user.id,
        role: user.role,
        username: user.username,
        displayName: user.displayName,
      },
      jwtSecret,
      { expiresInSeconds: accessExpiresIn }
    );

    const refresh = signJwt(
      {
        sub: user.id,
        type: "refresh",
      },
      refreshSecret,
      { expiresInSeconds: refreshExpiresIn }
    );

    return {
      token: access.token,
      refreshToken: refresh.token,
      expiresIn: accessExpiresIn,
      refreshExpiresIn,
    };
  };

  app.post("/api/auth/login", (req, res, next) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info.message });
        }
        
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          
          const tokens = issueTokens(user);

          return res.json({ 
            id: user.id, 
            username: user.username, 
            displayName: user.displayName, 
            role: user.role,
            token: tokens.token,
            refreshToken: tokens.refreshToken,
            refresh_token: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            expires_in: tokens.expiresIn,
            refreshExpiresIn: tokens.refreshExpiresIn,
            refresh_expires_in: tokens.refreshExpiresIn,
          });
        });
      })(req, res, next);
    } catch (error) {
      res.status(400).json({ message: "Invalid credentials format" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", isAuthenticated, (req, res) => {
    res.json(req.user);
  });

  app.post("/api/auth/refresh", async (req, res) => {
    const refreshToken =
      req.body?.refresh_token ??
      req.body?.refreshToken ??
      req.headers["x-refresh-token"];

    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(400).json({ message: "Refresh token obrigatorio." });
    }

    const result = verifyJwt(refreshToken, refreshSecret);
    if (!result.valid || !result.payload?.sub) {
      return res.status(401).json({ message: "Refresh token invalido ou expirado." });
    }

    const userId = Number(result.payload.sub);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Refresh token invalido." });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario nao encontrado." });
      }

      const tokens = issueTokens(user);
      res.json({
        token: tokens.token,
        refresh_token: tokens.refreshToken,
        refreshToken: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        refresh_expires_in: tokens.refreshExpiresIn,
      });
    } catch (error) {
      res.status(500).json({ message: "Falha ao renovar token." });
    }
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(Number(userId));
      if (!user) {
        return res.status(404).json({ message: "Usuario nao encontrado." });
      }

      const verification = verifyPassword(user.password, currentPassword);
      if (!verification.valid) {
        return res.status(400).json({ message: "Senha atual incorreta." });
      }

      const hashed = hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashed);

      res.json({ message: "Senha atualizada com sucesso." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues?.[0];
        return res.status(400).json({ message: firstIssue?.message ?? "Dados inválidos." });
      }
      res.status(500).json({ message: "Falha ao alterar senha." });
    }
  });
  
  // WordPress JWT Authentication
  app.post("/api/auth/validate", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token é obrigatório" });
      }
      
      // Validar o token chamando o endpoint do WordPress
      const wpUrl = process.env.WORDPRESS_URL || "";
      
      // Se estamos em modo desenvolvimento sem WordPress
      if (!wpUrl) {
        // Simulação básica para desenvolvimento
        try {
          // Formato básico do JWT: header.payload.signature
          const parts = token.split('.');
          if (parts.length !== 3) {
            return res.status(401).json({ message: "Token inválido" });
          }
          
          // Decode payload (parte do meio)
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          const now = Math.floor(Date.now() / 1000);
          
          if (payload.exp <= now) {
            return res.status(401).json({ message: "Token expirado" });
          }
          
          // Em desenvolvimento, retornar os dados do payload diretamente
          return res.json({
            success: true,
            message: "Token válido",
            user: {
              id: payload.user_id,
              username: payload.username || "admin",
              display_name: payload.display_name || "Administrador"
            }
          });
        } catch (error) {
          return res.status(401).json({ message: "Token inválido" });
        }
      }
      
      // Em produção, usa o endpoint do WordPress
      const response = await fetch(`${wpUrl}/wp-json/jdtalk/v1/token/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      return res.json(data);
    } catch (error) {
      console.error("Token validation error:", error);
      return res.status(500).json({ message: "Erro ao validar token" });
    }
  });
  
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refresh_token } = req.body;
      
      if (!refresh_token) {
        return res.status(400).json({ message: "Token de renovação é obrigatório" });
      }
      
      // Chamar o endpoint do WordPress para renovar o token
      const wpUrl = process.env.WORDPRESS_URL || "";
      
      // Se estamos em modo desenvolvimento sem WordPress
      if (!wpUrl) {
        // Simulação básica para desenvolvimento
        try {
          // Formato básico do JWT: header.payload.signature
          const parts = refresh_token.split('.');
          if (parts.length !== 3) {
            return res.status(401).json({ message: "Token de renovação inválido" });
          }
          
          // Decode payload (parte do meio)
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          const now = Math.floor(Date.now() / 1000);
          
          if (payload.exp <= now) {
            return res.status(401).json({ message: "Token de renovação expirado" });
          }
          
          if (payload.type !== 'refresh') {
            return res.status(400).json({ message: "Tipo de token inválido" });
          }
          
          // Em desenvolvimento, gerar um novo token simulado
          const newToken = `header.${Buffer.from(JSON.stringify({
            iss: "dev",
            iat: now,
            exp: now + 3600,
            user_id: payload.user_id,
            username: "admin",
            display_name: "Administrador"
          })).toString('base64')}.signature`;
          
          const newRefreshToken = `header.${Buffer.from(JSON.stringify({
            iss: "dev",
            iat: now,
            exp: now + 86400,
            user_id: payload.user_id,
            type: "refresh"
          })).toString('base64')}.signature`;
          
          return res.json({
            success: true,
            message: "Token renovado com sucesso",
            token: newToken,
            refresh_token: newRefreshToken,
            expires_in: 3600,
            refresh_expires_in: 86400
          });
        } catch (error) {
          return res.status(401).json({ message: "Token de renovação inválido" });
        }
      }
      
      // Em produção, usa o endpoint do WordPress
      const response = await fetch(`${wpUrl}/wp-json/jdtalk/v1/token/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      return res.json(data);
    } catch (error) {
      console.error("Token refresh error:", error);
      return res.status(500).json({ message: "Erro ao renovar token" });
    }
  });

  // User administration
  app.get("/api/users", isAuthenticated, async (_req, res) => {
    try {
      const users = await storage.listUsers();
      res.json(users.map(sanitizeUser));
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      res.status(500).json({ message: "Falha ao listar usuários." });
    }
  });

  app.post("/api/users", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const payload = createUserSchema.parse(req.body);
      const newUser = await storage.createUser(payload);
      res.status(201).json(sanitizeUser(newUser));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues?.[0];
        return res.status(400).json({ message: firstIssue?.message ?? "Dados inválidos." });
      }
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({ message: "Falha ao criar usuário." });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const userId = Number(req.params.id);
      if (!Number.isFinite(userId)) {
        return res.status(400).json({ message: "ID inválido." });
      }

      const payload = updateUserSchema.parse(req.body);
      const { password, ...data } = payload;

      let updatedUser = null;
      if (data.displayName || data.role) {
        updatedUser = await storage.updateUser(userId, data);
      } else {
        updatedUser = await storage.getUser(userId);
      }

      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }

      if (password) {
        await storage.updateUserPassword(userId, hashPassword(password));
      }

      const refreshedUser = await storage.getUser(userId);
      res.json(sanitizeUser(refreshedUser ?? updatedUser));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues?.[0];
        return res.status(400).json({ message: firstIssue?.message ?? "Dados inválidos." });
      }
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ message: "Falha ao atualizar usuário." });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const userId = Number(req.params.id);
      if (!Number.isFinite(userId)) {
        return res.status(400).json({ message: "ID inválido." });
      }

      if ((req.user as any)?.id === userId) {
        return res.status(400).json({ message: "Não é possível remover o próprio usuário." });
      }

      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }

      res.json({ message: "Usuário removido com sucesso." });
    } catch (error) {
      console.error("Erro ao remover usuário:", error);
      res.status(500).json({ message: "Falha ao remover usuário." });
    }
  });

  // Status route - para verificar se a API está funcionando
  app.get("/api/status", (req, res) => {
    res.json({ 
      status: "online",
      time: new Date().toISOString(),
      websocket: {
        clients: clients.size,
        path: "/ws"
      }
    });
  });
  
  // Sincronização de mensagens entre dispositivo e API
  app.get("/api/messages/sync", isAuthenticated, async (req, res) => {
    try {
      if (!whatsAppService.isInitialized()) {
        return res.status(503).json({ error: "WhatsApp service not initialized" });
      }
      
      // Obter timestamp para sincronização (padrão: 24 horas atrás)
      const fromTimestamp = req.query.from_timestamp 
        ? parseInt(req.query.from_timestamp as string) 
        : (Date.now() - 86400000);
        
      // Obter mensagens sincronizadas
      const multiDeviceManager = whatsAppService.getMultiDeviceManager();
      if (!multiDeviceManager) {
        return res.status(503).json({ error: "Multi-device manager not initialized" });
      }
      
      const messages = await multiDeviceManager.syncMessages(fromTimestamp);
      
      res.json({
        status: "success",
        timestamp: Date.now(),
        count: messages.length,
        messages
      });
    } catch (error) {
      console.error("Error syncing messages:", error);
      res.status(500).json({ error: "Failed to sync messages" });
    }
  });

  // Conversation routes
  app.get("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const conversations = await storage.getConversationsWithCustomers();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const conversation = await storage.getConversation(Number(req.params.id));
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const customer = await storage.getCustomer(conversation.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json({ ...conversation, customer });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // Message routes
  app.get("/api/conversations/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessagesByConversationId(Number(req.params.id));
      
      // Mark customer messages as read if they were delivered
      const updatedMessages = await Promise.all(
        messages.map(async (message) => {
          if (message.senderType === "customer" && message.status === "delivered") {
            return await storage.updateMessageStatus(message.id, "read");
          }
          return message;
        })
      );
      
      // If we marked messages as read, update the unread count
      const conversation = await storage.getConversation(Number(req.params.id));
      if (conversation && conversation.unreadCount > 0) {
        await storage.updateConversation(conversation.id, { unreadCount: 0 });
        
        // Broadcast that messages were read
        broadcast({
          type: "conversation_updated",
          payload: {
            id: conversation.id,
            unreadCount: 0
          }
        });
      }
      
      res.json(updatedMessages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const conversationId = Number(req.params.id);
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
        senderType: "agent",
        senderId: (req.user as any).id.toString(),
        timestamp: new Date(),
        status: "sent"
      });
      
      const message = await storage.createMessage(validatedData);
      
      // Simulate sending to WhatsApp Business API
      setTimeout(async () => {
        await storage.updateMessageStatus(message.id, "delivered");
        broadcast({
          type: "message_status_change",
          payload: {
            id: message.id,
            status: "delivered"
          }
        });
        
        // Simulate customer reading message after some time
        setTimeout(async () => {
          await storage.updateMessageStatus(message.id, "read");
          broadcast({
            type: "message_status_change",
            payload: {
              id: message.id,
              status: "read"
            }
          });
        }, 5000);
      }, 2000);
      
      // Broadcast new message
      broadcast({
        type: "new_message",
        payload: message
      });
      
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // WhatsApp Business API Webhook para verificação
  app.get("/api/webhook/whatsapp", (req, res) => {
    try {
      const mode = req.query["hub.mode"] as string;
      const token = req.query["hub.verify_token"] as string;
      const challenge = req.query["hub.challenge"] as string;
      
      // Verificar o token para confirmar que é uma solicitação válida do WhatsApp
      if (whatsAppService.verifyWebhook(mode, token)) {
        return res.status(200).send(challenge);
      }
      
      res.status(403).json({ message: "Forbidden" });
    } catch (error) {
      console.error("WhatsApp verification error:", error);
      res.status(400).json({ message: "Invalid verification request" });
    }
  });

  // WhatsApp Business API Webhook para receber mensagens
  app.post("/api/webhook/whatsapp", async (req, res) => {
    try {
      // Responder imediatamente para evitar timeouts do WhatsApp
      res.status(200).send("EVENT_RECEIVED");
      
      // Processar o webhook assincronamente
      await whatsAppService.handleWebhook(req.body);
    } catch (error) {
      console.error("WhatsApp webhook error:", error);
    }
  });

  // Configuração do WhatsApp Business API
  app.post("/api/whatsapp/config", isAuthenticated, async (req, res) => {
    try {
      const { token, phoneNumberId, webhookSecret } = req.body;
      
      if (!token || !phoneNumberId || !webhookSecret) {
        return res.status(400).json({ message: "Token, phone number ID, and webhook secret are required" });
      }
      
      whatsAppService.initialize(token, phoneNumberId, webhookSecret, httpServer);
      
      res.json({ success: true, message: "WhatsApp service initialized successfully" });
    } catch (error) {
      console.error("Error initializing WhatsApp service:", error);
      res.status(500).json({ message: "Failed to initialize WhatsApp service" });
    }
  });
  
  // Enviar mensagem via WhatsApp
  app.post("/api/whatsapp/send", isAuthenticated, async (req, res) => {
    try {
      const { to, text, mediaUrl, mediaType } = req.body;
      
      if (!to) {
        return res.status(400).json({ message: "Recipient phone number is required" });
      }
      
      if (!text && !mediaUrl) {
        return res.status(400).json({ message: "Either text or media URL is required" });
      }
      
      if (!whatsAppService.isInitialized()) {
        return res.status(400).json({ 
          message: "WhatsApp service not initialized. Configure it first at /api/whatsapp/config" 
        });
      }
      
      const result = await whatsAppService.sendWhatsAppMessage(to, text, mediaUrl, mediaType);
      
      if (result) {
        res.json({ success: true, message: "Message sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send message" });
      }
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      res.status(500).json({ message: "Failed to send WhatsApp message" });
    }
  });
  
  // Toggle auto-reply
  app.post("/api/whatsapp/auto-reply", isAuthenticated, async (req, res) => {
    try {
      const { enabled } = req.body;
      
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "Enabled flag must be a boolean" });
      }
      
      // Atualizar no serviço do WhatsApp
      whatsAppService.setAutoReplyEnabled(enabled);
      
      // Atualizar nas configurações do OpenAI para manter sincronizados
      openAIService.updateSettings({
        autoResponseEnabled: enabled
      });
      
      // Broadcast to websocket clients
      broadcast({
        type: "toggleAutoReply",
        payload: { enabled }
      });
      
      res.json({ success: true, autoReplyEnabled: enabled });
    } catch (error) {
      console.error("Error toggling auto-reply:", error);
      res.status(500).json({ message: "Failed to toggle auto-reply" });
    }
  });
  
  // Simulate receiving a new WhatsApp message
  app.post("/api/simulate/incoming-message", isAuthenticated, async (req, res) => {
    try {
      const { customerId, message, mediaType, mediaUrl } = req.body;
      
      const customer = await storage.getCustomer(Number(customerId));
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const conversation = await storage.getConversationByCustomerId(customer.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const newMessage = await storage.createMessage({
        conversationId: conversation.id,
        senderId: customer.whatsappId,
        senderType: "customer",
        content: message || null,
        mediaType: mediaType || null,
        mediaUrl: mediaUrl || null,
        timestamp: new Date(),
        status: "delivered"
      });
      
      // Update conversation
      const updatedConversation = await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        unreadCount: (conversation.unreadCount || 0) + 1
      });
      
      // Broadcast new message
      broadcast({
        type: "new_message",
        payload: newMessage
      });
      
      // Broadcast updated conversation
      broadcast({
        type: "conversation_updated",
        payload: {
          ...updatedConversation,
          customer
        }
      });
      
      res.status(201).json(newMessage);
    } catch (error) {
      res.status(400).json({ message: "Failed to simulate message" });
    }
  });

  // OpenAI Chatbot routes
  app.post("/api/chatbot/reply", isAuthenticated, async (req, res) => {
    try {
      const { message, conversationId, conversationHistory } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // Gerar resposta do chatbot
      const reply = await openAIService.generateChatbotResponse(message, conversationHistory || []);
      
      // Se tiver um conversationId, salva a mensagem e a resposta no banco de dados
      if (conversationId) {
        const conversation = await storage.getConversation(Number(conversationId));
        if (conversation) {
          // Salvar a resposta do chatbot como uma mensagem
          const chatbotMessage = await storage.createMessage({
            conversationId: Number(conversationId),
            senderType: "agent",
            senderId: "chatbot",
            content: reply,
            mediaType: null,
            mediaUrl: null,
            timestamp: new Date(),
            status: "sent"
          });
          
          // Atualizar status como entregue após 1 segundo (simulação)
          setTimeout(async () => {
            await storage.updateMessageStatus(chatbotMessage.id, "delivered");
            broadcast({
              type: "message_status_change",
              payload: {
                id: chatbotMessage.id,
                status: "delivered"
              }
            });
            
            // Simular leitura após mais 2 segundos
            setTimeout(async () => {
              await storage.updateMessageStatus(chatbotMessage.id, "read");
              broadcast({
                type: "message_status_change",
                payload: {
                  id: chatbotMessage.id,
                  status: "read"
                }
              });
            }, 2000);
          }, 1000);
          
          // Broadcast a mensagem para todos os clientes conectados
          broadcast({
            type: "new_message",
            payload: chatbotMessage
          });
          
          return res.json({
            reply,
            message: chatbotMessage
          });
        }
      }
      
      res.json({ reply });
    } catch (error) {
      console.error("Erro ao gerar resposta do chatbot:", error);
      res.status(500).json({ message: "Falha ao gerar resposta do chatbot" });
    }
  });
  
  app.get("/api/chatbot/settings", isAuthenticated, async (req, res) => {
    try {
      const settings = openAIService.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Falha ao obter configurações do chatbot" });
    }
  });
  
  app.post("/api/chatbot/settings", isAuthenticated, async (req, res) => {
    try {
      const { 
        initialPrompt, 
        companyInfo, 
        productInfo, 
        tone, 
        maxResponseTokens,
        loanTypes,
        faqResponses,
        autoResponseEnabled 
      } = req.body;
      
      openAIService.updateSettings({
        initialPrompt,
        companyInfo,
        productInfo,
        tone,
        maxResponseTokens,
        loanTypes,
        faqResponses,
        autoResponseEnabled
      });
      
      res.json(openAIService.getSettings());
    } catch (error) {
      res.status(500).json({ message: "Falha ao atualizar configurações do chatbot" });
    }
  });
  
  app.post("/api/analyze-sentiment", isAuthenticated, async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }
      
      const sentiment = await openAIService.analyzeSentiment(text);
      res.json(sentiment);
    } catch (error) {
      res.status(500).json({ message: "Falha ao analisar sentimento" });
    }
  });
  
  app.post("/api/categorize-message", isAuthenticated, async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }
      
      const category = await openAIService.categorizeMessage(text);
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Falha ao categorizar mensagem" });
    }
  });
  
  app.post("/api/summarize-conversation", isAuthenticated, async (req, res) => {
    try {
      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Messages array is required" });
      }
      
      const summary = await openAIService.summarizeConversation(messages);
      res.json({ summary });
    } catch (error) {
      res.status(500).json({ message: "Falha ao resumir conversa" });
    }
  });

  // Ticket routes
  app.get("/api/tickets", isAuthenticated, async (req, res) => {
    try {
      const tickets = await storage.getTicketsWithDetails();
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.get("/api/conversations/:id/ticket", isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getTicketByConversationId(Number(req.params.id));
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      const conversation = await storage.getConversation(ticket.conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const customer = await storage.getCustomer(conversation.customerId);
      
      let assignedTo;
      if (ticket.assignedToId) {
        assignedTo = await storage.getUser(ticket.assignedToId);
      }
      
      const orders = await storage.getOrdersByCustomerId(conversation.customerId);
      
      res.json({
        ...ticket,
        conversation,
        customer,
        assignedTo,
        orders
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.patch("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const ticketId = Number(req.params.id);
      const { status, priority, assignedToId, tags } = req.body;
      
      const updateData: any = {};
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
      if (tags) updateData.tags = tags;
      
      const updatedTicket = await storage.updateTicket(ticketId, updateData);
      if (!updatedTicket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Get full ticket details
      const ticket = await storage.getTicket(ticketId);
      const conversation = await storage.getConversation(ticket!.conversationId);
      const customer = await storage.getCustomer(conversation!.customerId);
      
      let assignedTo;
      if (ticket!.assignedToId) {
        assignedTo = await storage.getUser(ticket!.assignedToId);
      }
      
      // Broadcast ticket update
      broadcast({
        type: "ticket_update",
        payload: {
          ...updatedTicket,
          conversation,
          customer,
          assignedTo
        }
      });
      
      res.json(updatedTicket);
    } catch (error) {
      res.status(400).json({ message: "Failed to update ticket" });
    }
  });

  // Customer routes
  app.get("/api/customers/:id/orders", isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getOrdersByCustomerId(Number(req.params.id));
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Registrar rotas de pipeline (Kanban)
  registerPipelineRoutes(app);
  registerExportRoutes(app);
  registerTemplateRoutes(app);
  
  // Registra as rotas de plugins
  app.use('/api/plugins', pluginsRouter);
  
  // Inicializa o sistema de plugins após o servidor estar pronto
  httpServer.on('listening', async () => {
    try {
      // Importação dinâmica para evitar dependência circular
      const pluginManager = await import('./plugins');
      await pluginManager.loadAllPlugins();
      await pluginManager.initializePlugins();
      log('Sistema de plugins inicializado com sucesso', 'plugin-system');
    } catch (error) {
      log(`Erro ao inicializar sistema de plugins: ${error}`, 'plugin-system');
    }
  });

  return httpServer;
}
