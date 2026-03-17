import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, CheckCircle2, Circle, Code2 } from 'lucide-react';
import { useCodeWorkspaceStore } from '@/store/codeWorkspaceStore';
import { sendCodingMessageStream, saveChatHistory, getChatHistory, getSession } from '@/services/code-workspace.service';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

// Agent display names and colors
const AGENT_META: Record<string, { label: string; color: string }> = {
  'reflector (pre-flight)': { label: 'Reflector (Pre-flight)', color: 'text-yellow-400' },
  'orchestrator': { label: 'Orchestrator', color: 'text-blue-400' },
  'analysis': { label: 'Analysis', color: 'text-cyan-400' },
  'backend_dev': { label: 'Backend Dev', color: 'text-green-400' },
  'frontend_dev': { label: 'Frontend Dev', color: 'text-purple-400' },
  'frontend_design': { label: 'Frontend Design', color: 'text-pink-400' },
  'tester': { label: 'Tester', color: 'text-amber-400' },
  'code_reviewer': { label: 'Code Reviewer', color: 'text-red-400' },
  'synthesizer': { label: 'Synthesizer', color: 'text-emerald-400' },
};

const getAgentMeta = (name: string) => {
  // Handle dynamic names like "reflector (step 2)"
  if (name.startsWith('reflector')) return { label: name.charAt(0).toUpperCase() + name.slice(1), color: 'text-yellow-400' };
  return AGENT_META[name] || { label: name, color: 'text-white/60' };
};

interface WorkspaceChatProps {
  sessionId: string;
}

export const WorkspaceChat = ({ sessionId }: WorkspaceChatProps) => {
  const [input, setInput] = useState('');
  const [chatLoaded, setChatLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const {
    messages, isAgentRunning, currentStreamContent, agentEvents,
    activeFile, addMessage, setAgentRunning, setStreamContent,
    appendStreamContent, addAgentEvent, clearAgentEvents, applyFilePatch,
    setMessages, setFileTree,
  } = useCodeWorkspaceStore();

  // Load saved chat history on mount
  useEffect(() => {
    if (!sessionId || chatLoaded) return;
    const load = async () => {
      try {
        const history = await getChatHistory(sessionId);
        if (history.length > 0) {
          setMessages(history as Array<{ role: 'user' | 'assistant'; content: string }>);
        }
      } catch (err) {
        console.error('Failed to load chat history', err);
      } finally {
        setChatLoaded(true);
      }
    };
    load();
  }, [sessionId]);

  // Save chat history whenever messages change (debounced)
  useEffect(() => {
    if (!sessionId || !chatLoaded || messages.length === 0) return;
    const timer = setTimeout(() => {
      saveChatHistory(sessionId, messages).catch(err =>
        console.error('Failed to save chat history', err)
      );
    }, 1000); // 1s debounce
    return () => clearTimeout(timer);
  }, [messages, sessionId, chatLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamContent, agentEvents]);

  const handleSend = async () => {
    if (!input.trim() || isAgentRunning) return;
    const msg = input.trim();
    setInput('');
    addMessage({ role: 'user', content: msg });
    setAgentRunning(true);
    setStreamContent('');
    clearAgentEvents();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const event of sendCodingMessageStream(sessionId, msg, activeFile, controller.signal)) {
        if (!event || !event.event) continue;

        addAgentEvent(event);

        switch (event.event) {
          case 'token':
            appendStreamContent(event.content || '');
            break;
          case 'file_patch':
            if (event.file && event.content !== undefined) {
              applyFilePatch(event.file, event.content);
              // Update file tree to reflect change
              const currentTree = useCodeWorkspaceStore.getState().fileTree;
              setFileTree({
                ...currentTree,
                [event.file]: {
                  size: event.content.length,
                  lang: currentTree[event.file]?.lang || 'plaintext'
                }
              });
              // Auto-open the modified file in the editor so the user sees the changes
              useCodeWorkspaceStore.getState().openFile(event.file);
            }
            break;
          case 'file_created':
            if (event.file) {
              // Add to file tree
              const tree = { ...useCodeWorkspaceStore.getState().fileTree };
              const ext = event.file.split('.').pop() || '';
              tree[event.file] = {
                size: (event.content || '').length,
                lang: ext === 'py' ? 'python' : ext === 'js' ? 'javascript' : ext === 'ts' ? 'typescript' : ext === 'tsx' ? 'typescript' : ext === 'jsx' ? 'javascript' : ext === 'css' ? 'css' : ext === 'html' ? 'html' : ext === 'json' ? 'json' : 'plaintext'
              };
              setFileTree(tree);
              if (event.content !== undefined) {
                applyFilePatch(event.file, event.content);
              }
              // Auto-open the newly created file in the editor
              useCodeWorkspaceStore.getState().openFile(event.file);
            }
            break;
          case 'file_deleted':
            if (event.file) {
              const tree = { ...useCodeWorkspaceStore.getState().fileTree };
              delete tree[event.file];
              setFileTree(tree);
            }
            break;
          case 'agent_done':
            // Refresh the full session from server to get accurate file tree
            try {
              const refreshed = await getSession(sessionId);
              setFileTree(refreshed.file_tree);
            } catch { /* ignore refresh failure */ }
            break;
          case 'error':
            addMessage({ role: 'assistant', content: `⚠️ Error: ${event.message}` });
            break;
        }
      }

      // Save streamed content as a message
      const finalContent = useCodeWorkspaceStore.getState().currentStreamContent;
      if (finalContent) {
        addMessage({ role: 'assistant', content: finalContent });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        addMessage({ role: 'assistant', content: `⚠️ Error: ${err.message}` });
      }
    } finally {
      setAgentRunning(false);
      setStreamContent('');
    }
  };

  // Derive active agents for progress display
  const activeAgents = new Set<string>();
  const doneAgents = new Set<string>();
  agentEvents.forEach(e => {
    if (e.event === 'agent_start' && e.agent) activeAgents.add(e.agent);
    if (e.event === 'agent_end' && e.agent) {
      activeAgents.delete(e.agent);
      doneAgents.add(e.agent);
    }
  });

  return (
    <div className="flex flex-col h-full bg-black/40">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <Code2 size={16} className="text-emerald-400" />
        <span className="text-sm font-semibold text-white">Coding Chat</span>
        {messages.length > 0 && (
          <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full ml-auto">
            {messages.length} msgs
          </span>
        )}
      </div>

      {/* Messages + Agent Progress */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn("max-w-[90%]", msg.role === 'user' ? "ml-auto" : "mr-auto")}>
            <div className={cn(
              "rounded-xl px-3 py-2 text-sm",
              msg.role === 'user'
                ? "bg-emerald-600/30 text-white border border-emerald-500/20"
                : "bg-white/5 text-white/90 border border-white/5"
            )}>
              <ReactMarkdown className="prose prose-invert prose-sm max-w-none [&_p]:mb-1 [&_p:last-child]:mb-0 [&_pre]:bg-black/30 [&_pre]:rounded-lg [&_pre]:p-2 [&_code]:text-emerald-300 [&_pre]:overflow-x-auto [&_pre]:max-w-full overflow-hidden">
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {/* Agent progress */}
        {isAgentRunning && agentEvents.length > 0 && (
          <div className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-1.5">
            {Array.from(new Set([...doneAgents, ...activeAgents])).map(agent => {
              const isDone = doneAgents.has(agent);
              const isActive = activeAgents.has(agent);
              const meta = getAgentMeta(agent);
              return (
                <div key={agent} className="flex items-center gap-2 text-xs">
                  {isDone ? (
                    <CheckCircle2 size={12} className="text-emerald-400" />
                  ) : isActive ? (
                    <Loader2 size={12} className="text-amber-400 animate-spin" />
                  ) : (
                    <Circle size={12} className="text-white/20" />
                  )}
                  <span className={cn("font-medium", meta.color)}>{meta.label}</span>
                  {isDone && <span className="text-white/30">— done</span>}
                  {isActive && <span className="text-amber-400/70 animate-pulse">running...</span>}
                </div>
              );
            })}

            {/* Tool events */}
            {agentEvents.filter(e => e.event === 'tool_result').slice(-3).map((e, i) => (
              <div key={`tool-${i}`} className="text-[10px] text-white/30 pl-5 truncate">
                📁 {e.tool}: {e.result?.slice(0, 80)}
              </div>
            ))}
          </div>
        )}

        {/* Streaming content */}
        {currentStreamContent && (
          <div className="mr-auto max-w-[90%] bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-sm text-white/90 overflow-hidden">
            <ReactMarkdown className="prose prose-invert prose-sm max-w-none [&_pre]:bg-black/30 [&_pre]:rounded-lg [&_pre]:p-2 [&_code]:text-emerald-300 [&_pre]:overflow-x-auto [&_pre]:max-w-full">
              {currentStreamContent}
            </ReactMarkdown>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-white/10">
        <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-xl px-3 py-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask Kyuna to code something..."
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30"
            disabled={isAgentRunning}
          />
          <button
            onClick={handleSend}
            disabled={isAgentRunning || !input.trim()}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isAgentRunning ? "text-white/20" : "text-emerald-400 hover:bg-emerald-500/20"
            )}
          >
            {isAgentRunning ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceChat;
