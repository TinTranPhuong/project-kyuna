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
  abortController: AbortController | null;
  lastMemoryContext: { memories: number; chunks: number; universals: number } | null;

  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createConversation: () => Promise<Conversation | undefined>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  sendMessage: (content: string, imageBase64?: string) => Promise<void>;
  stopGeneration: () => void;
  setModel: (model: string) => void;
  appendStreamToken: (token: string) => void;
  finalizeStream: (fullContent: string) => void;
  setMemoryContext: (context: { memories: number; chunks: number; universals: number } | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isStreaming: false,
  currentStreamContent: '',
  selectedModel: useSettingsStore.getState().chatModel || '',
  abortController: null,
  lastMemoryContext: null,

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

  renameConversation: async (id, title) => {
    try {
      const updatedConv = await chatService.updateConversation(id, { title });
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === id ? { ...c, title: updatedConv.title } : c)),
      }));
    } catch (error) {
      console.error('Failed to rename conversation', error);
    }
  },

  sendMessage: async (content, imageBase64) => {
    const { activeConversationId, selectedModel } = get();
    if (!activeConversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      image_base64: imageBase64,
      timestamp: new Date().toISOString(),
    };

    const abortController = new AbortController();

    set((state) => ({
      isStreaming: true,
      currentStreamContent: '',
      abortController,
      messages: {
        ...state.messages,
        [activeConversationId]: [...(state.messages[activeConversationId] || []), userMessage]
      }
    }));

    try {
      const stream = chatService.sendMessageStream(activeConversationId, content, selectedModel, abortController.signal, imageBase64);
      let fullAssistantContent = '';
      for await (const token of stream) {
        fullAssistantContent += token;
        get().appendStreamToken(token);
      }
      get().finalizeStream(fullAssistantContent);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        const partialContent = get().currentStreamContent;
        get().finalizeStream(partialContent);
      } else {
        console.error('Streaming error:', error);
        set({ isStreaming: false, abortController: null });
      }
    }
  },

  stopGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
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

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: fullContent,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      isStreaming: false,
      currentStreamContent: '',
      abortController: null,
      messages: {
        ...state.messages,
        [activeConversationId]: [...(state.messages[activeConversationId] || []), assistantMessage]
      }
    }));
  },

  setMemoryContext: (context) => set({ lastMemoryContext: context })
}));