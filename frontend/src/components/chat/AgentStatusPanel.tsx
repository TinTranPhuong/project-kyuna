import React from 'react';
import { useChatStore } from '@/store/chatStore';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, BookType, Code2, Globe, PenTool, Layers, Workflow, FastForward, CheckCircle2 } from 'lucide-react';

const agentIcons: Record<string, React.ReactNode> = {
  memory: <Layers size={14} />,
  orchestrator: <Workflow size={14} />,
  executor: <FastForward size={14} />,
  synthesizer: <BrainCircuit size={14} />,
  evaluator: <CheckCircle2 size={14} />,
  reflector: <BrainCircuit size={14} className="opacity-70" />,
  
  // Sub-agents
  analysis: <BrainCircuit size={14} className="text-blue-400" />,
  translator: <BookType size={14} className="text-green-400" />,
  coding: <Code2 size={14} className="text-purple-400" />,
  web_search: <Globe size={14} className="text-orange-400" />,
  content_writing: <PenTool size={14} className="text-pink-400" />
};

const agentNames: Record<string, string> = {
  memory: 'Memory Agent',
  orchestrator: 'Orchestrator',
  executor: 'Executor',
  synthesizer: 'Synthesizer',
  evaluator: 'Evaluator',
  reflector: 'Reflector',

  analysis: 'Analysis Agent',
  translator: 'Translator',
  coding: 'Coding Agent',
  web_search: 'Web Search',
  content_writing: 'Writer'
};

export const AgentStatusPanel: React.FC = () => {
  const { agentState } = useChatStore();
  
  if (!agentState || agentState.activeAgents.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 my-2">
      <AnimatePresence>
        {agentState.activeAgents.map(agent => (
          <motion.div
            key={agent}
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -5 }}
            className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-3 py-1.5 shadow-lg backdrop-blur-sm"
          >
            <div className="relative flex items-center justify-center w-5 h-5">
              <span className="absolute inset-0 border-2 border-primary-500/30 rounded-full animate-ping"></span>
              <span className="absolute inset-0 border-2 border-primary-500 rounded-full animate-spin border-t-transparent"></span>
              {agentIcons[agent] || <BrainCircuit size={12} />}
            </div>
            <span className="text-xs font-semibold tracking-wide text-white/90">
              {agentNames[agent] || agent}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
