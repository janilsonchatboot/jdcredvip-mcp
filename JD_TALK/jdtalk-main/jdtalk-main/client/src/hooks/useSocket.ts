import { useEffect, useRef } from "react";
import { Message, WebSocketMessage } from "@shared/schema";

type WebSocketMessageHandlers = {
  onNewMessage?: (message: Message) => void;
  onNewConversation?: (data: any) => void;
  onConversationUpdated?: (data: any) => void;
  onMessageStatus?: (update: { id: number; status: string }) => void;
  onTicketUpdate?: (ticketUpdate: any) => void;
  onLeadUpdate?: (leadUpdate: any) => void;
};

export function useSocket(handlers: WebSocketMessageHandlers) {
  const socket = useRef<WebSocket | null>(null);
  const isConnecting = useRef(false);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const handlersRef = useRef(handlers);

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const connectWebSocket = () => {
    if (socket.current?.readyState === WebSocket.OPEN || isConnecting.current) {
      return;
    }

    isConnecting.current = true;

    // Get the current protocol and host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`; // Add /ws path

    socket.current = new WebSocket(wsUrl);

    socket.current.onopen = () => {
      console.log('WebSocket connected');
      isConnecting.current = false;
      
      // Clear any reconnect timeout
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };

    socket.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        // Handle different message types
        switch (data.type) {
          case 'connection_established':
            console.log('WebSocket connection confirmed with ID:', data.payload.id);
            break;
          case 'new_message':
            if (handlersRef.current.onNewMessage) handlersRef.current.onNewMessage(data.payload);
            break;
          case 'new_conversation':
            if (handlersRef.current.onNewConversation) handlersRef.current.onNewConversation(data.payload);
            break;
          case 'conversation_updated':
            if (handlersRef.current.onConversationUpdated) handlersRef.current.onConversationUpdated(data.payload);
            break;
          case 'message_status_change':
            if (handlersRef.current.onMessageStatus) handlersRef.current.onMessageStatus(data.payload);
            break;
          case 'ticket_update':
            if (handlersRef.current.onTicketUpdate) handlersRef.current.onTicketUpdate(data.payload);
            break;
          case 'lead_update':
            if (handlersRef.current.onLeadUpdate) handlersRef.current.onLeadUpdate(data.payload);
            break;
          default:
            console.log('Unhandled WebSocket message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.current.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      isConnecting.current = false;
      
      // Attempt to reconnect after a delay
      if (!reconnectTimeout.current) {
        reconnectTimeout.current = setTimeout(() => {
          reconnectTimeout.current = null;
          connectWebSocket();
        }, 5000); // Reconnect after 5 seconds
      }
    };
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isConnected: socket.current?.readyState === WebSocket.OPEN,
  };
}
