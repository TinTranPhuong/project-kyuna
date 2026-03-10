import axiosInstance from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

export interface PlanStep {
  step_index: number;
  tool_name: string;
  args: Record<string, any>;
  description: string;
  requires_hitl: boolean;
}

export const agentService = {
  approvePlan: async (runId: string, steps: PlanStep[], enableConsensus: boolean = false) => {
    const response = await axiosInstance.post(`/api/v1/agent/runs/${runId}/plan/approve`, { steps, enable_consensus: enableConsensus });
    return response.data;
  },

  cancelPlan: async (runId: string) => {
    const response = await axiosInstance.post(`/api/v1/agent/runs/${runId}/plan/cancel`);
    return response.data;
  },

  confirmTool: async (runId: string, toolName: string) => {
    const response = await axiosInstance.post(`/api/v1/agent/runs/${runId}/tools/${toolName}/confirm`);
    return response.data;
  },

  cancelTool: async (runId: string, toolName: string) => {
    const response = await axiosInstance.post(`/api/v1/agent/runs/${runId}/tools/${toolName}/cancel`);
    return response.data;
  },

  sendAgenticMessageStream: async function* (
    conversationId: string,
    content: string,
    model: string,
    signal?: AbortSignal
  ): AsyncGenerator<any> {
    const token = useAuthStore.getState().token;

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/v1/agent/runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ conversation_id: conversationId, message: content, model_used: model }),
        signal,
      }
    );

    if (!response.ok) throw new Error('Agentic streaming request failed');

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
            yield parsed;
          } catch {
            yield { event: 'raw', data };
          }
        }
      }
    }
  }
};
