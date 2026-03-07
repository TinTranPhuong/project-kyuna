import axiosInstance from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

// --- Types ---
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // FIX: These backend fields are now optional.
  // Optimistic messages created in the store before the server responds only need
  // id/role/content. Real messages loaded from the API will have all fields.
  timestamp?: string;
  conversation_id?: string;
  tokens_used?: number | null;
  generation_ms?: number | null;
  model_used?: string | null;
  created_at?: string;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ModelInfo {
  id: string;
  name: string;
  context_length: number;
}

// --- Service ---
export const chatService = {
  getConversations: async (skip = 0, limit = 20): Promise<Conversation[]> => {
    const response = await axiosInstance.get<Conversation[]>('/api/v1/chat/conversations', {
      params: { skip, limit },
    });
    return response.data;
  },

  getConversation: async (id: string): Promise<ConversationWithMessages> => {
    const response = await axiosInstance.get<ConversationWithMessages>(`/api/v1/chat/conversations/${id}`);
    return response.data;
  },

  createConversation: async (): Promise<Conversation> => {
    const response = await axiosInstance.post<Conversation>('/api/v1/chat/conversations');
    return response.data;
  },

  deleteConversation: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/chat/conversations/${id}`);
  },

  getModels: async (): Promise<ModelInfo[]> => {
    const response = await axiosInstance.get<ModelInfo[]>('/api/v1/chat/models');
    return response.data;
  },

  sendMessageStream: async function* (
    conversationId: string,
    content: string,
    model: string
  ): AsyncGenerator<string> {
    const token = useAuthStore.getState().token;

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/v1/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // FIX: backend schema uses model_used, not model
        body: JSON.stringify({ content, model_used: model }),
      }
    );

    if (!response.ok) throw new Error('Streaming request failed');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;

    // Buffer carries over any incomplete line from the previous chunk.
    // ReadableStream chunks can split mid-line, so we must never split on raw chunks.
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);
            // Skip memory_context metadata events — only yield actual tokens
            if (parsed.memory_context) continue;
            if (parsed.token) yield parsed.token;
          } catch {
            yield data;
          }
        }
      }
    }
  }
};