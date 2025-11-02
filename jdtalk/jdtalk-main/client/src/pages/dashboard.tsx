import { useState, useEffect } from "react";
import ConversationSidebar from "@/components/ConversationSidebar";
import ChatArea from "@/components/ChatArea";
import TicketSidebar from "@/components/TicketSidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import AppLayout from "@/components/AppLayout";

export default function DashboardPage() {
  const [selectedConversation, setSelectedConversation] = useState<number | undefined>(undefined);
  const [showConversationSidebar, setShowConversationSidebar] = useState(true);
  const [showTicketSidebar, setShowTicketSidebar] = useState(true);
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  
  // On mobile, only show the conversation sidebar by default
  useEffect(() => {
    if (isMobile) {
      setShowConversationSidebar(true);
      setShowTicketSidebar(false);
    } else {
      setShowConversationSidebar(true);
      setShowTicketSidebar(true);
    }
  }, [isMobile]);
  
  // When a conversation is selected on mobile, show the chat area
  useEffect(() => {
    if (isMobile && selectedConversation) {
      setShowConversationSidebar(false);
    }
  }, [selectedConversation, isMobile]);
  
  const handleSelectConversation = (id: number) => {
    setSelectedConversation(id);
  };
  
  const toggleConversationSidebar = () => {
    if (isMobile) {
      setShowConversationSidebar(true);
      setShowTicketSidebar(false);
    } else {
      setShowConversationSidebar(!showConversationSidebar);
    }
  };
  
  const toggleTicketSidebar = () => {
    if (isMobile) {
      setShowTicketSidebar(true);
      setShowConversationSidebar(false);
    } else {
      setShowTicketSidebar(!showTicketSidebar);
    }
  };
  
  const content = (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Conversation Sidebar */}
      <ConversationSidebar
        selectedConversation={selectedConversation}
        onSelectConversation={handleSelectConversation}
        className={isMobile ? (showConversationSidebar ? '' : 'hidden') : (showConversationSidebar ? '' : 'hidden')}
      />

      {/* Chat Area */}
      <ChatArea
        conversationId={selectedConversation}
        onToggleSidebar={toggleConversationSidebar}
        onToggleTicket={toggleTicketSidebar}
        className={isMobile ? ((!showConversationSidebar && !showTicketSidebar) ? '' : 'hidden') : ''}
      />

      {/* Ticket Sidebar */}
      <TicketSidebar
        conversationId={selectedConversation}
        className={isMobile ? (showTicketSidebar ? '' : 'hidden') : (showTicketSidebar ? '' : 'hidden')}
      />
    </div>
  );

  return (
    <AppLayout title="Dashboard">
      {content}
    </AppLayout>
  );
}
