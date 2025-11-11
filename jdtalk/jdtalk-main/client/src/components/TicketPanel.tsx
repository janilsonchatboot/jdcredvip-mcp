import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";

interface TicketPanelProps {
  conversationId?: number;
  onClose: () => void;
}

export default function TicketPanel({ conversationId, onClose }: TicketPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [ticketData, setTicketData] = useState({
    subject: "",
    description: "",
    status: "open",
    priority: "medium"
  });
  
  // Fetch ticket for this conversation
  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: [`/api/conversations/${conversationId}/ticket`],
    queryFn: () => 
      fetch(`/api/conversations/${conversationId}/ticket`).then(res => {
        if (!res.ok) {
          if (res.status === 404) {
            return null; // No ticket exists
          }
          throw new Error('Failed to fetch ticket');
        }
        return res.json();
      }),
    enabled: !!conversationId,
  });
  
  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: (ticketData: any) => 
      fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create ticket');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/ticket`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: "Sucesso",
        description: "Ticket criado com sucesso",
      });
      setEditMode(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o ticket: " + error,
        variant: "destructive"
      });
    }
  });
  
  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => 
      fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update ticket');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/ticket`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: "Sucesso",
        description: "Ticket atualizado com sucesso",
      });
      setEditMode(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o ticket: " + error,
        variant: "destructive"
      });
    }
  });
  
  // Handle create/update ticket
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (ticket) {
      // Update existing ticket
      updateTicketMutation.mutate({
        id: ticket.id,
        data: ticketData
      });
    } else {
      // Create new ticket
      createTicketMutation.mutate({
        ...ticketData,
        conversationId,
        assignedToId: user?.id
      });
    }
  };
  
  // Handle edit button click
  const handleEditClick = () => {
    if (ticket) {
      setTicketData({
        subject: ticket.subject || "",
        description: ticket.description || "",
        status: ticket.status || "open",
        priority: ticket.priority || "medium"
      });
    }
    setEditMode(true);
  };
  
  // Handle ticket status change
  const handleStatusChange = (status: string) => {
    if (ticket) {
      updateTicketMutation.mutate({
        id: ticket.id,
        data: { status }
      });
    }
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return "bg-blue-100 text-blue-800";
      case 'pending': return "bg-yellow-100 text-yellow-800";
      case 'resolved': return "bg-green-100 text-green-800";
      case 'closed': return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  // Get priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return "bg-green-100 text-green-800";
      case 'medium': return "bg-blue-100 text-blue-800";
      case 'high': return "bg-yellow-100 text-yellow-800";
      case 'urgent': return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  // If there's no conversation selected, show a placeholder
  if (!conversationId) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold">Detalhes do Ticket</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-text-secondary">
          Selecione uma conversa para ver ou criar um ticket
        </div>
      </div>
    );
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold">Detalhes do Ticket</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (isError) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold">Detalhes do Ticket</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 text-red-500">
          Erro ao carregar os detalhes do ticket. Tente novamente.
        </div>
      </div>
    );
  }
  
  // Edit form or create new ticket
  if (editMode || !ticket) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold">{ticket ? 'Editar Ticket' : 'Novo Ticket'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 flex-1 overflow-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Assunto</label>
              <Input 
                value={ticketData.subject}
                onChange={(e) => setTicketData({...ticketData, subject: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <Textarea 
                value={ticketData.description}
                onChange={(e) => setTicketData({...ticketData, description: e.target.value})}
                className="min-h-[120px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select 
                  value={ticketData.status}
                  onValueChange={(value) => setTicketData({...ticketData, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Prioridade</label>
                <Select 
                  value={ticketData.priority}
                  onValueChange={(value) => setTicketData({...ticketData, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditMode(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createTicketMutation.isPending || updateTicketMutation.isPending}
              >
                {createTicketMutation.isPending || updateTicketMutation.isPending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  ticket ? 'Atualizar' : 'Criar'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
  // Display ticket details
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="font-semibold">Detalhes do Ticket</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4 flex-1 overflow-auto">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">{ticket.subject}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <Badge className={getStatusColor(ticket.status)}>
                {ticket.status === 'open' ? 'Aberto' : 
                 ticket.status === 'pending' ? 'Pendente' :
                 ticket.status === 'resolved' ? 'Resolvido' : 'Fechado'}
              </Badge>
              <Badge className={getPriorityColor(ticket.priority)}>
                {ticket.priority === 'low' ? 'Baixa' :
                 ticket.priority === 'medium' ? 'Média' :
                 ticket.priority === 'high' ? 'Alta' : 'Urgente'}
              </Badge>
            </div>
          </div>
          
          {ticket.description && (
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-1">Descrição</h4>
              <p className="text-sm whitespace-pre-line">{ticket.description}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-secondary">Detalhes</h4>
            <div className="text-sm grid grid-cols-[100px_1fr] gap-y-1">
              <span className="text-text-secondary">Criado em:</span>
              <span>{format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm')}</span>
              
              <span className="text-text-secondary">Atribuído para:</span>
              <span>{ticket.assignedTo?.displayName || 'Não atribuído'}</span>
              
              {ticket.updatedAt && (
                <>
                  <span className="text-text-secondary">Atualizado em:</span>
                  <span>{format(new Date(ticket.updatedAt), 'dd/MM/yyyy HH:mm')}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-2 pt-4">
            <h4 className="text-sm font-medium mb-2">Alterar Status</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={ticket.status === 'open' ? 'default' : 'outline'}
                onClick={() => handleStatusChange('open')}
              >
                Aberto
              </Button>
              <Button
                size="sm"
                variant={ticket.status === 'pending' ? 'default' : 'outline'}
                onClick={() => handleStatusChange('pending')}
              >
                Pendente
              </Button>
              <Button
                size="sm"
                variant={ticket.status === 'resolved' ? 'default' : 'outline'}
                onClick={() => handleStatusChange('resolved')}
              >
                Resolvido
              </Button>
              <Button
                size="sm"
                variant={ticket.status === 'closed' ? 'default' : 'outline'}
                onClick={() => handleStatusChange('closed')}
              >
                Fechado
              </Button>
            </div>
          </div>
          
          <div className="pt-4">
            <Button onClick={handleEditClick} className="w-full">
              Editar Ticket
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
