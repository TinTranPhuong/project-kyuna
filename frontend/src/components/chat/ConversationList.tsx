import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, MessageSquare, MoreVertical, Clock } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { cn, timeAgo, truncate } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const ConversationList = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { conversations, selectConversation, deleteConversation } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) =>
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const handleSelect = (id: string) => {
    selectConversation(id);
    navigate(`/chat/${id}`);
  };

  return (
    // Completely transparent root wrapper to let parent handle layout
    <div className="flex flex-col h-full bg-transparent w-full shrink-0">
      
      {/* Search Bar */}
      <div className="px-2 pb-3 pt-1">
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary-400 transition-colors" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary-500/50 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {filteredConversations.map((conv) => (
              <motion.div key={conv.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative group">
                <button
                  onClick={() => handleSelect(conv.id)}
                  className={cn(
                    "w-full flex flex-col items-start gap-1 p-2.5 rounded-lg transition-all text-left border border-transparent",
                    conversationId === conv.id ? "bg-white/10 border-white/5 shadow-inner" : "hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className={cn("text-sm font-medium truncate flex-1", conversationId === conv.id ? "text-white" : "text-white/70 group-hover:text-white")}>
                      {truncate(conv.title || 'Untitled Chat', 30)}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); setDeletingId(deletingId === conv.id ? null : conv.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-md transition-all text-white/40 hover:text-white">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-white/40 uppercase tracking-widest font-bold">
                    <Clock size={10} />
                    <span>{timeAgo(conv.updated_at)}</span>
                  </div>
                </button>

                <AnimatePresence>
                  {deletingId === conv.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-1 mb-2 mt-1">
                      <div className="bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-lg p-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-red-400 font-bold uppercase">Delete?</span>
                        <div className="flex gap-1">
                          <button onClick={() => setDeletingId(null)} className="px-2 py-1 text-[10px] text-white/50 hover:text-white">No</button>
                          <button onClick={() => { deleteConversation(conv.id); setDeletingId(null); }} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded shadow-md">Yes</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredConversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-white/20">
              <MessageSquare size={24} className="mb-2 opacity-20" />
              <p className="text-xs italic opacity-50">No conversations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationList;