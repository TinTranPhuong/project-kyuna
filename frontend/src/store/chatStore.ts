import { create } from 'zustand';
import { chatService, Message, Conversation } from '@/services/chat.service';
import { useSettingsStore } from './settingsStore';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // Keyed by conversationId
  isStreaming: boolean;
  currentStreamContent: string;
  selectedModel: string;

  // Actions
  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  
  // 1. FIXED: Tell TypeScript this will return a Conversation object (or undefined if it fails)
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
  selectedModel: useSettingsStore.getState().chatModel || 'qwen-2.5-14b-gguf',

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
    
    // Load messages for this specific conversation if not already in memory
    if (!get().messages[id]) {
      try {
        // 1. Call the correct service method: getConversation (singular)
        const conversationData = await chatService.getConversation(id);
        
        set((state) => ({
          // 2. Extract the .messages array from the returned object
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
      
      // 2. FIXED: Actually hand the new conversation object back to the component
      return newConv; 
      
    } catch (error) {
      console.error('Failed to create conversation', error);
      return undefined; // Return undefined on failure so the component knows not to navigate
    }
  },

  deleteConversation: async (id) => {
    try {
      await chatService.deleteConversation(id);
      set((state) => {
        const { [id]: deleted, ...remainingMessages } = state.messages;
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

    // 1. Create optimistic user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    // 2. Update store with optimistic message
    set((state) => ({
      isStreaming: true,
      currentStreamContent: '',
      messages: {
        ...state.messages,
        [activeConversationId]: [...(state.messages[activeConversationId] || []), userMessage]
      }
    }));

    try {
      // 3. Initiate stream from chatService (assumes it returns an AsyncGenerator)
      const stream = chatService.sendMessageStream(activeConversationId, content, selectedModel);
      
      let fullAssistantContent = '';
      for await (const token of stream) {
        fullAssistantContent += token;
        get().appendStreamToken(token);
      }

      // 4. Finalize the interaction
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

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: fullContent,
      timestamp: new Date().toISOString()
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