import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Conversation, Customer, Message } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import MessageItem from "@/components/MessageItem";
import { apiRequest } from "@/lib/queryClient";
import { useSocket } from "@/hooks/useSocket";

type ChatAreaProps = {
  conversationId?: number;
  onToggleSidebar: () => void;
  onToggleTicket: () => void;
  className?: string;
};

export default function ChatArea({
  conversationId,
  onToggleSidebar,
  onToggleTicket,
  className = "",
}: ChatAreaProps) {
  const [message, setMessage] = useState("");
  const [isAttaching, setIsAttaching] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch conversation details
  const { data: conversationData, isLoading: isLoadingConversation } = useQuery<Conversation & { customer: Customer }>({
    queryKey: [`/api/conversations/${conversationId}`],
    enabled: !!conversationId,
    queryFn: async () => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch conversation');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching conversation:', error);
        throw error;
      }
    }
  });
  
  // Fetch messages
  const { data: messages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    enabled: !!conversationId,
    refetchInterval: 0, // We'll use the socket for real-time updates
    queryFn: async () => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
    }
  });
  
  // Handle WebSocket events
  const { isConnected } = useSocket({
    onNewMessage: (message) => {
      console.log('New message received in ChatArea:', message);
      if (message.conversationId === conversationId) {
        // Update messages directly in cache to avoid unnecessary requests
        queryClient.setQueryData(
          [`/api/conversations/${conversationId}/messages`],
          (oldData: Message[] | undefined) => {
            if (!oldData) return [message];
            if (oldData.some(m => m.id === message.id)) return oldData;
            return [...oldData, message];
          }
        );
        // Scroll to bottom automatically when new message arrives
        setTimeout(() => scrollToBottom(), 100);
      }
    },
    onMessageStatus: (update) => {
      console.log('Message status update received:', update);
      queryClient.setQueryData(
        [`/api/conversations/${conversationId}/messages`], 
        (oldData: Message[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(msg => 
            msg.id === update.id ? { ...msg, status: update.status } : msg
          );
        }
      );
    },
    onConversationUpdated: (data) => {
      console.log('Conversation updated:', data);
      if (data.id === conversationId) {
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}`] });
      }
    }
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string, mediaType?: string | null, mediaUrl?: string | null }) => {
      if (!conversationId) return null;

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conversations/${conversationId}/messages`] 
      });
    },
    onError: (error) => {
      console.error('Send message error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message",
      });
    }
  });
  
  // Handle sending messages
  const handleSendMessage = () => {
    if (!message.trim() && !isAttaching && !isRecording) return;
    
    // For simplicity, we're just sending text messages
    // In a real app, you would handle file uploads and audio recording
    sendMessageMutation.mutate({ 
      content: message.trim(),
      mediaType: null,
      mediaUrl: null 
    });
  };
  
  // Helper function to scroll to bottom of chat
  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Group messages by date
  const groupedMessages: { [date: string]: Message[] } = {};
  
  if (messages) {
    messages.forEach(message => {
      const date = format(new Date(message.timestamp), 'yyyy-MM-dd');
      if (!groupedMessages[date]) {
        groupedMessages[date] = [];
      }
      groupedMessages[date].push(message);
    });
  }
  
  return (
    <div className={`flex-1 flex flex-col h-full bg-neutral-medium ${className}`}>
      {/* Chat Header */}
      <div className="bg-white p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="lg:hidden mr-2" onClick={onToggleSidebar}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </Button>
          {conversationData?.customer ? (
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary-light text-white flex items-center justify-center font-semibold text-lg">
                {conversationData.customer.name 
                  ? conversationData.customer.name.charAt(0).toUpperCase()
                  : "C"}
              </div>
              <div className="ml-3">
                <h2 className="font-semibold">
                  {conversationData.customer.name || `Customer ${conversationData.customer.phoneNumber}`}
                </h2>
                <div className="flex items-center text-xs text-text-secondary">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                  <span>Online</span>
                  <span className="mx-1">•</span>
                  <span>
                    Customer since {format(new Date(conversationData.customer.customerSince), 'MMM yyyy')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-10 flex items-center">
              {isLoadingConversation ? (
                <div className="animate-pulse flex space-x-4">
                  <div className="rounded-full bg-neutral-200 h-10 w-10"></div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-2 bg-neutral-200 rounded w-24"></div>
                    <div className="h-2 bg-neutral-200 rounded w-36"></div>
                  </div>
                </div>
              ) : (
                <span className="text-text-secondary">Select a conversation</span>
              )}
            </div>
          )}
        </div>
        {conversationData && (
          <div className="flex items-center">
            <Button variant="ghost" size="icon" title="Search in conversation">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" title="Show ticket info" className="lg:hidden" onClick={onToggleTicket}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" title="More options">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </Button>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div 
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-4 scrollbar-thin"
      >
        {isLoadingMessages ? (
          <div className="flex flex-col space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className={`flex mb-4 ${i % 2 === 0 ? '' : 'justify-end'}`}>
                <div className={`bg-white p-3 rounded-lg shadow-sm max-w-xs md:max-w-md animate-pulse h-12 ${i % 2 === 0 ? 'mr-auto' : 'ml-auto'}`}></div>
              </div>
            ))}
          </div>
        ) : messages && messages.length > 0 ? (
          // Display messages grouped by date
          Object.entries(groupedMessages).map(([date, dateMessages], index) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex justify-center my-4">
                <span className="bg-neutral-light px-4 py-1 rounded-full text-xs text-text-secondary">
                  {format(new Date(date), 'MMMM d, yyyy')}
                </span>
              </div>
              
              {/* Messages for this date */}
              {dateMessages.map((msg) => (
                <MessageItem 
                  key={msg.id} 
                  message={msg} 
                  isAgent={msg.senderType === 'agent'} 
                  customerName={conversationData?.customer?.name || "Customer"}
                />
              ))}
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-text-secondary">
              {conversationId ? 'No messages yet' : 'Select a conversation to start chatting'}
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      {conversationId && (
        <div className="bg-white p-4 border-t border-neutral-medium">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="text-text-secondary hover:text-primary" disabled={!conversationId}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </Button>
            <div className="flex-1 mx-2">
              <Input
                type="text"
                placeholder="Type a message"
                className="w-full border border-neutral-medium rounded-full py-2 px-4 focus:outline-none focus:border-primary"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={!conversationId || sendMessageMutation.isPending}
              />
            </div>
            <div className="flex">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-text-secondary hover:text-primary mr-1" 
                disabled={!conversationId || sendMessageMutation.isPending}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </Button>
              <Button 
                className="p-2 rounded-full bg-primary text-white flex items-center justify-center"
                onClick={handleSendMessage}
                disabled={!message.trim() || !conversationId || sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
