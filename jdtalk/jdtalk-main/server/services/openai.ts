import OpenAI from "openai";

// o modelo mais recente da OpenAI é "gpt-4o" que foi lançado em 13 de maio de 2024. não alterar a menos que solicitado explicitamente pelo usuário

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatbotSettings = {
  initialPrompt: string;
  companyInfo: string;
  productInfo: string;
  tone: "friendly" | "professional" | "casual";
  maxResponseTokens: number;
  loanTypes: string;
  faqResponses: Record<string, string>;
  autoResponseEnabled: boolean;
};

export class OpenAIService {
  private defaultSettings: ChatbotSettings = {
    initialPrompt: "Você é um assistente de atendimento ao cliente gentil e prestativo para uma empresa de correspondente bancário.",
    companyInfo: "Nossa empresa oferece serviços de correspondente bancário, ajudando clientes a conseguir empréstimos e financiamentos.",
    productInfo: "Temos diversos tipos de empréstimos e serviços financeiros.",
    tone: "professional",
    maxResponseTokens: 500,
    loanTypes: "Empréstimo Consignado, Empréstimo Pessoal, Financiamento Imobiliário, Empréstimo para Negativados",
    faqResponses: {
      "documentos_necessarios": "Para solicitar um empréstimo, você precisará de RG, CPF, comprovante de residência e comprovante de renda.",
      "prazo_aprovacao": "O prazo para aprovação varia conforme o tipo de empréstimo, geralmente entre 1 a 5 dias úteis.",
      "taxa_juros": "As taxas de juros variam conforme o tipo de empréstimo e seu perfil. Podemos fazer uma simulação personalizada."
    },
    autoResponseEnabled: true
  };

  private settings: ChatbotSettings;

  constructor(customSettings?: Partial<ChatbotSettings>) {
    this.settings = { ...this.defaultSettings, ...customSettings };
  }

  /**
   * Atualiza as configurações do chatbot
   */
  updateSettings(newSettings: Partial<ChatbotSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Obtém as configurações atuais do chatbot
   */
  getSettings(): ChatbotSettings {
    return { ...this.settings };
  }

  /**
   * Gera o sistema prompt com base nas configurações
   */
  private generateSystemPrompt(): string {
    const { initialPrompt, companyInfo, productInfo, tone, loanTypes, faqResponses } = this.settings;
    let toneInstruction = "";

    switch (tone) {
      case "friendly":
        toneInstruction = "Use uma linguagem amigável e acolhedora.";
        break;
      case "professional":
        toneInstruction = "Use uma linguagem formal e profissional.";
        break;
      case "casual":
        toneInstruction = "Use uma linguagem casual e descontraída.";
        break;
    }

    // Formatar FAQ para o prompt
    const faqText = Object.entries(faqResponses || {})
      .map(([pergunta, resposta]) => `- Pergunta sobre "${pergunta}": ${resposta}`)
      .join("\n");

    return `${initialPrompt}
Informações da empresa: ${companyInfo}
Informações do produto: ${productInfo}
Tipos de empréstimo disponíveis: ${loanTypes || "Diversos tipos de empréstimos"}

RESPOSTAS FREQUENTES:
${faqText}

${toneInstruction}
Responda de forma clara e concisa às perguntas dos clientes.
Se o cliente perguntar sobre um tipo específico de empréstimo, explique suas condições.
Quando o cliente demonstrar interesse em um produto, pergunte informações relevantes como: 
- Valor desejado para empréstimo
- Prazo de pagamento preferido
- Se é servidor público, aposentado, ou outro tipo de cliente
- Se tem restrições no CPF/nome

Ofereça simulações de valores quando apropriado.
Se não souber alguma informação específica, diga que vai encaminhar para um atendente humano.`;
  }

  /**
   * Gera uma resposta automática para a mensagem do cliente usando GPT
   */
  async generateChatbotResponse(
    customerMessage: string,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = []
  ): Promise<string> {
    try {
      const systemPrompt = this.generateSystemPrompt();
      
      // Preparar mensagens para enviar ao OpenAI API
      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map(msg => ({
          role: msg.role, 
          content: msg.content
        })),
        { role: "user", content: customerMessage }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages as any,
        max_tokens: this.settings.maxResponseTokens,
        temperature: 0.7,
      });

      return response.choices[0].message.content || "Desculpe, não consegui gerar uma resposta.";
    } catch (error) {
      console.error("Erro ao gerar resposta do chatbot:", error);
      return "Desculpe, houve um erro ao processar sua mensagem. Um atendente humano irá ajudá-lo em breve.";
    }
  }

  /**
   * Analisa o sentimento de uma mensagem
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: "positive" | "neutral" | "negative";
    score: number;
    urgency: "low" | "medium" | "high";
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Você é um analisador de sentimento especializado. Analise o sentimento da mensagem e forneça uma classificação como 'positive', 'neutral' ou 'negative', uma pontuação entre 0 e 1, e um nível de urgência como 'low', 'medium' ou 'high'. Responda em formato JSON.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Resposta do OpenAI sem conteúdo");
      }
      const result = JSON.parse(content);

      return {
        sentiment: result.sentiment,
        score: result.score,
        urgency: result.urgency,
      };
    } catch (error) {
      console.error("Erro ao analisar sentimento:", error);
      return {
        sentiment: "neutral",
        score: 0.5,
        urgency: "medium",
      };
    }
  }

  /**
   * Categoriza uma mensagem em um tópico de suporte para o contexto de correspondente bancário
   */
  async categorizeMessage(text: string): Promise<{
    category: string;
    confidence: number;
    suggestedResponse?: string;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Você é um categorizador de mensagens para um correspondente bancário que oferece empréstimos. Categorize a mensagem em uma das seguintes categorias: 'simulacao_emprestimo', 'duvida_taxas', 'duvida_documentos', 'reclamacao', 'status_emprestimo', 'informacao_geral', 'outros'. Forneça uma pontuação de confiança entre 0 e 1. Se possível, sugira uma resposta inicial. Responda em formato JSON.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Resposta do OpenAI sem conteúdo");
      }
      const result = JSON.parse(content);

      return {
        category: result.category,
        confidence: result.confidence,
        suggestedResponse: result.suggestedResponse,
      };
    } catch (error) {
      console.error("Erro ao categorizar mensagem:", error);
      return {
        category: "outros",
        confidence: 0.5,
      };
    }
  }
  
  /**
   * Detecta a intenção do cliente e extrai informações relevantes para leads
   */
  async detectLeadIntent(text: string): Promise<{
    isLead: boolean;
    confidence: number;
    loanType?: string;
    loanAmount?: number;
    clientType?: string;
    urgency: "low" | "medium" | "high";
    notes?: string;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em analisar mensagens de clientes para um correspondente bancário. 
Detecte se a mensagem indica um lead potencial para empréstimo e extraia informações relevantes.
Classifique o tipo de empréstimo como 'consignado', 'pessoal', 'imobiliario', 'negativado', ou 'nao_especificado'.
Identifique o tipo de cliente como 'servidor_publico', 'aposentado', 'pensionista', 'privado', ou 'nao_especificado'.
Avalie a urgência como 'low', 'medium', ou 'high'.
Se for mencionado, extraia o valor aproximado do empréstimo desejado.
Forneça notas adicionais relevantes para o atendimento.
Responda em formato JSON com as seguintes propriedades: isLead (booleano), confidence (número entre 0 e 1), loanType, loanAmount (número se especificado), clientType, urgency e notes.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Resposta do OpenAI sem conteúdo");
      }
      const result = JSON.parse(content);

      return {
        isLead: result.isLead,
        confidence: result.confidence,
        loanType: result.loanType,
        loanAmount: result.loanAmount || undefined,
        clientType: result.clientType,
        urgency: result.urgency || "medium",
        notes: result.notes
      };
    } catch (error) {
      console.error("Erro ao detectar intenção de lead:", error);
      return {
        isLead: false,
        confidence: 0,
        urgency: "medium"
      };
    }
  }

  /**
   * Gera um resumo da conversa para contextualizar o atendente
   */
  async summarizeConversation(messages: Array<{ role: "user" | "assistant"; content: string }>): Promise<string> {
    try {
      const conversationText = messages
        .map((msg) => `${msg.role === "user" ? "Cliente" : "Assistente"}: ${msg.content}`)
        .join("\n");

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente especializado em resumir conversas de atendimento ao cliente. Resuma os principais pontos da conversa, destacando os problemas, necessidades e qualquer informação importante. Limite o resumo a 2-3 parágrafos.",
          },
          {
            role: "user",
            content: conversationText,
          },
        ],
      });

      return response.choices[0].message.content || "Não foi possível resumir a conversa.";
    } catch (error) {
      console.error("Erro ao resumir conversa:", error);
      return "Erro ao gerar resumo da conversa.";
    }
  }
}

// Exporta uma instância padrão do serviço
export const openAIService = new OpenAIService();