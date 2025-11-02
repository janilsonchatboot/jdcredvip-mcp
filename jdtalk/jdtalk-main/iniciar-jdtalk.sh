#!/bin/bash

# Script para iniciar o JDTalk automaticamente
echo "Iniciando JDTalk CMS..."

# Verificar se estamos em ambiente de produção ou desenvolvimento
if [ -f ".env" ]; then
  echo "Utilizando configurações do arquivo .env"
else
  echo "Arquivo .env não encontrado, criando configurações padrão..."
  echo "NODE_ENV=production" > .env
  echo "PORT=5000" >> .env
  
  # Se tiver banco de dados, configurar
  if [ -n "$DATABASE_URL" ]; then
    echo "DATABASE_URL=$DATABASE_URL" >> .env
  fi
  
  # Se tiver API key da OpenAI, configurar
  if [ -n "$OPENAI_API_KEY" ]; then
    echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> .env
  fi
fi

# Instalar dependências (se necessário)
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "Instalando dependências..."
  npm install
else
  echo "Dependências já instaladas, verificando atualizações..."
  npm ci --only=production
fi

# Verificar banco de dados
if [ -n "$DATABASE_URL" ]; then
  echo "Configurando banco de dados..."
  
  # Executar push de schema para o banco de dados (se aplicável)
  if [ -f "drizzle.config.ts" ]; then
    echo "Executando migração de banco de dados..."
    npm run db:push
  fi
else
  echo "Aviso: Variável DATABASE_URL não encontrada, usando armazenamento em memória."
fi

# Verificar configuração de CORS para o domínio externo
DOMAIN=${DOMAIN:-"jdcredvip.com.br"}
echo "Configurando CORS para domínio: $DOMAIN"

# Iniciar o servidor
echo "Iniciando servidor JDTalk..."
npm run start

# Esta parte não será executada a menos que o servidor seja encerrado
echo "Servidor JDTalk encerrado."