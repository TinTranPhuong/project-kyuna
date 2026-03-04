import axiosInstance from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import type {
  Conversation,
  ConversationWithMessages,
  ModelInfo,
  Message,
} from '@/types/chat.types'

export type { Conversation, ConversationWithMessages, ModelInfo, Message }

export const chatService = {

  // ─── Conversations ──────────────────────────────────────────────────────────

  getConversations: async (skip = 0, limit = 20): Promise<Conversation[]> => {
    const response = await axiosInstance.get<Conversation[]>(
      '/api/v1/chat/conversations',
      { params: { skip, limit } },
    )
    return response.data
  },

  getConversation: async (id: string): Promise<ConversationWithMessages> => {
    const response = await axiosInstance.get<ConversationWithMessages>(
      `/api/v1/chat/conversations/${id}`,
    )
    return response.data
  },

  createConversation: async (): Promise<Conversation> => {
    const response = await axiosInstance.post<Conversation>('/api/v1/chat/conversations')
    return response.data
  },

  deleteConversation: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/chat/conversations/${id}`)
  },

  // NEW: Update conversation title
  updateConversationTitle: async (id: string, title: string): Promise<Conversation> => {
    const response = await axiosInstance.patch<Conversation>(`/api/v1/chat/conversations/${id}`, { title })
    return response.data
  },

  // ─── Models ─────────────────────────────────────────────────────────────────

  getModels: async (): Promise<ModelInfo[]> => {
    const response = await axiosInstance.get<ModelInfo[]>('/api/v1/chat/models')
    return response.data
  },

  // ─── Streaming ──────────────────────────────────────────────────────────────

  sendMessageStream: async function* (
    conversationId: string,
    content: string,
    model: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, unknown> {
    const token   = useAuthStore.getState().token
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

    const response = await fetch(
      `${baseUrl}/api/v1/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content, model_used: model }), 
      },
    )

    if (!response.ok) {
      throw new Error(`Chat stream failed: ${response.status} ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('Response body is null — streaming is not supported in this environment')
    }

    const reader  = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const data = line.slice(6).trim()
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data) as { token?: string }
            if (parsed.token) yield parsed.token
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  },
}