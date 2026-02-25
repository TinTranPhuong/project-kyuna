import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, User, Bot } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string; // Mapping created_at from ticket to local prop
    tokens_used?: number;
  };
  isStreaming?: boolean;
}

export const ChatMessage = ({ message, isStreaming }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "flex w-full mb-6 group animate-in fade-in slide-in-from-bottom-2",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex max-w-[85%] md:max-w-[75%] gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 shadow-md",
          isUser ? "bg-primary-500" : "bg-surface-800 border border-white/10"
        )}>
          {isUser ? <User size={16} className="text-white" /> : <Bot size={18} className="text-primary-400" />}
        </div>

        {/* Content Bubble */}
        <div className="flex flex-col space-y-1">
          <div className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
            isUser 
              ? "bg-primary-600 text-white rounded-tr-none shadow-lg shadow-primary-900/20" 
              : "glass-card border border-white/10 text-white/90 rounded-tl-none"
          )}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    
                    if (!inline && match) {
                      return (
                        <div className="relative my-4 rounded-lg overflow-hidden border border-white/10 group/code">
                          <div className="flex items-center justify-between px-4 py-1.5 bg-white/5 border-b border-white/5">
                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                              {match[1]}
                            </span>
                            <button
                              onClick={() => handleCopy(codeString)}
                              className="text-white/40 hover:text-white transition-colors"
                            >
                              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            </button>
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '13px' }}
                            {...props}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }
                    return (
                      <code className="bg-white/10 px-1.5 py-0.5 rounded text-primary-300 font-mono text-xs" {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {`${message.content}${isStreaming ? '▍' : ''}`}
              </ReactMarkdown>
            )}
          </div>

          {/* Metadata Footer */}
          <div className={cn(
            "flex items-center gap-3 px-1 transition-opacity opacity-0 group-hover:opacity-100",
            isUser ? "flex-row-reverse" : "flex-row"
          )}>
            <span className="text-[10px] text-white/30 font-medium">
              {timeAgo(message.timestamp)}
            </span>
            {!isUser && message.tokens_used && (
              <span className="text-[10px] text-primary-500/50 font-mono">
                {message.tokens_used} tokens
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;