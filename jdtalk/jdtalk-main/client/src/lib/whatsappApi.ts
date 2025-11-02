import { apiRequest } from "@/lib/queryClient";

export interface SendMessageParams {
  content?: string;
  mediaType?: "image" | "audio" | "file" | null;
  mediaUrl?: string | null;
}

/**
 * WhatsApp API service for interacting with the WhatsApp Business API
 * This is a client-side wrapper around our server's API
 */
export const whatsappApi = {
  /**
   * Send a message to a customer via WhatsApp
   */
  sendMessage: async (conversationId: number, params: SendMessageParams) => {
    return apiRequest("POST", `/api/conversations/${conversationId}/messages`, params);
  },

  /**
   * Simulate receiving a new message (for development/testing purposes)
   */
  simulateIncomingMessage: async (customerId: number, params: SendMessageParams) => {
    return apiRequest("POST", `/api/simulate/incoming-message`, {
      customerId,
      message: params.content,
      mediaType: params.mediaType,
      mediaUrl: params.mediaUrl
    });
  },

  /**
   * Upload a file to be sent via WhatsApp
   * In a real implementation, this would handle file uploads
   */
  uploadMedia: async (file: File): Promise<string> => {
    // In a real implementation, this would upload the file to a server
    // and return a URL to the uploaded file
    
    // For now, we'll simulate a successful upload by returning a placeholder URL
    const fileType = file.type.split('/')[0];
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock URL based on file type
    if (fileType === 'image') {
      return 'https://images.unsplash.com/photo-1621570071349-aa0668fb4572';
    } else if (fileType === 'audio') {
      return 'sample-audio-url';
    } else {
      return 'sample-file-url';
    }
  }
};
