import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, X } from "lucide-react";

interface FaqEntry {
  key: string;
  value: string;
}

export default function ChatbotConfig() {
  const [initialPrompt, setInitialPrompt] = useState("");
  const [companyInfo, setCompanyInfo] = useState("");
  const [productInfo, setProductInfo] = useState("");
  const [loanTypes, setLoanTypes] = useState("");
  const [tone, setTone] = useState("professional");
  const [maxResponseTokens, setMaxResponseTokens] = useState(500);
  const [autoResponseEnabled, setAutoResponseEnabled] = useState(true);
  const [faqEntries, setFaqEntries] = useState<FaqEntry[]>([
    { key: "", value: "" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Carregar configurações atuais
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/chatbot/settings", {
          credentials: "include"
        });
        
        if (response.ok) {
          const settings = await response.json();
          setInitialPrompt(settings.initialPrompt || "");
          setCompanyInfo(settings.companyInfo || "");
          setProductInfo(settings.productInfo || "");
          setLoanTypes(settings.loanTypes || "");
          setTone(settings.tone || "professional");
          setMaxResponseTokens(settings.maxResponseTokens || 500);
          setAutoResponseEnabled(settings.autoResponseEnabled !== false);
          
          // Carregar FAQs
          if (settings.faqResponses && Object.keys(settings.faqResponses).length > 0) {
            const entries: FaqEntry[] = Object.entries(settings.faqResponses).map(
              ([key, value]) => ({ key, value: value as string })
            );
            setFaqEntries(entries);
          } else {
            setFaqEntries([{ key: "", value: "" }]);
          }
        }
      } catch (error) {
        toast({
          title: "Erro ao carregar configurações",
          description: "Não foi possível carregar as configurações do chatbot."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleAddFaqEntry = () => {
    setFaqEntries([...faqEntries, { key: "", value: "" }]);
  };

  const handleRemoveFaqEntry = (index: number) => {
    const newEntries = [...faqEntries];
    newEntries.splice(index, 1);
    setFaqEntries(newEntries.length > 0 ? newEntries : [{ key: "", value: "" }]);
  };

  const handleFaqChange = (index: number, field: 'key' | 'value', value: string) => {
    const newEntries = [...faqEntries];
    newEntries[index][field] = value;
    setFaqEntries(newEntries);
  };

  const handleToggleAutoResponse = async (enabled: boolean) => {
    try {
      await apiRequest(
        "POST",
        "/api/whatsapp/auto-reply",
        { enabled }
      );

      setAutoResponseEnabled(enabled);
      toast({
        title: enabled ? "Respostas automáticas ativadas" : "Respostas automáticas desativadas",
        description: enabled 
          ? "O chatbot responderá automaticamente às mensagens recebidas."
          : "O chatbot não responderá automaticamente às mensagens recebidas."
      });
    } catch (error) {
      toast({
        title: "Erro ao alterar configuração",
        description: "Não foi possível alterar o estado das respostas automáticas."
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Converter entradas de FAQ para formato de objeto
    const faqResponses: Record<string, string> = {};
    faqEntries.forEach(entry => {
      if (entry.key && entry.value) {
        faqResponses[entry.key] = entry.value;
      }
    });

    try {
      await apiRequest(
        "POST",
        "/api/chatbot/settings",
        {
          initialPrompt,
          companyInfo,
          productInfo,
          loanTypes,
          tone,
          maxResponseTokens,
          faqResponses,
          autoResponseEnabled
        }
      );

      toast({
        title: "Configurações salvas com sucesso!",
        description: "As configurações do chatbot foram atualizadas."
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar configurações",
        description: "Não foi possível atualizar as configurações do chatbot."
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Respostas Automáticas</CardTitle>
            <CardDescription>
              Ativar ou desativar respostas automáticas do chatbot
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-response"
              checked={autoResponseEnabled}
              onCheckedChange={handleToggleAutoResponse}
            />
            <Label htmlFor="auto-response" className="font-medium">
              {autoResponseEnabled ? "Ativado" : "Desativado"}
            </Label>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {autoResponseEnabled 
              ? "O chatbot responderá automaticamente às mensagens recebidas dos clientes."
              : "O chatbot está desativado. As mensagens dos clientes não receberão respostas automáticas."
            }
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuração do ChatGPT</CardTitle>
          <CardDescription>
            Personalize o comportamento do assistente virtual que responderá às mensagens automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="initialPrompt">Instrução Inicial (System Prompt)</Label>
              <Textarea
                id="initialPrompt"
                placeholder="Instruções gerais para o assistente (ex: Você é um assistente de suporte para a empresa XYZ...)"
                value={initialPrompt}
                onChange={(e) => setInitialPrompt(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-sm text-muted-foreground">
                Instrução que define como o assistente deve se comportar e responder às perguntas.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyInfo">Informações da Empresa</Label>
              <Textarea
                id="companyInfo"
                placeholder="Detalhes sobre sua empresa (ex: missão, valores, horário de atendimento)"
                value={companyInfo}
                onChange={(e) => setCompanyInfo(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-sm text-muted-foreground">
                Informações sobre sua empresa que o assistente deve conhecer para atender os clientes.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productInfo">Informações de Produtos/Serviços</Label>
              <Textarea
                id="productInfo"
                placeholder="Detalhes sobre seus produtos ou serviços (ex: preços, disponibilidade, especificações)"
                value={productInfo}
                onChange={(e) => setProductInfo(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-sm text-muted-foreground">
                Detalhes sobre produtos ou serviços que o assistente deve conhecer.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="loanTypes">Tipos de Empréstimos Disponíveis</Label>
              <Textarea
                id="loanTypes"
                placeholder="Lista dos tipos de empréstimos que você oferece (ex: Empréstimo Consignado, Empréstimo Pessoal, etc.)"
                value={loanTypes}
                onChange={(e) => setLoanTypes(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-sm text-muted-foreground">
                Lista de tipos de empréstimos que seu correspondente bancário oferece.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tom de Conversação</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger id="tone">
                  <SelectValue placeholder="Selecione o tom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Amigável</SelectItem>
                  <SelectItem value="professional">Profissional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Define o estilo e tom de comunicação do assistente com seus clientes.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="maxTokens">Tamanho Máximo da Resposta</Label>
                <span className="text-sm font-medium">{maxResponseTokens} tokens</span>
              </div>
              <Slider
                id="maxTokens"
                min={100}
                max={2000}
                step={10}
                value={[maxResponseTokens]}
                onValueChange={(value) => setMaxResponseTokens(value[0])}
              />
              <p className="text-sm text-muted-foreground">
                Limite o tamanho das respostas do chatbot. Valores menores resultam em respostas mais concisas.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="faq-table">Respostas FAQ Pré-configuradas</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddFaqEntry}
                  className="h-8 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar</span>
                </Button>
              </div>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Tópico/Chave</TableHead>
                      <TableHead>Resposta</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faqEntries.map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={entry.key}
                            onChange={(e) => handleFaqChange(index, 'key', e.target.value)}
                            placeholder="Ex: documentos_necessarios"
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={entry.value}
                            onChange={(e) => handleFaqChange(index, 'value', e.target.value)}
                            placeholder="Resposta para esta questão frequente"
                            className="min-h-[60px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFaqEntry(index)}
                            disabled={faqEntries.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure respostas pré-definidas para perguntas frequentes. O chatbot usará estas respostas quando identificar uma pergunta relacionada ao tópico.
              </p>
            </div>

            <Button type="submit" disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Configurações"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chave da API OpenAI</CardTitle>
          <CardDescription>
            Configure a chave da API da OpenAI para utilizar o ChatGPT.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            A chave da API já está configurada no servidor. Caso precise alterá-la, entre em contato com o administrador do sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}