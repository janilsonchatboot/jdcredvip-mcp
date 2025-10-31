import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import ConversationSidebar from "@/components/ConversationSidebar";
import ChatArea from "@/components/ChatArea";
import TicketPanel from "@/components/TicketPanel";

export default function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<number | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ticketPanelOpen, setTicketPanelOpen] = useState(false);
  
  // Handle sidebar toggle for mobile
  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Handle ticket panel toggle 
  const handleToggleTicketPanel = () => {
    setTicketPanelOpen(!ticketPanelOpen);
  };
  
  // Handle conversation selection
  const handleSelectConversation = (id: number) => {
    setSelectedConversation(id);
    // On mobile, close the sidebar when a conversation is selected
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };
  
  return (
    <AppLayout title="Conversas | JDTalk">
      <div className="flex h-full overflow-hidden">
        {/* Conversation Sidebar */}
        <div className={`h-full ${sidebarOpen ? 'w-80 md:w-96' : 'w-0'} transition-all duration-300 border-r`}>
          {sidebarOpen && (
            <ConversationSidebar 
              selectedConversation={selectedConversation} 
              onSelectConversation={handleSelectConversation} 
              className="h-full"
            />
          )}
        </div>
        
        {/* Chat Area */}
        <div className={`flex-1 h-full ${ticketPanelOpen ? 'md:pr-80' : ''}`}>
          <ChatArea 
            conversationId={selectedConversation} 
            onToggleSidebar={handleToggleSidebar}
            onToggleTicket={handleToggleTicketPanel}
            className="h-full"
          />
        </div>
        
        {/* Ticket Panel */}
        {ticketPanelOpen && (
          <div className="fixed md:relative right-0 top-0 w-80 h-full bg-white border-l shadow-lg md:shadow-none z-10">
            <TicketPanel 
              conversationId={selectedConversation}
              onClose={handleToggleTicketPanel}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}