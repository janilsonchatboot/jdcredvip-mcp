import { format } from "date-fns";
import { Message } from "@shared/schema";
import AudioPlayer from "@/components/AudioPlayer";
import FilePreview from "@/components/FilePreview";

type MessageItemProps = {
  message: Message;
  isAgent: boolean;
  customerName: string;
};

export default function MessageItem({ message, isAgent, customerName }: MessageItemProps) {
  // Format the message timestamp
  const formattedTime = format(new Date(message.timestamp), "h:mm a");
  
  return (
    <div className={`flex mb-4 ${isAgent ? 'justify-end' : ''}`}>
      {!isAgent && (
        <div className="w-8 h-8 rounded-full bg-primary-light text-white flex items-center justify-center font-semibold text-sm mr-2 self-end">
          {customerName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className={isAgent ? 'text-right' : ''}>
        <div className={`${isAgent ? 'bg-primary text-white' : 'bg-white'} p-3 rounded-lg ${isAgent ? 'message-bubble-sent' : 'message-bubble-received'} shadow-sm max-w-xs md:max-w-md`}>
          {/* Render different content based on the media type */}
          {message.content && (
            <p className="break-words">{message.content}</p>
          )}
          
          {message.mediaType === 'image' && (
            <div>
              {message.content && <p className="mb-2">{message.content}</p>}
              <img
                src={message.mediaUrl || ""}
                alt="Sent image"
                className="w-full h-auto rounded cursor-pointer"
                onClick={() => window.open(message.mediaUrl, '_blank')}
              />
            </div>
          )}
          
          {message.mediaType === 'audio' && (
            <div>
              {message.content && <p className="mb-2">{message.content}</p>}
              <AudioPlayer url={message.mediaUrl || ""} />
            </div>
          )}
          
          {message.mediaType === 'file' && (
            <div>
              {message.content && <p className="mb-2">{message.content}</p>}
              <FilePreview url={message.mediaUrl || ""} />
            </div>
          )}
        </div>
        
        <div className={`flex items-center ${isAgent ? 'justify-end' : ''} mt-1`}>
          <span className={`text-xs text-text-secondary ${isAgent ? 'mr-1' : 'ml-2'}`}>{formattedTime}</span>
          
          {/* Show message status for sent messages */}
          {isAgent && (
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${
              message.status === 'sent' ? 'text-gray-400' : 
              message.status === 'delivered' ? 'text-blue-500' : 
              'text-primary-light'
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
