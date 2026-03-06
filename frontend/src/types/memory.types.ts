export interface PaginatedResponse<T> {
  items: T[]
  total: number
}

export interface MemoryFact {
  id: string
  conversation_id: string | null
  subject: string
  predicate: string
  object: string
  raw_text: string
  confidence: number
  is_universal: boolean
  is_active: boolean
  source: string
  created_at: string
  updated_at: string
}

export interface UniversalFact {
  id: string
  content: string
  source: string
  origin_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  filename: string
  file_size_bytes: number | null
  file_type: string
  status: string
  chunk_count: number
  error_message: string | null
  created_at: string
  processed_at: string | null
}

export interface DocChunk {
  id: string
  chunk_index: number
  content: string
  page_number: number | null
  section_heading: string | null
  token_count: number
}

export interface SearchResultItem {
  id: string
  score: number
  payload: Record<string, unknown>
}

export interface MemorySearchResponse {
  memories: SearchResultItem[]
  documents: SearchResultItem[]
  universals: SearchResultItem[]
}