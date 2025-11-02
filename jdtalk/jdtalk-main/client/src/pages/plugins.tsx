import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PackagePlus, RefreshCw, Trash2, Upload, Check, X, FileCode, Settings } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

// Definição do tipo Plugin
type Plugin = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  version: string;
  author: string | null;
  homepageUrl: string | null;
  repositoryUrl: string | null;
  icon: string | null;
  isActive: boolean;
  isCore: boolean;
  installPath: string | null;
  manifest: any;
  installedAt: string;
  updatedAt: string;
};

// Schema de validação para instalação de plugin
const installPluginSchema = z.object({
  url: z.string().url({ message: "URL inválida" }),
  activate: z.boolean().default(true),
});

export default function PluginsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("installed");
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);

  // Query para buscar plugins instalados
  const { data: plugins, isLoading } = useQuery({
    queryKey: ['/api/plugins'],
    select: (data: Plugin[]) => data.sort((a, b) => a.name.localeCompare(b.name)),
  });

  // Query para buscar plugins disponíveis no repositório
  const { data: availablePlugins = [], isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['/api/plugins/registry/available'],
    enabled: activeTab === "available",
    select: (data: any[] = []) => data,
  });

  // Formulário para instalação de plugin
  const installForm = useForm<z.infer<typeof installPluginSchema>>({
    resolver: zodResolver(installPluginSchema),
    defaultValues: {
      url: "",
      activate: true,
    },
  });

  // Mutação para instalar plugin
  const installMutation = useMutation({
    mutationFn: (values: z.infer<typeof installPluginSchema>) => {
      return apiRequest('POST', '/api/plugins/install', values);
    },
    onSuccess: () => {
      toast({
        title: "Plugin instalado com sucesso",
        description: "O plugin foi instalado no sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      setInstallDialogOpen(false);
      installForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao instalar plugin",
        description: error.message || "Ocorreu um erro ao instalar o plugin.",
        variant: "destructive",
      });
    },
  });

  // Mutação para ativar/desativar plugin
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => {
      const endpoint = active ? '/api/plugins/' + id + '/activate' : '/api/plugins/' + id + '/deactivate';
      return apiRequest('PATCH', endpoint);
    },
    onSuccess: (data, variables) => {
      const action = variables.active ? "ativado" : "desativado";
      toast({
        title: `Plugin ${action} com sucesso`,
        description: `O plugin foi ${action} no sistema.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
    },
    onError: (error: any, variables) => {
      const action = variables.active ? "ativar" : "desativar";
      toast({
        title: `Erro ao ${action} plugin`,
        description: error.message || `Ocorreu um erro ao ${action} o plugin.`,
        variant: "destructive",
      });
    },
  });

  // Mutação para desinstalar plugin
  const uninstallMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', '/api/plugins/' + id);
    },
    onSuccess: (data, id) => {
      toast({
        title: "Plugin desinstalado com sucesso",
        description: "O plugin foi removido do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      if (selectedPlugin?.id === id) {
        setSelectedPlugin(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao desinstalar plugin",
        description: error.message || "Ocorreu um erro ao desinstalar o plugin.",
        variant: "destructive",
      });
    },
  });

  // Função para instalar plugin
  const onInstallSubmit = (values: z.infer<typeof installPluginSchema>) => {
    installMutation.mutate(values);
  };

  // Função para confirmar a desinstalação
  const confirmUninstall = (plugin: Plugin) => {
    if (confirm(`Tem certeza que deseja desinstalar o plugin ${plugin.name}?`)) {
      uninstallMutation.mutate(plugin.id);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plugins</h1>
          <p className="text-muted-foreground">
            Gerencie os plugins instalados e instale novos plugins no sistema
          </p>
        </div>

        <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <PackagePlus size={18} />
              <span>Instalar Plugin</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Instalar novo plugin</DialogTitle>
              <DialogDescription>
                Informe a URL do arquivo .zip do plugin para instalá-lo no sistema.
              </DialogDescription>
            </DialogHeader>

            <Form {...installForm}>
              <form onSubmit={installForm.handleSubmit(onInstallSubmit)} className="space-y-4">
                <FormField
                  control={installForm.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Plugin</FormLabel>
                      <FormControl>
                        <Input placeholder="https://exemplo.com/meu-plugin.zip" {...field} />
                      </FormControl>
                      <FormDescription>
                        O arquivo deve ser um .zip contendo o manifesto e os arquivos do plugin.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={installForm.control}
                  name="activate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Ativar após instalação</FormLabel>
                        <FormDescription>
                          O plugin será ativado automaticamente após a instalação
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

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInstallDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={installMutation.isPending}>
                    {installMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Instalando...
                      </>
                    ) : (
                      <>Instalar</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="installed">Plugins Instalados</TabsTrigger>
          <TabsTrigger value="available">Catálogo de Plugins</TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : plugins?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plugins.map((plugin) => (
                <Card key={plugin.id} className="overflow-hidden">
                  <CardHeader className="relative pb-2">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <CardTitle className="flex items-center">
                          {plugin.icon ? (
                            <img
                              src={plugin.icon}
                              alt=""
                              className="w-5 h-5 mr-2"
                            />
                          ) : (
                            <FileCode size={18} className="mr-2 text-muted-foreground" />
                          )}
                          {plugin.name}
                        </CardTitle>
                        <CardDescription>{plugin.version}</CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        {plugin.isCore && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary">Core</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Plugin principal do sistema. Não pode ser desinstalado.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant={plugin.isActive ? "default" : "outline"}>
                                {plugin.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Status do plugin</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-muted-foreground">
                      {plugin.description || "Sem descrição disponível"}
                    </p>
                    {plugin.author && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Autor: {plugin.author}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={plugin.isActive ? "destructive" : "default"}
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: plugin.id,
                            active: !plugin.isActive,
                          })
                        }
                        disabled={toggleActiveMutation.isPending}
                      >
                        {toggleActiveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : plugin.isActive ? (
                          <X size={16} className="mr-1" />
                        ) : (
                          <Check size={16} className="mr-1" />
                        )}
                        {plugin.isActive ? "Desativar" : "Ativar"}
                      </Button>
                      {!plugin.isCore && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => confirmUninstall(plugin)}
                          disabled={uninstallMutation.isPending}
                        >
                          {uninstallMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </Button>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      <Settings size={16} />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <PackagePlus size={48} className="text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum plugin instalado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Instale plugins para adicionar novas funcionalidades ao sistema.
                </p>
                <Button onClick={() => setInstallDialogOpen(true)}>
                  Instalar Plugin
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          {isLoadingAvailable ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : availablePlugins?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availablePlugins.map((plugin: any) => (
                <Card key={plugin.id} className="overflow-hidden">
                  <CardHeader className="relative pb-2">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <CardTitle className="flex items-center">
                          {plugin.icon ? (
                            <img
                              src={plugin.icon}
                              alt=""
                              className="w-5 h-5 mr-2"
                            />
                          ) : (
                            <FileCode size={18} className="mr-2 text-muted-foreground" />
                          )}
                          {plugin.name}
                        </CardTitle>
                        <CardDescription>{plugin.version}</CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        {plugin.isVerified && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="secondary">Verificado</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Plugin verificado pelo desenvolvedor do JDTalk</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {plugin.isFeatured && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="default">Destaque</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Plugin recomendado</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-muted-foreground">
                      {plugin.description || "Sem descrição disponível"}
                    </p>
                    {plugin.author && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Autor: {plugin.author}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        installForm.setValue("url", plugin.downloadUrl);
                        setInstallDialogOpen(true);
                      }}
                    >
                      <Upload size={16} className="mr-2" />
                      Instalar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <RefreshCw size={48} className="text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Catálogo de plugins indisponível
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Não foi possível carregar os plugins disponíveis no momento.
                </p>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/plugins/registry/available'] })}>
                  Tentar Novamente
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}