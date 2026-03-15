import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Plus, X, PanelRight } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import ChatWindow from '@/components/chat/ChatWindow'
import ChatInput from '@/components/chat/ChatInput'
import ConversationList from '@/components/chat/ConversationList'
import { ToolsPanel } from '@/components/chat/ToolsPanel'
import { cn } from '@/lib/utils'

export default function ChatbotPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Toggle Right Sidebar State (Defaults to closed)
  const [isRightOpen, setIsRightOpen] = useState(false)

  const loadConversations = useChatStore(state => state.loadConversations)
  const selectConversation = useChatStore(state => state.selectConversation)
  const createConversation = useChatStore(state => state.createConversation)

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    if (id) selectConversation(id)
  }, [id, selectConversation])

  const handleNewChat = async () => {
    const newConv = await createConversation()
    if (newConv) {
      navigate(`/chat/${newConv.id}`)
    } else {
      navigate('/chat')
    }
    setIsMobileOpen(false)
  }

  return (
    <div className="flex flex-row h-full w-full overflow-hidden relative bg-transparent">

      {/* Left Column (Main Chat Window) */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">

        {/* Desktop Toggle Button for Right Sidebar */}
        <div className="hidden md:block absolute top-6 right-6 z-30">
          <button
            onClick={() => setIsRightOpen(!isRightOpen)}
            className={cn(
              "p-2.5 rounded-xl backdrop-blur-md border transition-all duration-200 shadow-xl flex items-center justify-center",
              isRightOpen
                ? "bg-black/40 border-white/10 text-white hover:bg-black/60"
                : "bg-black/20 border-white/5 text-white/50 hover:text-white hover:bg-black/40"
            )}
            title={isRightOpen ? "Close Workspace" : "Open Workspace"}
          >
            <PanelRight size={18} />
          </button>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-black/20 backdrop-blur-md">
          <h2 className="text-white font-display font-medium">Chat</h2>
          <button onClick={() => setIsMobileOpen(true)} className="p-2 rounded-md hover:bg-white/10">
            <Menu className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Scrollable Messages */}
        <div className="flex-1 overflow-hidden flex flex-col relative z-0">
          <ChatWindow />
        </div>

        {/* Input Area */}
        <div className="px-4 pb-4 shrink-0 relative z-10">
          <ChatInput />
        </div>
      </div>

      {/* Right Column (Toggleable Glass Drawer) */}
      <motion.div
        initial={false}
        animate={{ width: isRightOpen ? 320 : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "hidden md:flex flex-col bg-black/20 backdrop-blur-md h-full shrink-0 z-20 overflow-hidden relative transition-shadow",
          isRightOpen ? "border-l border-white/10 shadow-2xl shadow-black/50" : "border-none"
        )}
      >
        {/* Inner Content (Fixed width so it doesn't squish during slide animation) */}
        <div className="w-[320px] flex-1 flex flex-col h-full">
          <div className={cn(
            "flex-1 flex flex-col transition-opacity duration-200",
            isRightOpen ? "opacity-100 delay-100" : "opacity-0 pointer-events-none"
          )}>

            <div className="p-4 shrink-0 pt-6">
              <button onClick={handleNewChat} className="w-full bg-primary-600 hover:bg-primary-500 transition-colors text-white rounded-lg flex items-center justify-center gap-2 py-3 shadow-lg shadow-primary-900/20">
                <Plus className="w-5 h-5" />
                New Chat
              </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-hidden border-y border-white/10 p-2 flex flex-col">
              <ConversationList />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile Overlay Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileOpen(false)} className="absolute inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute right-0 top-0 bottom-0 w-4/5 max-w-sm bg-black/40 backdrop-blur-xl z-50 flex flex-col md:hidden shadow-2xl border-l border-white/10">
              <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0">
                <button onClick={handleNewChat} className="bg-primary-600 hover:bg-primary-500 text-white rounded-lg flex-1 flex items-center justify-center gap-2 py-2 mr-4 transition-colors">
                  <Plus className="w-4 h-4" /> New Chat
                </button>
                <button onClick={() => setIsMobileOpen(false)} className="p-2 text-white/50 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="h-[40%] overflow-hidden flex flex-col border-b border-white/10 p-2">
                <ConversationList />
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <ToolsPanel />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}