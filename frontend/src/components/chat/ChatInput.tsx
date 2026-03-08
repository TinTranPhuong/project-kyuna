import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Plus, X } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';

export const ChatInput = () => {
  const [content, setContent] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { sendMessage, isStreaming, stopGeneration } = useChatStore();

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

  const handleImage = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageBase64(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleImage(file);
          break;
        }
      }
    }
  };

  const handleSubmit = async () => {
    if ((!content.trim() && !imageBase64) || isStreaming || content.length > CHAR_LIMIT) return;
    const messageToSend = content.trim();
    const imageToSend = imageBase64;
    setContent('');
    setImageBase64(null);
    try { await sendMessage(messageToSend, imageToSend || undefined); }
    catch (error) {
      setContent(messageToSend);
      setImageBase64(imageToSend);
    }
  };

  const handleStop = () => {
    if (stopGeneration) {
      stopGeneration();
    }
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

      {/* Glassy input background */}
      <div className={cn(
        "relative flex flex-col p-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 transition-all duration-200 shadow-xl",
        "ml-10 md:ml-[52px]",
        isOverLimit ? "border-red-500/50" : isNearLimit ? "focus-within:border-amber-400" : "focus-within:border-primary-500/50 focus-within:ring-1 focus-within:ring-primary-500/20"
      )}>
        {/* Image Preview Area */}
        {imageBase64 && (
          <div className="relative mb-2 ml-2 mt-2 self-start w-24 h-24 rounded-lg overflow-hidden border border-white/20 group">
            <img src={imageBase64} alt="Upload preview" className="w-full h-full object-cover" />
            <button
              onClick={() => setImageBase64(null)}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImage(file);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            className="mb-1 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Upload image"
          >
            <Plus size={20} />
          </button>
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isStreaming ? "Kyuna is thinking..." : "Ask Kyuna anything"}
            disabled={isStreaming}
            className="flex-1 bg-transparent border-none outline-none text-white text-sm py-2 px-3 resize-none custom-scrollbar placeholder:text-white/40 disabled:cursor-not-allowed"
          />

          <button
            onClick={isStreaming ? handleStop : handleSubmit}
            // Enable button if content is ready OR if we are streaming (so we can stop)
            disabled={((!content.trim() && !imageBase64) && !isStreaming) || isOverLimit}
            className={cn(
              "mb-1 p-2 rounded-xl transition-all flex items-center justify-center shrink-0",
              ((content.trim() || imageBase64) || isStreaming) && !isOverLimit
                ? "bg-primary-600 text-white shadow-lg hover:bg-primary-500 active:scale-95"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            )}
            aria-label={isStreaming ? "Stop generation" : "Send message"}
          >
            {isStreaming ? (
              <Square size={14} className="fill-white animate-pulse" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;