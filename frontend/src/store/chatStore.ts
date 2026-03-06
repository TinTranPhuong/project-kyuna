import { create } from 'zustand'
import { chatService } from '@/services/chat.service'
import type { Conversation, ConversationWithMessages } from '@/services/chat.service'
import type { Message } from '@/types/chat.types'
import { useSettingsStore } from './settingsStore'

export type { Conversation, Message }

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<string, Message[]>
  isStreaming: boolean
  currentStreamContent: string
  selectedModel: string
  _abortController: AbortController | null
  lastMemoryContext: { memories: number; chunks: number; universals: number } | null

  loadConversations: () => Promise<void>
  selectConversation: (id: string) => Promise<void>
  createConversation: () => Promise<Conversation | undefined>
  deleteConversation: (id: string) => Promise<void>
  updateConversationTitle: (id: string, title: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  stopGeneration: () => void
  setModel: (model: string) => void
  appendStreamToken: (token: string) => void
  finalizeStream: (fullContent: string) => void
  setMemoryContext: (ctx: { memories: number; chunks: number; universals: number }) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isStreaming: false,
  currentStreamContent: '',
  selectedModel: useSettingsStore.getState().chatModel ?? 'llama-3.1-8b-instruct-q4_k_m.gguf',
  _abortController: null,
  lastMemoryContext: null,

  setMemoryContext: (ctx) => set({ lastMemoryContext: ctx }),

  loadConversations: async () => {
    try {
      const conversations = await chatService.getConversations()
      set({ conversations })
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  },

  selectConversation: async (id) => {
    set({ activeConversationId: id, currentStreamContent: '', lastMemoryContext: null })

    if (!get().messages[id]) {
      try {
        const data: ConversationWithMessages = await chatService.getConversation(id)
        set(state => ({
          messages: { ...state.messages, [id]: data.messages ?? [] },
        }))
      } catch (error) {
        console.error('Failed to load message history:', error)
      }
    }
  },

  createConversation: async () => {
    try {
      const newConv = await chatService.createConversation()
      set(state => ({
        conversations: [newConv, ...state.conversations],
        activeConversationId: newConv.id,
        messages: { ...state.messages, [newConv.id]: [] },
        lastMemoryContext: null
      }))
      return newConv
    } catch (error) {
      console.error('Failed to create conversation:', error)
      return undefined
    }
  },

  deleteConversation: async (id) => {
    try {
      await chatService.deleteConversation(id)
      set(state => {
        const { [id]: _removed, ...remainingMessages } = state.messages
        return {
          conversations: state.conversations.filter(c => c.id !== id),
          messages: remainingMessages,
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId,
        }
      })
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  },

  updateConversationTitle: async (id, title) => {
    set(state => ({
      conversations: state.conversations.map(conv => 
        conv.id === id ? { ...conv, title } : conv
      )
    }))

    try {
      await chatService.updateConversationTitle(id, title)
    } catch (error) {
      console.error('Failed to update conversation title:', error)
    }
  },

  stopGeneration: () => {
    const { _abortController } = get() 
    
    if (_abortController) {
      _abortController.abort()
      console.log('Generation stopped by user')
    }
    set({ isStreaming: false, _abortController: null })
  },

  sendMessage: async (content) => {
    const { activeConversationId, selectedModel, isStreaming, _abortController } = get()
    if (!activeConversationId) return

    if (isStreaming && _abortController) {
      _abortController.abort()
    }

    const controller = new AbortController()
    set({ _abortController: controller })

    const userMessage: Message = {
      id: `optimistic-${Date.now()}`,
      conversation_id: activeConversationId,
      role: 'user',
      content,
      tokens_used: null,
      generation_ms: null,
      model_used: null,
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString(), 
    }

    set(state => ({
      isStreaming: true,
      currentStreamContent: '',
      messages: {
        ...state.messages,
        [activeConversationId]: [
          ...(state.messages[activeConversationId] ?? []),
          userMessage,
        ],
      },
    }))

    let fullContent = ''

    try {
      const stream = chatService.sendMessageStream(
        activeConversationId,
        content,
        selectedModel,
        controller.signal
      )

      let textBuffer = ''
      let lastUpdateTime = Date.now()
      const THROTTLE_MS = 50

      for await (const token of stream) {
        fullContent += token
        textBuffer += token

        if (Date.now() - lastUpdateTime > THROTTLE_MS) {
          get().appendStreamToken(textBuffer)
          textBuffer = ''
          lastUpdateTime = Date.now()
        }
      }

      if (textBuffer.length > 0) {
        get().appendStreamToken(textBuffer)
      }

      get().finalizeStream(fullContent)

      // Pick up memory_context that arrived during the stream
      if (chatService._lastMemoryContext) {
        set({ lastMemoryContext: chatService._lastMemoryContext })
        chatService._lastMemoryContext = null
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      
      console.error('Streaming error:', error)
      set({ isStreaming: false, currentStreamContent: '' })
    }
  },

  setModel: (model) => set({ selectedModel: model }),

  appendStreamToken: (tokenChunk) => {
    set(state => ({ currentStreamContent: state.currentStreamContent + tokenChunk }))
  },

  finalizeStream: (fullContent) => {
    const { activeConversationId, selectedModel } = get()
    if (!activeConversationId) return

    const assistantMessage: Message = {
      id: `optimistic-${Date.now() + 1}`,
      conversation_id: activeConversationId,
      role: 'assistant',
      content: fullContent,
      tokens_used: null,
      generation_ms: null,
      model_used: selectedModel,
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString(), 
    }

    set(state => ({
      isStreaming: false,
      currentStreamContent: '',
      _abortController: null,
      messages: {
        ...state.messages,
        [activeConversationId]: [
          ...(state.messages[activeConversationId] ?? []),
          assistantMessage,
        ],
      },
    }))
  },
}))