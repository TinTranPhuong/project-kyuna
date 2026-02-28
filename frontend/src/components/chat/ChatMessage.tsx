import { useState, memo } from 'react';
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
    timestamp: string; 
    tokens_used?: number | null;
  };
  isStreaming?: boolean;
}

export const ChatMessage = memo(({ message, isStreaming }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "flex w-full mb-8 group animate-in fade-in slide-in-from-bottom-2", // Increased bottom margin between messages
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex max-w-[90%] md:max-w-[80%] gap-4", // Slightly wider bubbles for better reading, more gap
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        
        {/* Avatar */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 shadow-md",
          isUser ? "bg-primary-500/80 backdrop-blur-md" : "bg-black/40 backdrop-blur-md border border-white/10"
        )}>
          {isUser ? <User size={16} className="text-white" /> : <Bot size={18} className="text-primary-400" />}
        </div>

        {/* Content Bubble */}
        <div className="flex flex-col space-y-2 min-w-0">
          <div className={cn(
            "p-4 md:p-5 rounded-2xl text-[15px] leading-relaxed shadow-xl", // Increased padding (p-5), slightly larger text
            isUser 
              ? "bg-primary-600/80 backdrop-blur-md text-white rounded-tr-none shadow-primary-900/20" 
              : "bg-black/40 backdrop-blur-md border border-white/10 text-white/90 rounded-tl-none"
          )}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // --- TYPOGRAPHY SPACING RULES ---
                  p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed text-white/85">{children}</p>,
                  ul: ({ children }) => <ul className="mb-4 pl-6 space-y-2 list-disc marker:text-white/30">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-4 pl-6 space-y-2 list-decimal marker:text-white/30">{children}</ol>,
                  li: ({ children }) => <li className="pl-1 text-white/85">{children}</li>,
                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-white">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 text-white">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-semibold mb-3 mt-4 text-white">{children}</h3>,
                  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-primary-500/50 pl-4 py-2 my-4 bg-black/20 rounded-r-lg italic text-white/70">{children}</blockquote>,
                  
                  // --- CODE BLOCKS ---
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    
                    if (!inline && match) {
                      return (
                        <div className="relative my-6 rounded-lg overflow-hidden border border-white/10 group/code">
                          <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-white/5 backdrop-blur-md">
                            <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
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
                            customStyle={{ margin: 0, padding: '1rem', background: 'rgba(0,0,0,0.4)', fontSize: '13px' }}
                            {...props}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }
                    return (
                      <code className="bg-white/10 px-1.5 py-0.5 rounded text-primary-300 font-mono text-[13px]" {...props}>
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
}, (prevProps, nextProps) => {
  return (
    prevProps.message.content === nextProps.message.content &&
    prevProps.isStreaming === nextProps.isStreaming
  );
});

export default ChatMessage;