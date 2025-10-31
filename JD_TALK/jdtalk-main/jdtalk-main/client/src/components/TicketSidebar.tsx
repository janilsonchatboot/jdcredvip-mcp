import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TicketWithDetails } from "@shared/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/useSocket";

type TicketSidebarProps = {
  conversationId?: number;
  className?: string;
};

export default function TicketSidebar({
  conversationId,
  className = "",
}: TicketSidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: ticket, isLoading } = useQuery<TicketWithDetails>({
    queryKey: [`/api/conversations/${conversationId}/ticket`],
    enabled: !!conversationId,
  });
  
  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return apiRequest("PATCH", `/api/tickets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conversations/${conversationId}/ticket`] 
      });
      
      toast({
        title: "Success",
        description: "Ticket updated successfully",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update ticket",
      });
    }
  });
  
  // Handle WebSocket events
  useSocket({
    onTicketUpdate: (ticketUpdate) => {
      if (ticketUpdate.conversationId === conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/conversations/${conversationId}/ticket`] 
        });
      }
    }
  });
  
  const handleUpdateStatus = (status: string) => {
    if (!ticket) return;
    
    updateTicketMutation.mutate({
      id: ticket.id,
      data: { status }
    });
  };
  
  const handleUpdatePriority = (priority: string) => {
    if (!ticket) return;
    
    updateTicketMutation.mutate({
      id: ticket.id,
      data: { priority }
    });
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-primary-light';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'resolved':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-blue-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={`w-full lg:w-80 bg-white border-l border-neutral-medium overflow-y-auto ${className}`}>
      {/* Ticket Header */}
      <div className="p-4 border-b border-neutral-medium">
        <h2 className="font-semibold text-lg">Ticket Information</h2>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-neutral-200 rounded w-20 mb-1"></div>
              <div className="h-6 bg-neutral-200 rounded w-40"></div>
            </div>
          ))}
        </div>
      ) : ticket ? (
        <>
          {/* Ticket Details */}
          <div className="p-4 border-b border-neutral-medium">
            <div className="mb-4">
              <h3 className="text-sm text-text-secondary mb-1">Ticket ID</h3>
              <p className="font-medium">#{ticket.id}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm text-text-secondary mb-1">Status</h3>
              <Select 
                defaultValue={ticket.status} 
                onValueChange={handleUpdateStatus}
                disabled={updateTicketMutation.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    <div className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${getStatusColor(ticket.status)} mr-1`}></span>
                      <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">
                    <div className="flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary-light mr-1"></span>
                      <span>Open</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="in_progress">
                    <div className="flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
                      <span>In Progress</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="resolved">
                    <div className="flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                      <span>Resolved</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mb-4">
              <h3 className="text-sm text-text-secondary mb-1">Assigned to</h3>
              <div className="flex items-center">
                {ticket.assignedTo ? (
                  <>
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-xs mr-2">
                      {ticket.assignedTo.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{ticket.assignedTo.displayName}</span>
                  </>
                ) : (
                  <span className="text-text-secondary">Not assigned</span>
                )}
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-sm text-text-secondary mb-1">Priority</h3>
              <Select 
                defaultValue={ticket.priority} 
                onValueChange={handleUpdatePriority}
                disabled={updateTicketMutation.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    <div className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${getPriorityColor(ticket.priority)} mr-1`}></span>
                      <span className="capitalize">{ticket.priority}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                      <span>Low</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
                      <span>Medium</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                      <span>High</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <h3 className="text-sm text-text-secondary mb-1">Created</h3>
              <p className="font-medium">
                {format(new Date(ticket.createdAt), 'MMMM d, yyyy - h:mm a')}
              </p>
            </div>
          </div>

          {/* Customer Information */}
          <div className="p-4 border-b border-neutral-medium">
            <h3 className="font-semibold mb-3">Customer Information</h3>
            <div className="mb-4">
              <h4 className="text-sm text-text-secondary mb-1">Name</h4>
              <p className="font-medium">{ticket.customer.name || 'Not provided'}</p>
            </div>
            <div className="mb-4">
              <h4 className="text-sm text-text-secondary mb-1">Phone</h4>
              <p className="font-medium">{ticket.customer.phoneNumber}</p>
            </div>
            <div className="mb-4">
              <h4 className="text-sm text-text-secondary mb-1">Email</h4>
              <p className="font-medium">{ticket.customer.email || 'Not provided'}</p>
            </div>
            <div>
              <h4 className="text-sm text-text-secondary mb-1">Customer since</h4>
              <p className="font-medium">
                {format(new Date(ticket.customer.customerSince), 'MMMM yyyy')}
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="p-4 border-b border-neutral-medium">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Tags</h3>
              <Button variant="link" className="text-primary text-sm p-0 h-auto">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ticket.tags && ticket.tags.length > 0 ? (
                ticket.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-text-secondary text-sm">No tags added</span>
              )}
            </div>
          </div>

          {/* Related Orders */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Related Orders</h3>
              <Button variant="link" className="text-primary text-sm p-0 h-auto">View All</Button>
            </div>
            {ticket.orders && ticket.orders.length > 0 ? (
              ticket.orders.map((order) => (
                <div key={order.id} className="bg-neutral-light p-3 rounded-lg mb-3">
                  <div className="flex justify-between mb-1">
                    <h4 className="font-medium">#{order.orderId}</h4>
                    <Badge 
                      variant="outline" 
                      className={`
                        ${order.status === 'delivered' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                        ${order.status === 'shipped' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
                        ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''}
                      `}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary mb-1">
                    {format(new Date(order.createdAt), 'MMMM d, yyyy')}
                  </p>
                  <p className="text-sm font-medium">${order.amount}</p>
                </div>
              ))
            ) : (
              <div className="text-text-secondary text-sm">No orders found</div>
            )}
          </div>
        </>
      ) : (
        <div className="p-4 text-text-secondary">
          {conversationId ? 'Ticket not found' : 'Select a conversation to view ticket information'}
        </div>
      )}
    </div>
  );
}
