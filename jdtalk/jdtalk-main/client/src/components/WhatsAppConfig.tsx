import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function WhatsAppConfig() {
  const [token, setToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const { toast } = useToast();

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest(
        "POST",
        "/api/whatsapp/config",
        { token, phoneNumberId, webhookSecret }
      );

      setIsConfigured(true);
      toast({
        title: "WhatsApp configurado com sucesso!",
        description: "A integração com o WhatsApp Business API está ativa."
      });
    } catch (error) {
      toast({
        title: "Erro ao configurar WhatsApp",
        description: "Verifique suas credenciais e tente novamente."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutoReply = async (enabled: boolean) => {
    setAutoReplyEnabled(enabled);

    try {
      await apiRequest(
        "POST", 
        "/api/whatsapp/auto-reply", 
        { enabled }
      );

      toast({
        title: `Resposta automática ${enabled ? "ativada" : "desativada"}`,
        description: enabled
          ? "O chatbot responderá automaticamente às mensagens."
          : "Você receberá as mensagens, mas o chatbot não responderá automaticamente."
      });
    } catch (error) {
      setAutoReplyEnabled(!enabled); // revert switch state
      toast({
        title: "Erro ao alterar configuração",
        description: "Não foi possível alterar o modo de resposta automática.",
        variant: "destructive",
      });
    }
  };

  const webhookUrl = `${window.location.origin}/api/webhook/whatsapp`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Configuração do WhatsApp Business API</CardTitle>
          <CardDescription>
            Configure a conexão com a API da Meta para enviar e receber mensagens do WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConfigSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token de Acesso</Label>
              <Input
                id="token"
                type="password"
                placeholder="Token de acesso permanente da API da Meta"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Token de acesso permanente gerado no painel Meta for Developers.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">ID do Número de Telefone</Label>
              <Input
                id="phoneNumberId"
                placeholder="ID do número de telefone no WhatsApp Business"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                ID do seu número do WhatsApp Business no painel da Meta.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookSecret">Segredo do Webhook</Label>
              <Input
                id="webhookSecret"
                type="password"
                placeholder="Segredo para verificação do webhook"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Chave secreta para validar as chamadas do webhook.
              </p>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Configurando...
                </>
              ) : (
                "Salvar Configuração"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>URL do Webhook</CardTitle>
          <CardDescription>
            Configure essa URL no seu painel da Meta for Developers para receber mensagens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-muted rounded border font-mono text-sm overflow-x-auto">
            {webhookUrl}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Copie este URL e configure-o como webhook no painel da API da Meta para receber mensagens do WhatsApp.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Respostas Automáticas</CardTitle>
          <CardDescription>
            Configure se o chatbot deve responder automaticamente às mensagens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Ativar respostas automáticas</p>
              <p className="text-sm text-muted-foreground">
                Quando ativado, o chatbot responderá automaticamente às mensagens recebidas.
              </p>
            </div>
            <Switch
              checked={autoReplyEnabled}
              onCheckedChange={toggleAutoReply}
              disabled={!isConfigured}
            />
          </div>
        </CardContent>
        <CardFooter className="bg-muted/50 border-t px-6 py-3">
          <p className="text-sm text-muted-foreground">
            {isConfigured
              ? "Você pode alternar entre atendimento automatizado e manual a qualquer momento."
              : "Configure a API do WhatsApp primeiro para habilitar as respostas automáticas."}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}