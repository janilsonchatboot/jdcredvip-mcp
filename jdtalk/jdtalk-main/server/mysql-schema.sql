-- Script de criação de tabelas para banco de dados MySQL do Hostgator
-- Executar através do phpMyAdmin no cPanel

-- Tabela de usuários do sistema
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  displayName VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'promotor',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de tokens para redefinicao de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  expiresAt DATETIME NOT NULL,
  usedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phoneNumber VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(100),
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zipCode VARCHAR(20),
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de conversas
CREATE TABLE IF NOT EXISTS conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id)
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversationId INT NOT NULL,
  senderId INT NOT NULL,
  senderType VARCHAR(20) NOT NULL, -- 'user' ou 'customer'
  content TEXT NOT NULL,
  contentType VARCHAR(20) NOT NULL DEFAULT 'text',
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id)
);

-- Tabela de tickets
CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversationId INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  assignedToId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id),
  FOREIGN KEY (assignedToId) REFERENCES users(id)
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  items JSON NOT NULL,
  paymentMethod VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id)
);

-- Tabela de pipelines
CREATE TABLE IF NOT EXISTS pipelines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de estágios do pipeline (colunas do kanban)
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pipelineId INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#3498db',
  position INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pipelineId) REFERENCES pipelines(id)
);

-- Tabela de leads (cartões no kanban)
CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  customerId INT NOT NULL,
  stageId INT NOT NULL,
  conversationId INT,
  assignedToId INT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  amount DECIMAL(10,2),
  productType VARCHAR(100),
  probability INT,
  expectedCloseDate DATE,
  lostReason TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id),
  FOREIGN KEY (stageId) REFERENCES pipeline_stages(id),
  FOREIGN KEY (conversationId) REFERENCES conversations(id),
  FOREIGN KEY (assignedToId) REFERENCES users(id)
);

-- Tabela de atividades dos leads
CREATE TABLE IF NOT EXISTS lead_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leadId INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  createdById INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leadId) REFERENCES leads(id),
  FOREIGN KEY (createdById) REFERENCES users(id)
);

-- Tabela para armazenar as perguntas e respostas para treinamento de IA
CREATE TABLE IF NOT EXISTS training_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  topic VARCHAR(100),
  product VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id)
);

-- Inserir um usuário administrador padrão
-- Senha padrão: admin123 (deve ser alterada após o primeiro login)
INSERT INTO users (username, password, displayName, role)
SELECT 'admin', '$2b$10$8KvTmAIBb4TK1rA9wbNtZOxKwevLZKxjHgdQeYE.afBqMYYFg5NAa', 'Administrador', 'admin'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Inserir um pipeline padrão de crédito
INSERT INTO pipelines (name, description)
SELECT 'Pipeline de Crédito', 'Pipeline para gerenciamento de oportunidades de crédito'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM pipelines WHERE name = 'Pipeline de Crédito');

-- Inserir estágios padrão para o pipeline de crédito
SET @pipeline_id = (SELECT id FROM pipelines WHERE name = 'Pipeline de Crédito' LIMIT 1);

INSERT INTO pipeline_stages (pipelineId, name, color, position)
SELECT @pipeline_id, 'Contato Inicial', '#3498db', 1
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE pipelineId = @pipeline_id AND name = 'Contato Inicial');

INSERT INTO pipeline_stages (pipelineId, name, color, position)
SELECT @pipeline_id, 'Análise de Documentos', '#f39c12', 2
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE pipelineId = @pipeline_id AND name = 'Análise de Documentos');

INSERT INTO pipeline_stages (pipelineId, name, color, position)
SELECT @pipeline_id, 'Aprovação', '#2ecc71', 3
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE pipelineId = @pipeline_id AND name = 'Aprovação');

INSERT INTO pipeline_stages (pipelineId, name, color, position)
SELECT @pipeline_id, 'Contrato', '#9b59b6', 4
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE pipelineId = @pipeline_id AND name = 'Contrato');

INSERT INTO pipeline_stages (pipelineId, name, color, position)
SELECT @pipeline_id, 'Pagamento', '#16a085', 5
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE pipelineId = @pipeline_id AND name = 'Pagamento');
