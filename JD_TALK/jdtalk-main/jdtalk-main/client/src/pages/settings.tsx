import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Switch
} from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";

// Esquema de validação para configurações do WhatsApp
const whatsappFormSchema = z.object({
  phoneNumber: z.string().min(10, "Número de telefone inválido"),
  apiKey: z.string().min(1, "API Key é obrigatória"),
  apiSecret: z.string().min(1, "API Secret é obrigatória"),
  webhookUrl: z.string().url("URL inválida"),
  enableAutoResponder: z.boolean().default(false),
  autoResponderMessage: z.string().optional(),
});

// Esquema de validação para configurações da aplicação
const appFormSchema = z.object({
  appName: z.string().min(1, "Nome da aplicação é obrigatório"),
  companyName: z.string().min(1, "Nome da empresa é obrigatório"),
  primaryColor: z.string().min(1, "Cor primária é obrigatória"),
  secondaryColor: z.string().min(1, "Cor secundária é obrigatória"),
  logoUrl: z.string().url("URL do logo inválida"),
  timeZone: z.string().min(1, "Fuso horário é obrigatório"),
  dateFormat: z.string().min(1, "Formato de data é obrigatório"),
});

// Esquema de validação para configurações de notificações
const notificationFormSchema = z.object({
  enableEmailNotifications: z.boolean().default(false),
  emailServer: z.string().optional(),
  emailPort: z.string().optional(),
  emailUser: z.string().optional(),
  emailPassword: z.string().optional(),
  emailFrom: z.string().optional(),
  enableSmsNotifications: z.boolean().default(false),
  smsProvider: z.string().optional(),
  smsApiKey: z.string().optional(),
  notifyOnNewConversation: z.boolean().default(true),
  notifyOnNewMessage: z.boolean().default(true),
});

// Esquema de validação para configurações da IA
const aiFormSchema = z.object({
  enableAI: z.boolean().default(true),
  openaiApiKey: z.string().min(1, "OpenAI API Key é obrigatória"),
  defaultModel: z.string().min(1, "Modelo padrão é obrigatório"),
  maxTokens: z.string().min(1, "Máximo de tokens é obrigatório"),
  temperature: z.string().min(1, "Temperatura é obrigatória"),
  enableChatbotAI: z.boolean().default(false),
  chatbotWelcomeMessage: z.string().optional(),
});

type WhatsAppFormValues = z.infer<typeof whatsappFormSchema>;
type AppFormValues = z.infer<typeof appFormSchema>;
type NotificationFormValues = z.infer<typeof notificationFormSchema>;
type AIFormValues = z.infer<typeof aiFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [isWhatsAppSubmitting, setIsWhatsAppSubmitting] = useState(false);
  const [isAppSubmitting, setIsAppSubmitting] = useState(false);
  const [isNotificationSubmitting, setIsNotificationSubmitting] = useState(false);
  const [isAISubmitting, setIsAISubmitting] = useState(false);

  // Formulário do WhatsApp
  const whatsappForm = useForm<WhatsAppFormValues>({
    resolver: zodResolver(whatsappFormSchema),
    defaultValues: {
      phoneNumber: "+5511987654321",
      apiKey: "whatsapp-api-key-example",
      apiSecret: "whatsapp-api-secret-example",
      webhookUrl: "https://api.jdtalk.com/webhook/whatsapp",
      enableAutoResponder: true,
      autoResponderMessage: "Olá! Obrigado por entrar em contato. Um de nossos atendentes irá responder em breve.",
    },
  });

  // Formulário da aplicação
  const appForm = useForm<AppFormValues>({
    resolver: zodResolver(appFormSchema),
    defaultValues: {
      appName: "JDTalk",
      companyName: "JD CREDVIP",
      primaryColor: "#00a859",
      secondaryColor: "#1976d2",
      logoUrl: "https://jdcredvip.com.br/logo.png",
      timeZone: "America/Sao_Paulo",
      dateFormat: "DD/MM/YYYY HH:mm",
    },
  });

  // Formulário de notificações
  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      enableEmailNotifications: true,
      emailServer: "smtp.gmail.com",
      emailPort: "587",
      emailUser: "contato@jdcredvip.com.br",
      emailPassword: "",
      emailFrom: "JDTalk <contato@jdcredvip.com.br>",
      enableSmsNotifications: false,
      smsProvider: "twilio",
      smsApiKey: "",
      notifyOnNewConversation: true,
      notifyOnNewMessage: true,
    },
  });

  // Formulário da IA
  const aiForm = useForm<AIFormValues>({
    resolver: zodResolver(aiFormSchema),
    defaultValues: {
      enableAI: true,
      openaiApiKey: "",
      defaultModel: "gpt-4o",
      maxTokens: "1000",
      temperature: "0.7",
      enableChatbotAI: true,
      chatbotWelcomeMessage: "Olá! Sou o assistente virtual da JD CREDVIP. Como posso ajudar?",
    },
  });

  // Enviar formulário do WhatsApp
  async function onWhatsAppSubmit(data: WhatsAppFormValues) {
    setIsWhatsAppSubmitting(true);
    try {
      // Simulação - em produção conectar à API real
      console.log("Salvando configurações do WhatsApp:", data);
      
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Configurações salvas",
        description: "As configurações do WhatsApp foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações do WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setIsWhatsAppSubmitting(false);
    }
  }

  // Enviar formulário da aplicação
  async function onAppSubmit(data: AppFormValues) {
    setIsAppSubmitting(true);
    try {
      // Simulação - em produção conectar à API real
      console.log("Salvando configurações da aplicação:", data);
      
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Configurações salvas",
        description: "As configurações da aplicação foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações da aplicação.",
        variant: "destructive",
      });
    } finally {
      setIsAppSubmitting(false);
    }
  }

  // Enviar formulário de notificações
  async function onNotificationSubmit(data: NotificationFormValues) {
    setIsNotificationSubmitting(true);
    try {
      // Simulação - em produção conectar à API real
      console.log("Salvando configurações de notificações:", data);
      
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Configurações salvas",
        description: "As configurações de notificações foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações de notificações.",
        variant: "destructive",
      });
    } finally {
      setIsNotificationSubmitting(false);
    }
  }

  // Enviar formulário da IA
  async function onAISubmit(data: AIFormValues) {
    setIsAISubmitting(true);
    try {
      // Simulação - em produção conectar à API real
      console.log("Salvando configurações da IA:", data);
      
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Configurações salvas",
        description: "As configurações da IA foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações da IA.",
        variant: "destructive",
      });
    } finally {
      setIsAISubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Configurações do Sistema</h1>
      
      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="app">Aplicação</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="ai">Inteligência Artificial</TabsTrigger>
        </TabsList>
        
        {/* Tab de configurações do WhatsApp */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do WhatsApp</CardTitle>
              <CardDescription>
                Configure sua integração com a API do WhatsApp Business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...whatsappForm}>
                <form onSubmit={whatsappForm.handleSubmit(onWhatsAppSubmit)} className="space-y-6">
                  <FormField
                    control={whatsappForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="+5511987654321" {...field} />
                        </FormControl>
                        <FormDescription>
                          Digite o número de telefone com código do país (+55).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={whatsappForm.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          Chave da API do WhatsApp Business.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={whatsappForm.control}
                    name="apiSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Secret</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Chave secreta da API do WhatsApp Business.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={whatsappForm.control}
                    name="webhookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL do Webhook</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          URL para receber webhooks do WhatsApp.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={whatsappForm.control}
                    name="enableAutoResponder"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Respostas automáticas
                          </FormLabel>
                          <FormDescription>
                            Ativar resposta automática para novas conversas.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {whatsappForm.watch("enableAutoResponder") && (
                    <FormField
                      control={whatsappForm.control}
                      name="autoResponderMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mensagem automática</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Digite a mensagem automática"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Esta mensagem será enviada automaticamente quando alguém iniciar uma conversa.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <Button type="submit" disabled={isWhatsAppSubmitting}>
                    {isWhatsAppSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar configurações
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab de configurações da aplicação */}
        <TabsContent value="app">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Aplicação</CardTitle>
              <CardDescription>
                Personalize sua aplicação JDTalk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...appForm}>
                <form onSubmit={appForm.handleSubmit(onAppSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={appForm.control}
                      name="appName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da aplicação</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={appForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da empresa</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={appForm.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cor primária</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <Input
                              type="color"
                              value={field.value}
                              onChange={field.onChange}
                              className="w-12 p-1 h-10"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={appForm.control}
                      name="secondaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cor secundária</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <Input
                              type="color"
                              value={field.value}
                              onChange={field.onChange}
                              className="w-12 p-1 h-10"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={appForm.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL do logo</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          URL da imagem do logo da sua empresa.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={appForm.control}
                      name="timeZone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuso horário</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um fuso horário" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="America/Sao_Paulo">
                                América/São Paulo (GMT-3)
                              </SelectItem>
                              <SelectItem value="America/Manaus">
                                América/Manaus (GMT-4)
                              </SelectItem>
                              <SelectItem value="America/Rio_Branco">
                                América/Rio Branco (GMT-5)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={appForm.control}
                      name="dateFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Formato de data</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um formato de data" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="DD/MM/YYYY HH:mm">
                                DD/MM/YYYY HH:mm (31/12/2023 23:59)
                              </SelectItem>
                              <SelectItem value="MM/DD/YYYY HH:mm">
                                MM/DD/YYYY HH:mm (12/31/2023 23:59)
                              </SelectItem>
                              <SelectItem value="YYYY-MM-DD HH:mm">
                                YYYY-MM-DD HH:mm (2023-12-31 23:59)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button type="submit" disabled={isAppSubmitting}>
                    {isAppSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar configurações
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab de configurações de notificações */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificações</CardTitle>
              <CardDescription>
                Configure como você deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                  <FormField
                    control={notificationForm.control}
                    name="enableEmailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Notificações por email
                          </FormLabel>
                          <FormDescription>
                            Ativar notificações por email.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {notificationForm.watch("enableEmailNotifications") && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField
                          control={notificationForm.control}
                          name="emailServer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Servidor SMTP</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={notificationForm.control}
                          name="emailPort"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Porta SMTP</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField
                          control={notificationForm.control}
                          name="emailUser"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Usuário SMTP</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={notificationForm.control}
                          name="emailPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha SMTP</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={notificationForm.control}
                        name="emailFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Remetente</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              Nome e email do remetente (ex: JDTalk &lt;contato@jdcredvip.com.br&gt;).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  <FormField
                    control={notificationForm.control}
                    name="enableSmsNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Notificações por SMS
                          </FormLabel>
                          <FormDescription>
                            Ativar notificações por SMS.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {notificationForm.watch("enableSmsNotifications") && (
                    <div className="space-y-6">
                      <FormField
                        control={notificationForm.control}
                        name="smsProvider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provedor de SMS</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um provedor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="twilio">Twilio</SelectItem>
                                <SelectItem value="zenvia">Zenvia</SelectItem>
                                <SelectItem value="totalvoice">TotalVoice</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="smsApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Key do provedor de SMS</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  <FormField
                    control={notificationForm.control}
                    name="notifyOnNewConversation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Nova conversa
                          </FormLabel>
                          <FormDescription>
                            Receber notificação quando uma nova conversa for iniciada.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationForm.control}
                    name="notifyOnNewMessage"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Nova mensagem
                          </FormLabel>
                          <FormDescription>
                            Receber notificação quando uma nova mensagem for recebida.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={isNotificationSubmitting}>
                    {isNotificationSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar configurações
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab de configurações da IA */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Inteligência Artificial</CardTitle>
              <CardDescription>
                Configure a integração com a OpenAI para recursos de IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...aiForm}>
                <form onSubmit={aiForm.handleSubmit(onAISubmit)} className="space-y-6">
                  <FormField
                    control={aiForm.control}
                    name="enableAI"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Habilitar IA
                          </FormLabel>
                          <FormDescription>
                            Ativar recursos de Inteligência Artificial.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {aiForm.watch("enableAI") && (
                    <>
                      <FormField
                        control={aiForm.control}
                        name="openaiApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>OpenAI API Key</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormDescription>
                              Chave de API da OpenAI para acesso aos modelos de IA.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <FormField
                          control={aiForm.control}
                          name="defaultModel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Modelo padrão</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um modelo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="gpt-4o">GPT-4o (Mais avançado)</SelectItem>
                                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Mais rápido)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Modelo de IA a ser utilizado.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={aiForm.control}
                          name="maxTokens"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Máximo de tokens</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormDescription>
                                Limite máximo de tokens por resposta.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={aiForm.control}
                          name="temperature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Temperatura</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormDescription>
                                Controle de criatividade (0.0 - 1.0).
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={aiForm.control}
                        name="enableChatbotAI"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Chatbot inteligente
                              </FormLabel>
                              <FormDescription>
                                Ativar chatbot automático com IA para respostas iniciais.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {aiForm.watch("enableChatbotAI") && (
                        <FormField
                          control={aiForm.control}
                          name="chatbotWelcomeMessage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mensagem de boas-vindas do chatbot</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Digite a mensagem de boas-vindas"
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Esta mensagem será enviada pelo chatbot ao iniciar uma conversa.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}
                  
                  <Button type="submit" disabled={isAISubmitting}>
                    {isAISubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar configurações
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}