import { create } from 'zustand';
import { chatService, Message, Conversation } from '@/services/chat.service';
import { useSettingsStore } from './settingsStore';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  isStreaming: boolean;
  currentStreamContent: string;
  selectedModel: string;

  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createConversation: () => Promise<Conversation | undefined>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setModel: (model: string) => void;
  appendStreamToken: (token: string) => void;
  finalizeStream: (fullContent: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isStreaming: false,
  currentStreamContent: '',
  // null → empty string → backend calls get_fallback_model() dynamically
  selectedModel: useSettingsStore.getState().chatModel || '',

  loadConversations: async () => {
    try {
      const conversations = await chatService.getConversations();
      set({ conversations });
    } catch (error) {
      console.error('Failed to load conversations', error);
    }
  },

  selectConversation: async (id) => {
    set({ activeConversationId: id, currentStreamContent: '' });
    if (!get().messages[id]) {
      try {
        const conversationData = await chatService.getConversation(id);
        set((state) => ({
          messages: { ...state.messages, [id]: conversationData.messages || [] }
        }));
      } catch (error) {
        console.error('Failed to load message history', error);
      }
    }
  },

  createConversation: async () => {
    try {
      const newConv = await chatService.createConversation();
      set((state) => ({
        conversations: [newConv, ...state.conversations],
        activeConversationId: newConv.id,
        messages: { ...state.messages, [newConv.id]: [] }
      }));
      return newConv;
    } catch (error) {
      console.error('Failed to create conversation', error);
      return undefined;
    }
  },

  deleteConversation: async (id) => {
    try {
      await chatService.deleteConversation(id);
      set((state) => {
        const { [id]: _deleted, ...remainingMessages } = state.messages;
        return {
          conversations: state.conversations.filter((c) => c.id !== id),
          messages: remainingMessages,
          activeConversationId: state.activeConversationId === id ? null : state.activeConversationId
        };
      });
    } catch (error) {
      console.error('Failed to delete conversation', error);
    }
  },

  sendMessage: async (content) => {
    const { activeConversationId, selectedModel } = get();
    if (!activeConversationId) return;

    // Optimistic user message — only requires the fields that are now non-optional
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      // timestamp is optional in the updated interface
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      isStreaming: true,
      currentStreamContent: '',
      messages: {
        ...state.messages,
        [activeConversationId]: [...(state.messages[activeConversationId] || []), userMessage]
      }
    }));

    try {
      const stream = chatService.sendMessageStream(activeConversationId, content, selectedModel);
      let fullAssistantContent = '';
      for await (const token of stream) {
        fullAssistantContent += token;
        get().appendStreamToken(token);
      }
      get().finalizeStream(fullAssistantContent);
    } catch (error) {
      console.error('Streaming error:', error);
      set({ isStreaming: false });
    }
  },

  setModel: (model) => set({ selectedModel: model }),

  appendStreamToken: (token) => {
    set((state) => ({
      currentStreamContent: state.currentStreamContent + token
    }));
  },

  finalizeStream: (fullContent) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    // Optimistic assistant message — same minimal shape
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: fullContent,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      isStreaming: false,
      currentStreamContent: '',
      messages: {
        ...state.messages,
        [activeConversationId]: [...(state.messages[activeConversationId] || []), assistantMessage]
      }
    }));
  }
}));