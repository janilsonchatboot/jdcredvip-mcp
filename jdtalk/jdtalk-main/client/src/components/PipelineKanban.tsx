import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Pipeline,
  PipelineStage,
  LeadWithDetails,
  Customer,
  User
} from '@shared/schema';

// Componentes shadcn
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Ícones
import {
  Phone,
  MessageSquare,
  Clock,
  Calendar,
  FileText,
  User as UserIcon,
  PlusCircle,
  DollarSign,
  MoreVertical,
  Trash,
  Edit,
  CheckCircle,
  XCircle,
  ArrowRightCircle,
  ArrowLeftCircle
} from 'lucide-react';
import LeadForm from './LeadForm';
import LeadActivityForm from './LeadActivityForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PipelineKanbanProps {
  pipelineId: number;
}

export default function PipelineKanban({ pipelineId }: PipelineKanbanProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithDetails | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Buscar informações do pipeline
  const { data: pipeline, isLoading: isPipelineLoading } = useQuery<Pipeline>({
    queryKey: ['/api/pipelines', pipelineId],
    queryFn: async () => {
      const response = await apiRequest(`/api/pipelines/${pipelineId}`);
      return response.json();
    },
  });

  // Buscar estágios do pipeline
  const { data: stages = [], isLoading: isStagesLoading } = useQuery<PipelineStage[]>({
    queryKey: ['/api/pipeline-stages', pipelineId],
    queryFn: async () => {
      const response = await apiRequest(`/api/pipeline-stages?pipelineId=${pipelineId}`);
      return response.json();
    },
    enabled: !!pipelineId,
  });

  // Buscar leads do pipeline
  const { data: leads = [], isLoading: isLeadsLoading } = useQuery<LeadWithDetails[]>({
    queryKey: ['/api/leads', pipelineId],
    queryFn: async () => {
      const response = await apiRequest(`/api/leads?pipelineId=${pipelineId}`);
      return response.json();
    },
    enabled: !!pipelineId,
  });

  // Mutation para mover um lead entre estágios
  const moveLead = useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: number; stageId: number }) => {
      const response = await apiRequest(`/api/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ stageId }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads', pipelineId] });
      toast({
        title: 'Lead movido',
        description: 'O lead foi movido para outro estágio com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível mover o lead. Tente novamente.',
        variant: 'destructive',
      });
      console.error('Error moving lead:', error);
    },
  });

  // Mutation para excluir um lead
  const deleteLead = useMutation({
    mutationFn: async (leadId: number) => {
      const response = await apiRequest(`/api/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads', pipelineId] });
      toast({
        title: 'Lead excluído',
        description: 'O lead foi excluído com sucesso.',
      });
      setSelectedLead(null);
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o lead. Tente novamente.',
        variant: 'destructive',
      });
      console.error('Error deleting lead:', error);
    },
  });

  // Mutation para marcar um lead como ganho/perdido
  const updateLeadStatus = useMutation({
    mutationFn: async ({ leadId, status, lostReason }: { leadId: number; status: 'won' | 'lost'; lostReason?: string }) => {
      const payload: any = { status };
      if (status === 'lost' && lostReason) {
        payload.lostReason = lostReason;
      }
      
      const response = await apiRequest(`/api/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads', pipelineId] });
      toast({
        title: 'Status atualizado',
        description: 'O status do lead foi atualizado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status do lead. Tente novamente.',
        variant: 'destructive',
      });
      console.error('Error updating lead status:', error);
    },
  });

  // Abrir formulário para criar um novo lead
  const handleNewLead = () => {
    setSelectedLead(null);
    setLeadFormOpen(true);
  };

  // Abrir formulário para editar um lead existente
  const handleEditLead = (lead: LeadWithDetails) => {
    setSelectedLead(lead);
    setLeadFormOpen(true);
  };

  // Abrir formulário para adicionar uma atividade a um lead
  const handleAddActivity = (lead: LeadWithDetails) => {
    setSelectedLead(lead);
    setActivityFormOpen(true);
  };

  // Confirmar e excluir um lead
  const handleDeleteLead = () => {
    if (selectedLead) {
      deleteLead.mutate(selectedLead.id);
      setDeleteConfirmOpen(false);
    }
  };

  // Filtrar leads baseado na aba selecionada
  const filteredLeads = activeTab === 'all' 
    ? leads 
    : leads.filter(lead => {
        if (activeTab === 'active') return lead.status === 'active';
        if (activeTab === 'won') return lead.status === 'won';
        if (activeTab === 'lost') return lead.status === 'lost';
        return true;
      });

  // Agrupar leads por estágio para exibição no Kanban
  const leadsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = filteredLeads.filter(lead => lead.stageId === stage.id);
    return acc;
  }, {} as Record<number, LeadWithDetails[]>);

  // Formatar valor do crédito
  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'Não informado';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parseFloat(amount));
  };

  // Formatar data limite
  const formatDueDate = (date: Date | null) => {
    if (!date) return null;
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  // Obter cor do estágio para o card
  const getStageColor = (stageId: number) => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.color || 'gray';
  };

  // Verificar se pode mover para o próximo estágio
  const canMoveNext = (lead: LeadWithDetails) => {
    const currentStageIndex = stages.findIndex(s => s.id === lead.stageId);
    return currentStageIndex < stages.length - 1;
  };

  // Verificar se pode mover para o estágio anterior
  const canMovePrevious = (lead: LeadWithDetails) => {
    const currentStageIndex = stages.findIndex(s => s.id === lead.stageId);
    return currentStageIndex > 0;
  };

  // Mover lead para o próximo estágio
  const moveToNextStage = (lead: LeadWithDetails) => {
    const currentStageIndex = stages.findIndex(s => s.id === lead.stageId);
    if (currentStageIndex < stages.length - 1) {
      const nextStage = stages[currentStageIndex + 1];
      moveLead.mutate({ leadId: lead.id, stageId: nextStage.id });
    }
  };

  // Mover lead para o estágio anterior
  const moveToPreviousStage = (lead: LeadWithDetails) => {
    const currentStageIndex = stages.findIndex(s => s.id === lead.stageId);
    if (currentStageIndex > 0) {
      const previousStage = stages[currentStageIndex - 1];
      moveLead.mutate({ leadId: lead.id, stageId: previousStage.id });
    }
  };

  // Obter iniciais de um nome para o avatar
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Verificar status de carregamento
  const isLoading = isPipelineLoading || isStagesLoading || isLeadsLoading;

  // Renderizar skeletons enquanto carrega
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="flex space-x-4 overflow-x-auto">
          {[1, 2, 3].map(i => (
            <div key={i} className="min-w-[320px]">
              <Skeleton className="h-8 w-full mb-4" />
              <div className="space-y-4">
                {[1, 2].map(j => (
                  <Skeleton key={j} className="h-48 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{pipeline?.name || 'Pipeline de Crédito'}</h1>
            <p className="text-muted-foreground">{pipeline?.description || 'Gerencie suas oportunidades de crédito'}</p>
          </div>
          <Button onClick={handleNewLead}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Oportunidade
          </Button>
        </div>
      </div>

      {/* Tabs de filtro */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Todas ({leads.length})</TabsTrigger>
          <TabsTrigger value="active">
            Em Andamento ({leads.filter(l => l.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="won">
            Aprovadas ({leads.filter(l => l.status === 'won').length})
          </TabsTrigger>
          <TabsTrigger value="lost">
            Recusadas ({leads.filter(l => l.status === 'lost').length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Visão Kanban */}
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex space-x-4">
          {stages.map(stage => (
            <div key={stage.id} className="min-w-[320px]" style={{ maxWidth: '360px' }}>
              <div 
                className="flex items-center mb-4 px-2 py-1 rounded-md"
                style={{ backgroundColor: `${stage.color ?? '#3498db'}20` }}
              >
                <div 
                  className="h-3 w-3 rounded-full mr-2" 
                  style={{ backgroundColor: stage.color ?? '#3498db' }}
                />
                <h3 className="font-medium">{stage.name}</h3>
                <Badge variant="outline" className="ml-2">
                  {leadsByStage[stage.id]?.length || 0}
                </Badge>
              </div>
              
              <div className="space-y-4 min-h-[200px]">
                {leadsByStage[stage.id]?.map(lead => (
                  <Card key={lead.id} className={`
                    hover:shadow-md transition-shadow
                    ${lead.status === 'won' ? 'border-green-500 border-2' : ''}
                    ${lead.status === 'lost' ? 'border-red-500 border-2' : ''}
                  `}>
                    <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{lead.title}</CardTitle>
                        <CardDescription>
                          {formatCurrency(lead.amount)}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditLead(lead)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddActivity(lead)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Adicionar Atividade
                          </DropdownMenuItem>
                          {lead.status === 'active' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => updateLeadStatus.mutate({ leadId: lead.id, status: 'won' })}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marcar como Aprovado
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateLeadStatus.mutate({ leadId: lead.id, status: 'lost' })}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Marcar como Recusado
                              </DropdownMenuItem>
                            </>
                          )}
                          {canMoveNext(lead) && (
                            <DropdownMenuItem onClick={() => moveToNextStage(lead)}>
                              <ArrowRightCircle className="mr-2 h-4 w-4" />
                              Mover para Próximo Estágio
                            </DropdownMenuItem>
                          )}
                          {canMovePrevious(lead) && (
                            <DropdownMenuItem onClick={() => moveToPreviousStage(lead)}>
                              <ArrowLeftCircle className="mr-2 h-4 w-4" />
                              Mover para Estágio Anterior
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setSelectedLead(lead);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    
                    <CardContent className="p-4 pt-2">
                      <div className="text-sm text-muted-foreground mb-2">
                        <div className="flex items-center mb-1">
                          <UserIcon className="h-3 w-3 mr-2" />
                          <span className="truncate">{lead.customer?.name || lead.customer?.phoneNumber}</span>
                        </div>
                        
                        {lead.productType && (
                          <div className="flex items-center mb-1">
                            <DollarSign className="h-3 w-3 mr-2" />
                            <span>
                              {lead.productType === 'consignado' && 'Empréstimo Consignado'}
                              {lead.productType === 'pessoal' && 'Empréstimo Pessoal'}
                              {lead.productType === 'fgts' && 'Antecipação de FGTS'}
                              {lead.productType === 'bolsa-familia' && 'Empréstimo Bolsa Família'}
                              {lead.productType === 'energia' && 'Empréstimo na Conta de Energia'}
                            </span>
                          </div>
                        )}
                        
                        {lead.expiresAt && (
                          <div className="flex items-center mb-1">
                            <Calendar className="h-3 w-3 mr-2" />
                            <span>Expira em: {formatDueDate(new Date(lead.expiresAt))}</span>
                          </div>
                        )}
                      </div>
                      
                      {lead.assignedUser && (
                        <div className="flex items-center mt-3 pt-3 border-t border-gray-100">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarFallback>
                                    {getInitials(lead.assignedUser.displayName)}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Responsável: {lead.assignedUser.displayName}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {(!leadsByStage[stage.id] || leadsByStage[stage.id].length === 0) && (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>Nenhuma oportunidade neste estágio</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Formulário de Lead */}
      {leadFormOpen && (
        <LeadForm
          open={leadFormOpen}
          pipelineId={pipelineId}
          leadToEdit={selectedLead || undefined}
          onClose={() => {
            setLeadFormOpen(false);
            setSelectedLead(null);
          }}
        />
      )}

      {/* Formulário de Atividade */}
      {activityFormOpen && selectedLead && (
        <LeadActivityForm
          open={activityFormOpen}
          leadId={selectedLead.id}
          onClose={() => {
            setActivityFormOpen(false);
            setSelectedLead(null);
          }}
        />
      )}

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Oportunidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a oportunidade 
              e todas as atividades associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteLead} 
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Componentes de ícones auxiliares para botões de ação
const IconButton = ({ icon, onClick, size = 'sm', className = '' }: any) => {
  return (
    <Button 
      variant="ghost" 
      size={size} 
      className={`h-8 w-8 p-0 ${className}`} 
      onClick={onClick}
    >
      {icon}
    </Button>
  );
};

const ActionIcon = ({ icon, onClick, size = 'sm', className = '' }: any) => {
  return (
    <Button 
      variant="outline" 
      size={size} 
      className={`h-7 w-7 p-0 rounded-full ${className}`} 
      onClick={onClick}
    >
      {icon}
    </Button>
  );
};

const StatusIcon = ({ icon, onClick, size = 'sm', className = '' }: any) => {
  return (
    <Button 
      variant="ghost" 
      size={size} 
      className={`h-6 w-6 p-0 rounded-full ${className}`} 
      onClick={onClick}
    >
      {icon}
    </Button>
  );
};