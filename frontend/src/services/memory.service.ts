import axiosInstance from '@/lib/axios'
import { 
  MemoryFact, 
  UniversalFact, 
  Document, 
  DocChunk, 
  PaginatedResponse,
  MemorySearchResponse
} from '@/types/memory.types'

export const memoryService = {
  // ─── Memory Facts ────────────────────────────────────────────────────────
  getFacts: async (
    params: { limit?: number; offset?: number; min_confidence?: number; conversation_id?: string } = {}
  ): Promise<PaginatedResponse<MemoryFact>> => {
    const res = await axiosInstance.get<PaginatedResponse<MemoryFact>>('/api/v1/memory/facts', { params })
    return res.data
  },

  deleteFact: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/memory/facts/${id}`)
  },

  promoteFact: async (id: string): Promise<UniversalFact> => {
    const res = await axiosInstance.post<UniversalFact>(`/api/v1/memory/facts/${id}/promote`)
    return res.data
  },

  // ─── Universal Facts ─────────────────────────────────────────────────────
  getUniversals: async (): Promise<UniversalFact[]> => {
    const res = await axiosInstance.get<UniversalFact[]>('/api/v1/memory/universal')
    return res.data
  },

  deleteUniversal: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/memory/universal/${id}`)
  },

  addUniversal: async (content: string): Promise<UniversalFact> => {
    const res = await axiosInstance.post<UniversalFact>('/api/v1/memory/universal', { content })
    return res.data
  },
  
  updateUniversal: async (id: string, data: { content?: string; is_active?: boolean }): Promise<UniversalFact> => {
    const res = await axiosInstance.patch<UniversalFact>(`/api/v1/memory/universal/${id}`, data)
    return res.data
  },

  // ─── Documents ───────────────────────────────────────────────────────────
  getDocuments: async (): Promise<Document[]> => {
    const res = await axiosInstance.get<Document[]>('/api/v1/docs')
    return res.data
  },

  getChunks: async (docId: string, params: { limit?: number; offset?: number } = {}): Promise<PaginatedResponse<DocChunk>> => {
    const res = await axiosInstance.get<PaginatedResponse<DocChunk>>(`/api/v1/docs/${docId}/chunks`, { params })
    return res.data
  },

  uploadDocument: async (file: File, onProgress?: (progress: number) => void): Promise<Document> => {
    const formData = new FormData()
    formData.append('file', file)

    const res = await axiosInstance.post<Document>('/api/v1/docs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percentCompleted)
        }
      },
    })
    return res.data
  },

  deleteDocument: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/docs/${id}`)
  },

  reprocessDocument: async (id: string): Promise<Document> => {
    const res = await axiosInstance.post<Document>(`/api/v1/docs/${id}/reprocess`)
    return res.data
  },

  // ─── Search ──────────────────────────────────────────────────────────────
  search: async (query: string): Promise<MemorySearchResponse> => {
    const res = await axiosInstance.get<MemorySearchResponse>('/api/v1/memory/search', { params: { query } })
    return res.data
  },
}