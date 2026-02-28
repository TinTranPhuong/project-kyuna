import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';

export const ChatInput = () => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isStreaming } = useChatStore();

  const CHAR_WARN = 2000;
  const CHAR_LIMIT = 4000;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 160);
      textarea.style.height = `${newHeight}px`;
    }
  }, [content]);

  const handleSubmit = async () => {
    if (!content.trim() || isStreaming || content.length > CHAR_LIMIT) return;
    const messageToSend = content.trim();
    setContent(''); 
    try { await sendMessage(messageToSend); } 
    catch (error) { setContent(messageToSend); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isOverLimit = content.length > CHAR_LIMIT;
  const isNearLimit = content.length > CHAR_WARN && content.length <= CHAR_LIMIT;

  return (
    <div className="w-full relative">
        
        {content.length > 1500 && (
          <div className={cn(
            "absolute -top-8 right-2 text-[10px] font-mono px-2 py-0.5 rounded-md border backdrop-blur-md animate-in fade-in slide-in-from-bottom-1",
            isOverLimit ? "bg-red-500/20 text-red-400 border-red-500/30" : isNearLimit ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-black/40 text-white/40 border-white/10"
          )}>
            {content.length.toLocaleString()} / {CHAR_LIMIT.toLocaleString()}
          </div>
        )}

        {/* THE FIX: Glassy input background */}
        <div className={cn(
          "relative flex items-end gap-2 p-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 transition-all duration-200 shadow-xl",
          "ml-10 md:ml-[52px]",
          isOverLimit ? "border-red-500/50" : isNearLimit ? "focus-within:border-amber-400" : "focus-within:border-primary-500/50 focus-within:ring-1 focus-within:ring-primary-500/20"
        )}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "Kyuna is thinking..." : "Ask Kyuna anything..."}
            disabled={isStreaming}
            className="flex-1 bg-transparent border-none outline-none text-white text-sm py-2 px-3 resize-none custom-scrollbar placeholder:text-white/40 disabled:cursor-not-allowed"
          />

          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isStreaming || isOverLimit}
            className={cn(
              "mb-1 p-2 rounded-xl transition-all flex items-center justify-center shrink-0",
              content.trim() && !isStreaming && !isOverLimit
                ? "bg-primary-600 text-white shadow-lg hover:bg-primary-500 active:scale-95"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
      </div>
    </div>
  );
};

export default ChatInput;