import { useState, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, User, Bot, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    tokens_used?: number | null;
    image_base64?: string | null;
  };
  isStreaming?: boolean;
}

export const ChatMessage = memo(({ message, isStreaming }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);

  const { thoughtContent, mainContent, isThinking } = useMemo(() => {
    if (isUser) return { thoughtContent: null, mainContent: message.content, isThinking: false };
    const hasClosingTag = message.content.includes('</think>');

    let match;
    if (hasClosingTag) {
      const robustRegex = /(?:^|<think>)([\s\S]*?)<\/think>/;
      match = message.content.match(robustRegex);
    } else {
      const strictRegex = /<think>([\s\S]*?)$/;
      match = message.content.match(strictRegex);
    }

    if (match) {
      const thoughtContent = match[1];
      const isThinking = !hasClosingTag && !!isStreaming;

      let cleanMain = message.content.replace(match[0], '').trim();
      if (!isThinking && !cleanMain) {
        cleanMain = "";
      }

      return { thoughtContent, mainContent: cleanMain, isThinking };
    }

    return { thoughtContent: null, mainContent: message.content, isThinking: false };
  }, [message.content, isUser, isStreaming]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "flex w-full mb-8 group animate-in fade-in slide-in-from-bottom-2",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex max-w-[90%] md:max-w-[80%] gap-4",
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
            "p-4 md:p-5 rounded-2xl text-[15px] leading-relaxed shadow-xl",
            isUser
              ? "bg-primary-600/80 backdrop-blur-md text-white rounded-tr-none shadow-primary-900/20"
              : "bg-black/40 backdrop-blur-md border border-white/10 text-white/90 rounded-tl-none"
          )}>
            {isUser ? (
              <div className="flex flex-col gap-2">
                {message.image_base64 && (
                  <img
                    src={message.image_base64}
                    alt="User uploaded"
                    className="max-w-[150px] md:max-w-xs rounded-lg object-contain bg-black/20"
                  />
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ) : (
              <>
                {/* Thinking / Reasoning Dropdown */}
                {thoughtContent !== null && (
                  <div className="mb-4 rounded-lg overflow-hidden border border-white/5 bg-black/20">
                    <button
                      onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 text-xs font-medium transition-colors select-none",
                        isThinking
                          ? "text-primary-300 animate-pulse bg-primary-500/5"
                          : "text-white/50 hover:text-white/80 hover:bg-white/5"
                      )}
                    >
                      <Brain size={14} className={isThinking ? "animate-pulse" : ""} />
                      <span>
                        {isThinking ? "Thinking..." : "Thought Process"}
                      </span>
                      <div className="ml-auto opacity-70">
                        {isThinkingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </button>

                    {/* Content area: Visible if open OR if currently thinking (auto-open while streaming) */}
                    {(isThinkingOpen || isThinking) && (
                      <div className="px-3 py-3 text-xs md:text-sm text-white/60 border-t border-white/5 font-mono bg-black/10 leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-top-1">
                        {thoughtContent}
                        {isThinking && <span className="inline-block w-1.5 h-3 ml-1 align-middle bg-primary-400 animate-pulse" />}
                      </div>
                    )}
                  </div>
                )}

                {/* Main Response */}
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
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
                    a: ({ children, href }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 mt-2 mb-2 text-sm font-medium text-white bg-primary-600/80 hover:bg-primary-500 rounded-md transition-colors border border-primary-500/30 shadow-sm no-underline">
                        {children}
                      </a>
                    ),

                    // --- TABLE STYLING ---
                    table: ({ children }) => <div className="overflow-x-auto my-6 border border-white/20 rounded-lg"><table className="w-full text-sm text-left text-white/90">{children}</table></div>,
                    thead: ({ children }) => <thead className="text-xs uppercase bg-white/10 border-b border-white/20">{children}</thead>,
                    tbody: ({ children }) => <tbody className="divide-y divide-white/10">{children}</tbody>,
                    tr: ({ children }) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
                    th: ({ children }) => <th className="px-4 py-3 border-r border-white/10 last:border-r-0 font-semibold">{children}</th>,
                    td: ({ children }) => <td className="px-4 py-3 border-r border-white/10 last:border-r-0 leading-relaxed">{children}</td>,

                    // --- CODE BLOCKS ---
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');
                      const isMultiLine = codeString.includes('\n');

                      if (!inline && (match || isMultiLine)) {
                        const lang = match ? match[1] : '';
                        return (
                          <div className="relative my-6 rounded-lg overflow-hidden border border-white/10 group/code bg-black/40">
                            {lang && (
                              <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-white/5 backdrop-blur-md">
                                <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
                                  {lang}
                                </span>
                                <button
                                  onClick={() => handleCopy(codeString)}
                                  className="text-white/40 hover:text-white transition-colors"
                                >
                                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                </button>
                              </div>
                            )}
                            {!lang && (
                              <button
                                onClick={() => handleCopy(codeString)}
                                className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors z-10 opacity-0 group-hover/code:opacity-100 bg-white/10 backdrop-blur-md p-1.5 rounded-md border border-white/10"
                              >
                                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                              </button>
                            )}
                            {lang ? (
                              <SyntaxHighlighter
                                style={oneDark}
                                language={lang}
                                PreTag="div"
                                customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '13px' }}
                                codeTagProps={{ style: { background: 'transparent', padding: 0, borderRadius: 0 } }}
                                {...props}
                              >
                                {codeString}
                              </SyntaxHighlighter>
                            ) : (
                              <pre className="p-4 m-0 overflow-x-auto text-[13px] font-mono text-white/80 whitespace-pre">
                                <code className="block bg-transparent p-0 m-0 border-none" {...props}>
                                  {codeString}
                                </code>
                              </pre>
                            )}
                          </div>
                        );
                      }
                      return (
                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-primary-300 font-mono text-[13px] border-none" {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {/* Append cursor to main content only if NOT currently thinking */}
                  {`${mainContent}${isStreaming && !isThinking ? '▍' : ''}`}
                </ReactMarkdown>
              </>
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