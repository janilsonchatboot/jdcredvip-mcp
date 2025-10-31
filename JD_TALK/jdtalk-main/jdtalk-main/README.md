# JDTalk - Plataforma de Comunicação e Gestão de Clientes

JDTalk é uma plataforma completa para gestão de comunicação com clientes via WhatsApp, incluindo recursos de pipeline de vendas, chatbot inteligente, e sistema de plugins.

## Características Principais

- **Integração com WhatsApp Business API**: Comunicação direta com clientes pelo WhatsApp oficial
- **Dashboard intuitivo**: Visualize conversas, tickets e status em um único lugar
- **Pipeline de Vendas**: Sistema Kanban para gestão de leads e oportunidades
- **Chatbot com IA**: Automatize respostas usando inteligência artificial (OpenAI)
- **Sistema de Templates**: Respostas rápidas e padronizadas para comunicação eficiente
- **Sistema de Plugins**: Arquitetura extensível para adicionar funcionalidades

## Requisitos do Sistema

- Docker e Docker Compose
- Conexão com internet para acessar WhatsApp Business API
- Credenciais da Meta para WhatsApp Business
- Chave de API da OpenAI (opcional, para recursos de IA)

## Instalação Rápida com Docker

A maneira mais fácil de instalar o JDTalk é usando nosso script de instalação via Docker:

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/jdtalk.git
cd jdtalk

# Execute o script de instalação
chmod +x docker-setup.sh
./docker-setup.sh
```

O script irá:
1. Verificar e instalar Docker e Docker Compose (se necessário)
2. Configurar variáveis de ambiente
3. Criar diretórios necessários
4. Iniciar todos os contêineres

Após a instalação, acesse a aplicação em: http://localhost

## Configuração Manual

Se preferir configurar manualmente, siga estes passos:

1. Copie o arquivo `.env.example` para `.env` e edite conforme necessário:
   ```bash
   cp .env.example .env
   ```

2. Configure suas credenciais do WhatsApp e OpenAI no arquivo `.env`

3. Inicie os contêineres:
   ```bash
   docker-compose up -d
   ```

## Configuração do WhatsApp Business API

Para configurar a integração com o WhatsApp Business API:

1. Acesse o [Meta Business Dashboard](https://business.facebook.com/)
2. Configure um número de telefone para o WhatsApp Business API
3. Obtenha seu `PHONE_NUMBER_ID` e `ACCESS_TOKEN`
4. Configure o webhook para receber mensagens (URL: `https://seu-dominio.com/api/webhook`)
5. Adicione as credenciais no arquivo `.env`

## Personalização e Extensão

### Sistema de Templates

Adicione e gerencie templates de mensagens em: `/templates`

### Sistema de Plugins

Instale plugins adicionais em: `/plugins`

## Estrutura de Diretórios

```
.
├── client/            # Frontend React
├── server/            # Backend Node.js/Express
├── plugins/           # Sistema de plugins
├── uploads/           # Arquivos enviados
├── logs/              # Logs da aplicação
├── nginx/             # Configuração do Nginx
│   ├── conf.d/        # Configurações de sites
│   └── ssl/           # Certificados SSL
└── docker-compose.yml # Configuração do Docker
```

## Segurança

Para produção, recomendamos:

1. Habilitar HTTPS (edite `nginx/conf.d/default.conf`)
2. Alterar senhas padrão
3. Configurar firewall
4. Realizar backups regulares do banco de dados

## Suporte

Para obter suporte ou reportar problemas:

- Abra uma issue em nosso [GitHub](https://github.com/seu-usuario/jdtalk/issues)
- Envie um email para suporte@jdtalk.com

## Licença

JDTalk é um software proprietário. Todos os direitos reservados.