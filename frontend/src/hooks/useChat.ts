import { useChatStore } from '@/store/chatStore';

/**
 * Custom hook for accessing chat state, actions, and derived active conversation data.
 */
export function useChat() {
  const chatState = useChatStore();

  // 1. Retrieve the full object of the currently active conversation
  const activeConversation = chatState.activeConversationId
    ? chatState.conversations.find((c) => c.id === chatState.activeConversationId)
    : undefined;

  // 2. Safely extract the message array for the active conversation
  const activeMessages = chatState.activeConversationId
    ? chatState.messages[chatState.activeConversationId] ?? []
    : [];

  return {
    ...chatState, // Re-export all base state and actions (sendMessage, createConversation, etc.)
    activeConversation,
    activeMessages,
  };
}

export default useChat;