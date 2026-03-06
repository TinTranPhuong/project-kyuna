import { create } from 'zustand'
import { memoryService } from '@/services/memory.service'
import { MemoryFact, UniversalFact, Document, MemorySearchResponse } from '@/types/memory.types'

interface MemoryState {
  // Data
  facts: MemoryFact[]
  factsTotal: number
  universals: UniversalFact[]
  documents: Document[]
  searchResults: MemorySearchResponse | null
  
  // Status
  isLoading: boolean
  isSearching: boolean
  uploadProgress: number
  error: string | null

  // Actions
  fetchFacts: (offset?: number) => Promise<void>
  fetchUniversals: () => Promise<void>
  fetchDocuments: () => Promise<void>
  search: (query: string) => Promise<void>
  
  deleteFact: (id: string) => Promise<void>
  promoteFact: (id: string) => Promise<void>
  deleteUniversal: (id: string) => Promise<void>
  
  addUniversalFact: (content: string) => Promise<void>
  toggleUniversalFact: (id: string) => Promise<void>
  updateUniversalFact: (id: string, content: string) => Promise<void>
  
  uploadDocument: (file: File) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  reprocessDocument: (id: string) => Promise<void>
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  facts: [],
  factsTotal: 0,
  universals: [],
  documents: [],
  searchResults: null,
  isLoading: false,
  isSearching: false,
  uploadProgress: 0,
  error: null,

  fetchFacts: async (offset = 0) => {
    set({ isLoading: true, error: null })
    try {
      const res = await memoryService.getFacts({ offset, limit: 50 })
      set({ facts: res.items, factsTotal: res.total })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch facts' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchUniversals: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await memoryService.getUniversals()
      set({ universals: res })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch universals' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchDocuments: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await memoryService.getDocuments()
      set({ documents: res })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch documents' })
    } finally {
      set({ isLoading: false })
    }
  },

  search: async (query: string) => {
    if (!query.trim()) return
    set({ isSearching: true, error: null })
    try {
      const res = await memoryService.search(query)
      set({ searchResults: res })
    } catch (err: any) {
      set({ error: err.message || 'Search failed' })
    } finally {
      set({ isSearching: false })
    }
  },

  deleteFact: async (id: string) => {
    const previousFacts = get().facts
    const previousTotal = get().factsTotal
    set({ facts: previousFacts.filter((f) => f.id !== id), factsTotal: previousTotal - 1 })
    try {
      await memoryService.deleteFact(id)
    } catch (err: any) {
      set({ facts: previousFacts, factsTotal: previousTotal, error: 'Failed to delete fact' })
    }
  },

  deleteUniversal: async (id: string) => {
    const previousUniversals = get().universals
    set({ universals: previousUniversals.filter((u) => u.id !== id) })
    try {
      await memoryService.deleteUniversal(id)
    } catch (err: any) {
      set({ universals: previousUniversals, error: 'Failed to delete universal fact' })
    }
  },

  deleteDocument: async (id: string) => {
    const previousDocs = get().documents
    set({ documents: previousDocs.filter((d) => d.id !== id) })
    try {
      await memoryService.deleteDocument(id)
    } catch (err: any) {
      set({ documents: previousDocs, error: 'Failed to delete document' })
    }
  },

  promoteFact: async (id: string) => {
    try {
      const newUniversal = await memoryService.promoteFact(id)
      set((state) => ({ 
        universals: [newUniversal, ...state.universals],
        facts: state.facts.map(f => f.id === id ? { ...f, is_universal: true } : f)
      }))
    } catch (err: any) {
      set({ error: 'Failed to promote fact' })
    }
  },

  uploadDocument: async (file: File) => {
    set({ uploadProgress: 0, error: null })
    try {
      const newDoc = await memoryService.uploadDocument(file, (progress) => {
        set({ uploadProgress: progress })
      })
      set((state) => ({ documents: [newDoc, ...state.documents] }))
    } catch (err: any) {
      set({ error: err.message || 'Failed to upload document' })
    } finally {
      setTimeout(() => set({ uploadProgress: 0 }), 1000)
    }
  },

  reprocessDocument: async (id: string) => {
    try {
      const updatedDoc = await memoryService.reprocessDocument(id)
      set((state) => ({
        documents: state.documents.map((d) => (d.id === id ? updatedDoc : d)),
      }))
    } catch (err: any) {
      set({ error: 'Failed to reprocess document' })
    }
  },

  addUniversalFact: async (content: string) => {
    const tempId = `temp-${Date.now()}`
    const newFact: UniversalFact = {
      id: tempId, content, source: 'manual', origin_id: null,
      is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }
    set((state) => ({ universals: [newFact, ...state.universals] }))
    try {
      const realFact = await memoryService.addUniversal(content)
      set((state) => ({ universals: state.universals.map((u) => (u.id === tempId ? realFact : u)) }))
    } catch (err: any) {
      set((state) => ({ universals: state.universals.filter((u) => u.id !== tempId), error: 'Failed to add fact' }))
    }
  },

  toggleUniversalFact: async (id: string) => {
    const prev = get().universals
    const fact = prev.find((u) => u.id === id)
    if (!fact) return

    const nextActive = !fact.is_active
    set({ universals: prev.map((u) => (u.id === id ? { ...u, is_active: nextActive } : u)) })
    try {
      await memoryService.updateUniversal(id, { is_active: nextActive })
    } catch (err: any) {
      set({ universals: prev, error: 'Failed to toggle fact' })
    }
  },

  updateUniversalFact: async (id: string, content: string) => {
    const prev = get().universals
    set({ universals: prev.map((u) => (u.id === id ? { ...u, content } : u)) })
    try {
      await memoryService.updateUniversal(id, { content })
    } catch (err: any) {
      set({ universals: prev, error: 'Failed to update fact' })
    }
  }
}))