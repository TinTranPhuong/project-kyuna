import { useChatStore } from '@/store/chatStore';

export function useChat() {
  const chatState = useChatStore();

  const activeConversation = chatState.activeConversationId
    ? chatState.conversations.find((c) => c.id === chatState.activeConversationId)
    : undefined;

  const activeMessages = chatState.activeConversationId
    ? chatState.messages[chatState.activeConversationId] ?? []
    : [];

  return {
    ...chatState,
    activeConversation,
    activeMessages,
  };
}

export default useChat;