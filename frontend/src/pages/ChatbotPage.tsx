import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Plus, X } from 'lucide-react';

// Store
import { useChatStore } from '@/store/chatStore';

// Components (Will show errors until implemented)
import ChatWindow from '@/components/chat/ChatWindow';
import ChatInput from '@/components/chat/ChatInput';
import ConversationList from '@/components/chat/ConversationList';
import ModelSelector from '@/components/chat/ModelSelector';
import ToolsPanel from '@/components/chat/ToolsPanel';

export default function ChatbotPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Mobile sidebar state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Store actions
  const loadConversations = useChatStore((state) => state.loadConversations);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const createConversation = useChatStore((state) => state.createConversation);

  // 1. On mount: load all conversations
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 2. On URL change: select specific conversation and load messages
  useEffect(() => {
    if (id) {
      selectConversation(id);
    }
  }, [id, selectConversation]);

  // Handle New Chat creation and clear the window
  const handleNewChat = () => {
    createConversation();
    navigate('/chat'); // Removes the /:id from the URL
    setIsMobileOpen(false); // Auto-close overlay on mobile
  };

  return (
    // Subtracting header height if you have a top nav, otherwise use h-screen
    <div className="flex flex-row h-full w-full overflow-hidden relative bg-surface-900">
      
      {/* Left Column (65% on desktop, 100% on mobile) */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Mobile Header for Sidebar Toggle */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <h2 className="text-white font-display font-medium">Chat</h2>
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="p-2 glass-btn rounded-md"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Chat Messages Area (Scrollable flex-1) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          <ChatWindow />
        </div>

        {/* Pinned Chat Input */}
        <div className="p-4 md:p-6 border-t border-white/10 bg-surface-900/80 backdrop-blur-lg shrink-0">
          <ChatInput />
        </div>
      </div>

      {/* Right Column (35% fixed width on desktop) */}
      <div className="hidden md:flex flex-col w-[35%] max-w-sm border-l border-white/10 bg-white/5 backdrop-blur-md h-full shrink-0">
        {/* New Chat Button */}
        <div className="p-4 border-b border-white/10 shrink-0">
          <button 
            onClick={handleNewChat}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        {/* Conversation List (Top 40% of remaining space) */}
        <div className="h-[40%] overflow-y-auto border-b border-white/10 p-4">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Recent</h3>
          <ConversationList />
        </div>

        {/* Model Selector & Tools (Bottom 60%) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Active Agent</h3>
            <ModelSelector />
          </section>
          
          <section>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Tools & Settings</h3>
            <ToolsPanel />
          </section>
        </div>
      </div>

      {/* Mobile Overlay Sidebar (< 768px) */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="absolute inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-4/5 max-w-sm bg-surface-800 z-50 flex flex-col md:hidden shadow-2xl border-l border-white/10"
            >
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <button 
                  onClick={handleNewChat}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 mr-4"
                >
                  <Plus className="w-4 h-4" /> New Chat
                </button>
                <button onClick={() => setIsMobileOpen(false)} className="p-2 text-white/70 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="h-[40%] overflow-y-auto border-b border-white/10 p-4">
                <ConversationList />
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <ModelSelector />
                <ToolsPanel />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}