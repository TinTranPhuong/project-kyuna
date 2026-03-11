import axiosInstance from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';

// --- Types ---
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  conversation_id?: string;
  tokens_used?: number | null;
  generation_ms?: number | null;
  model_used?: string | null;
  image_base64?: string | null;
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
  type: 'text' | 'vision';
  size?: string;
  context_window?: number;
  description?: string;
  is_loaded?: boolean;
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

  updateConversation: async (id: string, updates: { title?: string; system_prompt?: string }): Promise<Conversation> => {
    const response = await axiosInstance.patch<Conversation>(`/api/v1/chat/conversations/${id}`, updates);
    return response.data;
  },

  getModels: async (): Promise<ModelInfo[]> => {
    const response = await axiosInstance.get<ModelInfo[]>('/api/v1/chat/models');
    return response.data;
  },

  sendMessageStream: async function* (
    conversationId: string,
    content: string,
    model: string,
    mode: string,
    signal?: AbortSignal,
    imageBase64?: string
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
        body: JSON.stringify({ content, model_used: model, mode, image_base64: imageBase64 }),
        signal,
      }
    );

    if (!response.ok) throw new Error('Streaming request failed');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.memory_context) {
              useChatStore.getState().setMemoryContext(parsed.memory_context);
              continue;
            }
            if (parsed.token) yield parsed.token;
          } catch {
            yield data;
          }
        }
      }
    }
  }
};