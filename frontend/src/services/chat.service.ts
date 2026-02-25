import axiosInstance from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import type {
  Conversation,
  ConversationWithMessages,
  ModelInfo,
  Message,
} from '@/types/chat.types'

// Re-export canonical types so callers import from one place
export type { Conversation, ConversationWithMessages, ModelInfo, Message }

/**
 * Chat service.
 *
 * Standard CRUD calls use axiosInstance (handles auth + token refresh automatically).
 * The streaming call uses raw fetch() — axios does not expose ReadableStream.
 *
 * SSE token format emitted by backend/app/routers/chat.py:
 *   data: {"token": "Hello"}\n\n
 *   data: {"token": " world"}\n\n
 *   data: [DONE]\n\n
 */
export const chatService = {

  // ─── Conversations ──────────────────────────────────────────────────────────

  /** GET /api/v1/chat/conversations */
  getConversations: async (skip = 0, limit = 20): Promise<Conversation[]> => {
    const response = await axiosInstance.get<Conversation[]>(
      '/api/v1/chat/conversations',
      { params: { skip, limit } },
    )
    return response.data
  },

  /** GET /api/v1/chat/conversations/:id */
  getConversation: async (id: string): Promise<ConversationWithMessages> => {
    const response = await axiosInstance.get<ConversationWithMessages>(
      `/api/v1/chat/conversations/${id}`,
    )
    return response.data
  },

  /** POST /api/v1/chat/conversations */
  createConversation: async (): Promise<Conversation> => {
    const response = await axiosInstance.post<Conversation>('/api/v1/chat/conversations')
    return response.data
  },

  /** DELETE /api/v1/chat/conversations/:id */
  deleteConversation: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/chat/conversations/${id}`)
  },

  // ─── Models ─────────────────────────────────────────────────────────────────

  /** GET /api/v1/chat/models — proxied from AI server */
  getModels: async (): Promise<ModelInfo[]> => {
    const response = await axiosInstance.get<ModelInfo[]>('/api/v1/chat/models')
    return response.data
  },

  // ─── Streaming ──────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/chat/conversations/:id/messages  (text/event-stream)
   *
   * Uses raw fetch() instead of axios — axios does not support ReadableStream responses.
   *
   * Token is read from Zustand store state, NOT from localStorage with a
   * hardcoded key. The localStorage key is an implementation detail of the
   * persist middleware and must not be referenced directly in services.
   *
   * Accepts an optional AbortSignal so the caller can cancel mid-stream
   * (e.g. user navigates away or sends a new message before the old one finishes).
   *
   * @example
   * const controller = new AbortController()
   * for await (const token of chatService.sendMessageStream(id, text, model, controller.signal)) {
   *   appendToken(token)
   * }
   * controller.abort() // cancel at any time
   */
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
        body: JSON.stringify({ content, model }),
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

        // A single read() chunk may contain multiple SSE lines — split and process each
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const data = line.slice(6).trim()

          // Sentinel value — server signals end of stream
          if (data === '[DONE]') return

          try {
            // Backend wraps each token as: { "token": "..." }
            // See: backend/app/routers/chat.py → Yield SSE events: data: {"token": "..."}
            const parsed = JSON.parse(data) as { token?: string }
            if (parsed.token) yield parsed.token
          } catch {
            // Skip malformed JSON lines without crashing the generator
          }
        }
      }
    } finally {
      // Release the lock even if the caller threw or the signal was aborted
      reader.releaseLock()
    }
  },
}