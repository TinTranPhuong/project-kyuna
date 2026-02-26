import { create } from 'zustand'
import { chatService } from '@/services/chat.service'
import type { Conversation, ConversationWithMessages } from '@/services/chat.service'
import type { Message } from '@/types/chat.types'
import { useSettingsStore } from './settingsStore'

// Re-export so components can import from one place
export type { Conversation, Message }

// ─── State Interface ──────────────────────────────────────────────────────────

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<string, Message[]>   // keyed by conversationId
  isStreaming: boolean
  currentStreamContent: string           // live token accumulator during stream
  selectedModel: string
  _abortController: AbortController | null  // cancel in-flight stream on new send

  // Actions
  loadConversations: () => Promise<void>
  selectConversation: (id: string) => Promise<void>
  createConversation: () => Promise<Conversation | undefined>
  deleteConversation: (id: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  setModel: (model: string) => void
  appendStreamToken: (token: string) => void
  finalizeStream: (fullContent: string) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isStreaming: false,
  currentStreamContent: '',
  // Read the persisted model preference at store creation time.
  // If settings haven't loaded yet, this falls back to a sensible default.
  // Components that change the model call setModel() which updates this live.
  selectedModel: useSettingsStore.getState().chatModel ?? 'llama-3.1-8b-instruct-q4_k_m.gguf',
  _abortController: null,

  // ─── Conversations ──────────────────────────────────────────────────────────

  loadConversations: async () => {
    try {
      const conversations = await chatService.getConversations()
      set({ conversations })
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  },

  selectConversation: async (id) => {
    set({ activeConversationId: id, currentStreamContent: '' })

    // Messages are cached in memory — only fetch from server if not already loaded
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

  // ─── Messaging ──────────────────────────────────────────────────────────────

  sendMessage: async (content) => {
    const { activeConversationId, selectedModel, isStreaming, _abortController } = get()
    if (!activeConversationId) return

    // Guard: if a stream is already in flight, abort it before starting a new one
    if (isStreaming && _abortController) {
      _abortController.abort()
    }

    const controller = new AbortController()
    set({ _abortController: controller })

    // Optimistic update — add user message immediately so the UI feels instant.
    // All required Message fields are filled; nulls match the backend schema.
    const userMessage: Message = {
      id: `optimistic-${Date.now()}`,
      conversation_id: activeConversationId,
      role: 'user',
      content,
      tokens_used: null,
      generation_ms: null,
      model_used: null,
      created_at: new Date().toISOString(),
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

    try {
      const stream = chatService.sendMessageStream(
        activeConversationId,
        content,
        selectedModel,
        controller.signal,
      )

      let fullContent = ''
      for await (const token of stream) {
        fullContent += token
        get().appendStreamToken(token)
      }

      get().finalizeStream(fullContent)
    } catch (error) {
      // AbortError is intentional (user sent a new message) — don't log it as an error
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Streaming error:', error)
      set({ isStreaming: false, currentStreamContent: '' })
    }
  },

  setModel: (model) => set({ selectedModel: model }),

  appendStreamToken: (token) => {
    set(state => ({ currentStreamContent: state.currentStreamContent + token }))
  },

  /**
   * Called when the SSE stream ends.
   * Replaces the live stream content with a proper Message record so
   * the full response is preserved after currentStreamContent is cleared.
   */
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