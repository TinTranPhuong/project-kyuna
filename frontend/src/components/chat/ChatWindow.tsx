import { useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';

export const ChatWindow = () => {
  const { 
    messages, 
    activeConversationId,
    isStreaming, 
    currentStreamContent 
  } = useChatStore();
  
  // 1. Get the array of messages for the currently active conversation
  // Fallback to an empty array if no conversation is active or it has no messages yet
  const currentMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll logic: 
   * Triggers whenever the message count changes OR 
   * when live stream content is being updated.
   */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [currentMessages.length, currentStreamContent]);

  // Empty State: No messages yet
  if (currentMessages.length === 0 && !currentStreamContent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white/20 p-8 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
          <Bot size={32} />
        </div>
        <h3 className="text-lg font-semibold text-white/40">Start a conversation...</h3>
        <p className="text-sm max-w-[200px] mt-2">
          Ask me anything or use an agent to help you with your tasks.
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4 custom-scrollbar"
    >
      {/* 1. Render historic messages for the active conversation */}
      {currentMessages.map((msg) => (
        <ChatMessage 
          key={msg.id} 
          message={{
          ...msg,
          // 1. Fallback for the missing timestamp
          timestamp: (msg as any).timestamp || new Date().toISOString(),
      
          // 2. Convert null to undefined for tokens_used
          tokens_used: msg.tokens_used ?? undefined 
          }} 
        />
      ))}

      {/* 2. Render live streaming message (if currently generating) */}
      {currentStreamContent && (
        <ChatMessage 
          message={{
            id: 'streaming-msg',
            role: 'assistant',
            content: currentStreamContent,
            timestamp: new Date().toISOString()
          }} 
        />
      )}

      {/* 3. Show Typing Indicator if waiting for initial response chunks */}
      {isStreaming && !currentStreamContent && (
        <div className="flex justify-start">
          <TypingIndicator />
        </div>
      )}
    </div>
  );
};

export default ChatWindow;