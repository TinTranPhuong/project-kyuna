import { create } from 'zustand';
import { chatService, Message, Conversation } from '@/services/chat.service';
import { agentService, PlanStep } from '@/services/agent.service';
import { useSettingsStore } from './settingsStore';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface AgentState {
  runId: string;
  planSteps: PlanStep[];
  planStatus: 'pending' | 'approved' | 'cancelled';
  pendingConfirmation: { tool: string; args: any } | null;
  toolResults: Record<string, any>;
  toolStatus: Record<string, 'running' | 'done' | 'error'>;
  isRunning: boolean;
  activeAgents: string[];
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  isStreaming: boolean;
  currentStreamContent: string;
  selectedModel: string;
  selectedMode: 'fast' | 'thinking' | 'agentic' | 'creative' | 'coding';
  abortController: AbortController | null;
  lastMemoryContext: { memories: number; chunks: number; universals: number } | null;
  agentState: AgentState | null;

  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  createConversation: () => Promise<Conversation | undefined>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  sendMessage: (content: string, imageBase64?: string) => Promise<void>;
  stopGeneration: () => void;
  setModel: (model: string) => void;
  setMode: (mode: 'fast' | 'thinking' | 'agentic' | 'creative') => void;
  appendStreamToken: (token: string) => void;
  finalizeStream: (fullContent: string) => void;
  setMemoryContext: (context: { memories: number; chunks: number; universals: number } | null) => void;

  setAgentState: (partial: Partial<AgentState> | null) => void;
  editPlanStep: (index: number, newDescription: string) => void;
  removePlanStep: (index: number) => void;
  approvePlan: (steps: PlanStep[], enableConsensus?: boolean) => Promise<void>;
  cancelPlan: () => Promise<void>;
  confirmTool: () => Promise<void>;
  cancelTool: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isStreaming: false,
  currentStreamContent: '',
  selectedModel: useSettingsStore.getState().chatModel || '',
  selectedMode: (localStorage.getItem('kyuna_chat_mode') as any) || 'fast',
  abortController: null,
  lastMemoryContext: null,
  agentState: null,

  loadConversations: async () => {
    try {
      const conversations = await chatService.getConversations();
      set({ conversations });
    } catch (error) {
      console.error('Failed to load conversations', error);
    }
  },

  selectConversation: async (id) => {
    set({ activeConversationId: id, currentStreamContent: '', agentState: null });
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
        messages: { ...state.messages, [newConv.id]: [] },
        agentState: null
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
    const { activeConversationId, selectedModel, selectedMode } = get();
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

    if (selectedMode === 'agentic') {
      let fullAssistantContent = '';
      set({
        agentState: {
          runId: '', planSteps: [], planStatus: 'pending', pendingConfirmation: null, toolResults: {}, toolStatus: {}, isRunning: true, activeAgents: []
        }
      });

      try {
        const stream = agentService.sendAgenticMessageStream(activeConversationId, content, selectedModel, abortController.signal);

        for await (const payload of stream) {
          if (payload.event === 'plan_ready') {
            set((state) => ({
              agentState: { ...state.agentState!, runId: payload.run_id, planSteps: payload.steps }
            }));
          } else if (payload.event === 'plan_approved') {
            set((state) => ({
              agentState: { ...state.agentState!, planSteps: payload.steps, planStatus: 'approved' }
            }));
          } else if (payload.event === 'tool_start') {
            set((state) => ({
              agentState: { ...state.agentState!, toolStatus: { ...state.agentState!.toolStatus, [payload.tool]: 'running' } }
            }));
          } else if (payload.event === 'tool_result') {
            set((state) => ({
              agentState: {
                ...state.agentState!,
                toolStatus: { ...state.agentState!.toolStatus, [payload.tool]: 'done' },
                toolResults: { ...state.agentState!.toolResults, [payload.tool]: payload.result }
              }
            }));
          } else if (payload.event === 'tool_error') {
            set((state) => ({
              agentState: {
                ...state.agentState!,
                toolStatus: { ...state.agentState!.toolStatus, [payload.tool]: 'error' },
                toolResults: { ...state.agentState!.toolResults, [payload.tool]: payload.error }
              }
            }));
          } else if (payload.event === 'confirmation_required') {
            set((state) => ({
              agentState: { ...state.agentState!, pendingConfirmation: { tool: payload.tool, args: payload.args } }
            }));
          } else if (payload.event === 'confirmation_cancelled') {
            set((state) => ({
              agentState: {
                ...state.agentState!,
                pendingConfirmation: null,
                toolStatus: { ...state.agentState!.toolStatus, [payload.tool]: 'error' },
                toolResults: { ...state.agentState!.toolResults, [payload.tool]: "SKIP" }
              }
            }));
          } else if (payload.event === 'agent_start') {
            set((state) => ({
              agentState: { ...state.agentState!, activeAgents: [...state.agentState!.activeAgents, payload.agent] }
            }));
          } else if (payload.event === 'agent_end') {
            set((state) => ({
              agentState: { ...state.agentState!, activeAgents: state.agentState!.activeAgents.filter(a => a !== payload.agent) }
            }));
          } else if (payload.event === 'token') {
            fullAssistantContent += payload.token;
            get().appendStreamToken(payload.token);
            await sleep(15);
          } else if (payload.event === 'done') {
            break;
          }
        }
        get().finalizeStream(fullAssistantContent);
        set((state) => ({ agentState: state.agentState ? { ...state.agentState, isRunning: false } : null }));
      } catch (error: any) {
        if (error.name === 'AbortError') {
          get().finalizeStream(fullAssistantContent);
        } else {
          console.error('Agentic stream error:', error);
          set({ isStreaming: false, abortController: null, agentState: null });
        }
      }
      return;
    }

    try {
      const stream = chatService.sendMessageStream(activeConversationId, content, selectedModel, selectedMode, abortController.signal, imageBase64);
      let fullAssistantContent = '';
      for await (const token of stream) {
        fullAssistantContent += token;
        get().appendStreamToken(token);
        await sleep(15);
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
  setMode: (mode) => {
    localStorage.setItem('kyuna_chat_mode', mode);
    set({ selectedMode: mode });
  },

  appendStreamToken: (token) => {
    set((state) => ({
      currentStreamContent: state.currentStreamContent + token
    }));
  },

  finalizeStream: (fullContent) => {
    const { activeConversationId } = get();
    if (!activeConversationId || !fullContent) return;

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

  setMemoryContext: (context) => set({ lastMemoryContext: context }),

  setAgentState: (partial) => set((state) => ({
    agentState: partial === null ? null : { ...state.agentState!, ...partial }
  })),

  editPlanStep: (index, newDescription) => set((state) => {
    if (!state.agentState) return state;
    const newSteps = [...state.agentState.planSteps];
    newSteps[index] = { ...newSteps[index], description: newDescription };
    return { agentState: { ...state.agentState, planSteps: newSteps } };
  }),

  removePlanStep: (index) => set((state) => {
    if (!state.agentState) return state;
    const newSteps = [...state.agentState.planSteps];
    newSteps.splice(index, 1);
    return { agentState: { ...state.agentState, planSteps: newSteps } };
  }),

  approvePlan: async (steps, enableConsensus = false) => {
    const state = get();
    if (!state.agentState) return;
    try {
      await agentService.approvePlan(state.agentState.runId, steps, enableConsensus);
    } catch (e) {
      console.error(e);
    }
  },

  cancelPlan: async () => {
    const state = get();
    if (!state.agentState) return;
    try {
      await agentService.cancelPlan(state.agentState.runId);
      set({ agentState: null, isStreaming: false });
    } catch (e) {
      console.error(e);
    }
  },

  confirmTool: async () => {
    const state = get();
    if (!state.agentState || !state.agentState.pendingConfirmation) return;
    try {
      await agentService.confirmTool(state.agentState.runId, state.agentState.pendingConfirmation.tool);
      set((s) => ({ agentState: { ...s.agentState!, pendingConfirmation: null } }));
    } catch (e) {
      console.error(e);
    }
  },

  cancelTool: async () => {
    const state = get();
    if (!state.agentState || !state.agentState.pendingConfirmation) return;
    try {
      await agentService.cancelTool(state.agentState.runId, state.agentState.pendingConfirmation.tool);
      set((s) => ({ agentState: { ...s.agentState!, pendingConfirmation: null } }));
    } catch (e) {
      console.error(e);
    }
  }

}));