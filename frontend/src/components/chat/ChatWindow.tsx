import { useEffect, useRef, useState, type UIEvent } from 'react';
import { Bot, ArrowDown, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/chatStore';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { cn } from '@/lib/utils';

export const ChatWindow = () => {
  const { 
    messages, 
    activeConversationId,
    isStreaming, 
    currentStreamContent,
    lastMemoryContext 
  } = useChatStore();
  
  const currentMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isAutoScrollEnabled = useRef(true);

  // --- Scroll Logic ---
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
  };

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    if (distanceFromBottom > 100) {
      setShowScrollButton(true);
      isAutoScrollEnabled.current = false;
    } else {
      setShowScrollButton(false);
      isAutoScrollEnabled.current = true;
    }
  };

  useEffect(() => {
    if (isAutoScrollEnabled.current) {
      requestAnimationFrame(() => {
        scrollToBottom(currentStreamContent ? 'auto' : 'smooth');
      });
    }
  }, [currentMessages.length, currentStreamContent]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [activeConversationId]);

  // --- Empty State ---
  if (currentMessages.length === 0 && !currentStreamContent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 h-full w-full animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-8 md:p-10 rounded-3xl flex flex-col items-center text-center max-w-md shadow-2xl">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
            <Bot size={32} className="text-white shadow-lg" /> 
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 drop-shadow-md tracking-wide">
            Start a conversation...
          </h2>
          <p className="text-white/70 leading-relaxed text-sm font-medium">
            Ask kyuna anything.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden">
      
      {/* Scrollable message container */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 custom-scrollbar"
      >
        {currentMessages.map((msg) => (
          <ChatMessage 
            key={msg.id} 
            message={{
              ...msg,
              timestamp: (msg as any).timestamp || new Date().toISOString(),
              tokens_used: msg.tokens_used ?? undefined 
            }} 
          />
        ))}

        {currentStreamContent && (
          <ChatMessage 
            message={{
              id: 'streaming-msg',
              role: 'assistant',
              content: currentStreamContent,
              timestamp: new Date().toISOString()
            }} 
            isStreaming={true}
          />
        )}

        {isStreaming && !currentStreamContent && (
          <div className="flex justify-start">
            <TypingIndicator />
          </div>
        )}
      </div>

      {/* Floating "Scroll to Bottom" Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => {
              isAutoScrollEnabled.current = true;
              scrollToBottom('smooth');
            }}
            className={cn(
              "absolute bottom-6 left-1/2 -translate-x-1/2 z-10",
              "w-10 h-10 flex items-center justify-center rounded-full",
              "bg-black/60 backdrop-blur-md border border-white/10 text-white/70",
              "shadow-xl hover:text-white hover:bg-black/80 transition-colors"
            )}
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Memory Indicator */}
      {lastMemoryContext && !isStreaming && (lastMemoryContext.memories + lastMemoryContext.chunks + lastMemoryContext.universals > 0) && (
        <div 
          title={`${lastMemoryContext.memories} memories · ${lastMemoryContext.chunks} doc chunks · ${lastMemoryContext.universals} universal facts`}
          className="absolute bottom-2 right-4 text-xs bg-black/40 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full cursor-default flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors shadow-lg z-20"
        >
          <Brain size={14} />
          <span>{lastMemoryContext.memories + lastMemoryContext.chunks + lastMemoryContext.universals} context used</span>
        </div>
      )}

    </div>
  );
};

export default ChatWindow;