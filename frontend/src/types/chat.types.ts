export interface Conversation {
  id: string
  title: string
  model_used: string | null
  message_count: number
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string;
  tokens_used: number | null
  generation_ms: number | null
  model_used: string | null
  created_at: string
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

export interface ModelInfo {
  id: string
  name: string
  file_size_gb: number | null
  type: 'text' | 'vision'
  size?: string; 
  description?: string;
  context_window?: number;
  is_loaded?: boolean;
}