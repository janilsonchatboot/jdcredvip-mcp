import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ConversationWithCustomer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";

type ConversationSidebarProps = {
  selectedConversation?: number;
  onSelectConversation: (id: number) => void;
  className?: string;
};

export default function ConversationSidebar({
  selectedConversation,
  onSelectConversation,
  className = "",
}: ConversationSidebarProps) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const queryClient = useQueryClient();
  
  // Socket connection
  const { isConnected } = useSocket({
    onNewMessage: (message) => {
      console.log('New message received:', message);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conversations/${message.conversationId}/messages`] 
      });
    },
    onNewConversation: (data) => {
      console.log('New conversation received:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onConversationUpdated: (data) => {
      console.log('Conversation updated:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onMessageStatus: (update) => {
      console.log('Message status update:', update);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    }
  });
  
  const { data: conversations, isLoading, error } = useQuery<ConversationWithCustomer[]>({
    queryKey: ['/api/conversations'],
  });
  
  if (error) {
    return (
      <div className="p-4 text-red-500">
        Failed to load conversations. Please try again.
      </div>
    );
  }
  
  const filteredConversations = conversations?.filter(conversation => {
    // Apply tab filter
    if (filter === "unread" && conversation.unreadCount === 0) {
      return false;
    }
    
    if (filter === "assigned") {
      // This would require additional data - for now, let's assume we can see if a conversation is assigned
      // In a real app, we would fetch ticket data to determine this
      return true;
    }
    
    // Apply search filter
    if (searchQuery && !conversation.customer.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  return (
    <div className={`w-full lg:w-80 bg-white border-r border-neutral-medium flex flex-col h-full ${className}`}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-neutral-medium flex items-center justify-between">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-8 w-8 fill-primary">
            <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
          </svg>
          <div className="ml-2">
            <h1 className="font-semibold text-lg">JDTalk</h1>
            <div className="flex items-center text-xs">
              <div className={`w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-text-secondary">{isConnected ? 'Conectado' : 'Desconectado'}</span>
            </div>
          </div>
        </div>
        <div className="flex">
          <Button variant="ghost" size="icon" title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search or start new chat"
            className="w-full bg-neutral-light rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue="all" className="w-full" value={filter} onValueChange={setFilter}>
        <TabsList className="w-full flex border-b border-neutral-medium rounded-none bg-transparent">
          <TabsTrigger 
            value="all" 
            className="flex-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none"
          >
            All
          </TabsTrigger>
          <TabsTrigger 
            value="unread" 
            className="flex-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none"
          >
            Unread
          </TabsTrigger>
          <TabsTrigger 
            value="assigned" 
            className="flex-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary rounded-none"
          >
            Assigned
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Conversation List */}
      <div className="overflow-y-auto scrollbar-thin flex-1">
        {isLoading ? (
          // Loading skeleton
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex px-4 py-3 border-b border-neutral-medium">
              <Skeleton className="w-12 h-12 rounded-full mr-3" />
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            </div>
          ))
        ) : filteredConversations && filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => {
            const isActive = selectedConversation === conversation.id;
            const isOnline = true; // In a real app, you would get this from the WebSocket status
            
            return (
              <div 
                key={conversation.id}
                className={`flex px-4 py-3 border-b border-neutral-medium hover:bg-neutral-light cursor-pointer ${isActive ? 'bg-neutral-light' : ''}`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="relative mr-3">
                  {conversation.customer.name ? (
                    <div className="w-12 h-12 rounded-full bg-primary-light text-white flex items-center justify-center font-semibold text-lg">
                      {conversation.customer.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-light text-white flex items-center justify-center font-semibold text-lg">
                      C
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 ${isOnline ? 'bg-green-500' : 'bg-gray-300'} w-3 h-3 rounded-full border-2 border-white`}></div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-text-primary">
                      {conversation.customer.name || `Customer ${conversation.customer.phoneNumber}`}
                    </h3>
                    <span className="text-xs text-text-secondary">
                      {conversation.lastMessageAt 
                        ? formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false })
                        : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-text-secondary truncate w-44">
                      {conversation.lastMessage?.content || 
                       (conversation.lastMessage?.mediaType ? `[${conversation.lastMessage.mediaType}]` : '...')}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <div className="rounded-full bg-primary-light text-white w-5 h-5 flex items-center justify-center text-xs">
                        {conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-text-secondary">
            No conversations found
          </div>
        )}
      </div>
    </div>
  );
}
