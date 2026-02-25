import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  MoreVertical,  
  Clock 
} from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { cn, timeAgo, truncate } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const ConversationList = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { 
    conversations, 
    selectConversation, 
    createConversation, 
    deleteConversation 
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. Client-side Search Filter
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const handleCreateChat = async () => {
    const newConv = await createConversation();
    if (newConv) {
      navigate(`/chat/${newConv.id}`);
    }
  };

  const handleSelect = (id: string) => {
    selectConversation(id);
    navigate(`/chat/${id}`);
  };

  return (
    <div className="flex flex-col h-full bg-surface-950/30 border-r border-white/5 w-72 shrink-0">
      {/* Header & New Chat Action */}
      <div className="p-4 space-y-4">
        <button
          onClick={handleCreateChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-primary-900/20"
        >
          <Plus size={18} />
          <span>New Chat</span>
        </button>

        {/* Search Bar */}
        <div className="relative group">
          <Search 
            size={16} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary-400 transition-colors" 
          />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-primary-500/50 transition-all"
          />
        </div>
      </div>

      {/* Conversation Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {filteredConversations.map((conv) => (
              <motion.div
                key={conv.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative group"
              >
                <button
                  onClick={() => handleSelect(conv.id)}
                  className={cn(
                    "w-full flex flex-col items-start gap-1 p-3 rounded-xl transition-all text-left",
                    conversationId === conv.id
                      ? "bg-white/10 shadow-inner"
                      : "hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className={cn(
                      "text-sm font-medium truncate flex-1",
                      conversationId === conv.id ? "text-white" : "text-white/60 group-hover:text-white/80"
                    )}>
                      {truncate(conv.title || 'Untitled Chat', 30)}
                    </span>
                    
                    {/* Context Menu Trigger */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(deletingId === conv.id ? null : conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-md transition-all text-white/40 hover:text-white"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-wider font-bold">
                    <Clock size={10} />
                    <span>{timeAgo(conv.updated_at)}</span>
                  </div>
                </button>

                {/* Inline Delete Confirmation */}
                <AnimatePresence>
                  {deletingId === conv.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden px-2 mb-2"
                    >
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-red-400 font-bold uppercase">Delete?</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setDeletingId(null)}
                            className="px-2 py-1 text-[10px] text-white/40 hover:text-white"
                          >
                            No
                          </button>
                          <button 
                            onClick={() => {
                              deleteConversation(conv.id);
                              setDeletingId(null);
                            }}
                            className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-500"
                          >
                            Yes
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredConversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-white/20">
              <MessageSquare size={32} className="mb-2 opacity-10" />
              <p className="text-xs italic">No conversations found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationList;