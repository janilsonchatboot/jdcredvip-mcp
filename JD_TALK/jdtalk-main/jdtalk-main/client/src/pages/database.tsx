import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";

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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Download, 
  Upload, 
  RefreshCw, 
  Database, 
  MessageSquare, 
  Users, 
  Ticket,
  FileText,
  Filter,
  Loader2
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DatabasePage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTable, setCurrentTable] = useState("conversations");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Consulta para obter dados da tabela selecionada
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/database/tables', currentTable],
    queryFn: async () => {
      // Simulação - em produção, conectar à API real
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Retornar dados simulados com base na tabela selecionada
      switch(currentTable) {
        case 'conversations':
          return getConversationsMockData();
        case 'customers':
          return getCustomersMockData();
        case 'messages':
          return getMessagesMockData();
        case 'tickets':
          return getTicketsMockData();
        default:
          return [];
      }
    }
  });
  
  // Tratamento de erros
  if (isError) {
    toast({
      title: "Erro ao carregar dados",
      description: "Não foi possível carregar os dados da tabela.",
      variant: "destructive",
    });
  }
  
  // Função de busca
  const filteredData = React.useMemo(() => {
    if (!data) return [];
    
    if (!searchTerm.trim()) return data;
    
    return data.filter((item: any) => 
      Object.values(item).some(
        value => 
          value !== null && 
          value !== undefined && 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);
  
  // Simulação de exportação de dados
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Exportação concluída",
        description: "Os dados foram exportados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Simulação de importação de dados
  const handleImportData = async () => {
    setIsImporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Importação concluída",
        description: "Os dados foram importados com sucesso.",
      });
      
      // Atualizar dados após importação
      refetch();
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: "Não foi possível importar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  // Obter cabeçalhos da tabela com base nos dados
  const getTableHeaders = () => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  };
  
  // Função para renderizar a tabela de dados
  const renderDataTable = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-2">Carregando dados...</p>
        </div>
      );
    }
    
    if (!data || data.length === 0) {
      return (
        <div className="text-center p-12">
          <Database className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Não há dados disponíveis para esta tabela</p>
        </div>
      );
    }
    
    const headers = getTableHeaders();
    
    return (
      <Table>
        <TableCaption>Tabela {getTableDisplayName(currentTable)}</TableCaption>
        <TableHeader>
          <TableRow>
            {headers.map(header => (
              <TableHead key={header}>{formatColumnName(header)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.map((row: any, index: number) => (
            <TableRow key={index}>
              {headers.map(header => (
                <TableCell key={`${index}-${header}`}>
                  {formatCellValue(row[header])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  // Formatação de valores
  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) return '-';
    
    if (typeof value === 'boolean') {
      return value ? 'Sim' : 'Não';
    }
    
    if (value instanceof Date) {
      return value.toLocaleString('pt-BR');
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };
  
  // Formatação de nomes de colunas
  const formatColumnName = (name: string) => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };
  
  // Obter nome amigável da tabela
  const getTableDisplayName = (tableName: string) => {
    const names: Record<string, string> = {
      conversations: 'Conversas',
      customers: 'Clientes',
      messages: 'Mensagens',
      tickets: 'Tickets',
    };
    
    return names[tableName] || tableName;
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciamento de Dados</h1>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExportData}
            disabled={isExporting || isLoading}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleImportData}
            disabled={isImporting || isLoading}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Tabelas</CardTitle>
              <CardDescription>
                Selecione uma tabela para visualizar seus dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant={currentTable === 'conversations' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setCurrentTable('conversations')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Conversas
                </Button>
                
                <Button
                  variant={currentTable === 'customers' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setCurrentTable('customers')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Clientes
                </Button>
                
                <Button
                  variant={currentTable === 'messages' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setCurrentTable('messages')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Mensagens
                </Button>
                
                <Button
                  variant={currentTable === 'tickets' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setCurrentTable('tickets')}
                >
                  <Ticket className="h-4 w-4 mr-2" />
                  Tickets
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>
                Filtre os dados da tabela
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Busca</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Buscar..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Filtros avançados</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full mt-2">
                        <Filter className="h-4 w-4 mr-2" />
                        Filtrar dados
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSearchTerm("")}>
                        Limpar filtros
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSearchTerm("pendente")}>
                        Status: Pendente
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSearchTerm("aberto")}>
                        Status: Aberto
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSearchTerm("concluído")}>
                        Status: Concluído
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>
                Dados da tabela: {getTableDisplayName(currentTable)}
              </CardTitle>
              <CardDescription>
                Visualize, edite ou exclua registros da tabela
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-auto">
              {renderDataTable()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Funções para gerar dados simulados
function getConversationsMockData() {
  return [
    { id: 1, customerName: "João Silva", lastMessage: "Gostaria de informações sobre empréstimo", status: "aberto", unreadCount: 2, updatedAt: new Date().toLocaleString('pt-BR') },
    { id: 2, customerName: "Maria Oliveira", lastMessage: "Pode me ajudar com meu financiamento?", status: "aberto", unreadCount: 0, updatedAt: new Date().toLocaleString('pt-BR') },
    { id: 3, customerName: "Carlos Souza", lastMessage: "Já resolvi, obrigado pela ajuda!", status: "concluído", unreadCount: 0, updatedAt: new Date().toLocaleString('pt-BR') },
    { id: 4, customerName: "Ana Pereira", lastMessage: "Preciso renegociar minha dívida", status: "pendente", unreadCount: 1, updatedAt: new Date().toLocaleString('pt-BR') },
    { id: 5, customerName: "Paulo Santos", lastMessage: "Qual o prazo para aprovação?", status: "aberto", unreadCount: 3, updatedAt: new Date().toLocaleString('pt-BR') },
  ];
}

function getCustomersMockData() {
  return [
    { id: 1, name: "João Silva", phone: "+5511987654321", email: "joao@exemplo.com", documentType: "CPF", documentNumber: "123.456.789-01", createdAt: new Date().toLocaleString('pt-BR') },
    { id: 2, name: "Maria Oliveira", phone: "+5511876543210", email: "maria@exemplo.com", documentType: "CPF", documentNumber: "234.567.890-12", createdAt: new Date().toLocaleString('pt-BR') },
    { id: 3, name: "Carlos Souza", phone: "+5521987654321", email: "carlos@exemplo.com", documentType: "CPF", documentNumber: "345.678.901-23", createdAt: new Date().toLocaleString('pt-BR') },
    { id: 4, name: "Ana Pereira", phone: "+5531987654321", email: "ana@exemplo.com", documentType: "CPF", documentNumber: "456.789.012-34", createdAt: new Date().toLocaleString('pt-BR') },
    { id: 5, name: "Paulo Santos", phone: "+5541987654321", email: "paulo@exemplo.com", documentType: "CPF", documentNumber: "567.890.123-45", createdAt: new Date().toLocaleString('pt-BR') },
  ];
}

function getMessagesMockData() {
  return [
    { id: 1, conversationId: 1, content: "Olá! Gostaria de saber sobre empréstimos consignados", senderType: "customer", status: "read", timestamp: new Date().toLocaleString('pt-BR') },
    { id: 2, conversationId: 1, content: "Bom dia! Claro, posso ajudar. Qual seu vínculo?", senderType: "agent", status: "read", timestamp: new Date().toLocaleString('pt-BR') },
    { id: 3, conversationId: 2, content: "Preciso de ajuda com meu financiamento", senderType: "customer", status: "read", timestamp: new Date().toLocaleString('pt-BR') },
    { id: 4, conversationId: 2, content: "Olá! Em que posso ajudar com seu financiamento?", senderType: "agent", status: "delivered", timestamp: new Date().toLocaleString('pt-BR') },
    { id: 5, conversationId: 3, content: "Já resolvi meu problema, obrigado!", senderType: "customer", status: "read", timestamp: new Date().toLocaleString('pt-BR') },
  ];
}

function getTicketsMockData() {
  return [
    { id: 1, conversationId: 1, subject: "Dúvida sobre empréstimo consignado", status: "aberto", priority: "média", assignedTo: "Carlos (Atendente)", createdAt: new Date().toLocaleString('pt-BR'), updatedAt: new Date().toLocaleString('pt-BR') },
    { id: 2, conversationId: 2, subject: "Problema com financiamento", status: "pendente", priority: "alta", assignedTo: "Ana (Supervisora)", createdAt: new Date().toLocaleString('pt-BR'), updatedAt: new Date().toLocaleString('pt-BR') },
    { id: 3, conversationId: 3, subject: "Acompanhamento de proposta", status: "concluído", priority: "baixa", assignedTo: "Paulo (Atendente)", createdAt: new Date().toLocaleString('pt-BR'), updatedAt: new Date().toLocaleString('pt-BR') },
    { id: 4, conversationId: 4, subject: "Renegociação de dívida", status: "aberto", priority: "alta", assignedTo: "Maria (Financeiro)", createdAt: new Date().toLocaleString('pt-BR'), updatedAt: new Date().toLocaleString('pt-BR') },
    { id: 5, conversationId: 5, subject: "Informações sobre prazo", status: "pendente", priority: "média", assignedTo: "João (Atendente)", createdAt: new Date().toLocaleString('pt-BR'), updatedAt: new Date().toLocaleString('pt-BR') },
  ];
}