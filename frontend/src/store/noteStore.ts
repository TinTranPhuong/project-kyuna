import { create } from 'zustand'
import { notesService } from '@/services/notes.service'

// is_open is pure UI state — not stored in the DB.
// Notes always load as closed; users open them from the manager.
export interface Note {
  id: string
  title: string
  text: string
  isOpen: boolean
}

interface NoteStore {
  notes: Note[]
  isManagerOpen: boolean
  isLoading: boolean

  // Lifecycle
  loadNotes: () => Promise<void>

  // UI
  setManagerOpen: (isOpen: boolean) => void
  openNote: (id: string) => void
  closeNote: (id: string) => void

  // CRUD (synced to PostgreSQL)
  addNote: () => Promise<void>
  updateNote: (id: string, text: string) => Promise<void>
  updateNoteTitle: (id: string, title: string) => Promise<void>
  removeNote: (id: string) => Promise<void>
}

export const useNoteStore = create<NoteStore>((set) => ({
  notes: [],
  isManagerOpen: false,
  isLoading: false,

  // ── Load all notes from backend on app init ────────────────────────────────
  loadNotes: async () => {
    set({ isLoading: true })
    try {
      const remote = await notesService.getAll()
      set({
        notes: remote.map(n => ({ ...n, isOpen: false })),
        isLoading: false,
      })
    } catch (err) {
      console.error('Failed to load notes:', err)
      set({ isLoading: false })
    }
  },

  // ── Pure UI state (no API call needed) ────────────────────────────────────
  setManagerOpen: (isOpen) => set({ isManagerOpen: isOpen }),

  openNote: (id) => set(state => ({
    notes: state.notes.map(n => n.id === id ? { ...n, isOpen: true } : n),
  })),

  closeNote: (id) => set(state => ({
    notes: state.notes.map(n => n.id === id ? { ...n, isOpen: false } : n),
  })),

  // ── CRUD — all changes go to PostgreSQL ───────────────────────────────────

  addNote: async () => {
    try {
      const created = await notesService.create({ title: 'NOTE', text: '' })
      set(state => ({
        notes: [{ ...created, isOpen: true }, ...state.notes],
      }))
    } catch (err) {
      console.error('Failed to create note:', err)
    }
  },

  updateNote: async (id, text) => {
    // Optimistic update
    set(state => ({
      notes: state.notes.map(n => n.id === id ? { ...n, text } : n),
    }))
    try {
      await notesService.update(id, { text })
    } catch (err) {
      console.error('Failed to update note text:', err)
    }
  },

  updateNoteTitle: async (id, title) => {
    // Optimistic update
    set(state => ({
      notes: state.notes.map(n => n.id === id ? { ...n, title } : n),
    }))
    try {
      await notesService.update(id, { title })
    } catch (err) {
      console.error('Failed to update note title:', err)
    }
  },

  removeNote: async (id) => {
    // Optimistic update — close + remove from list
    set(state => ({
      notes: state.notes.filter(n => n.id !== id),
    }))
    try {
      await notesService.delete(id)
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  },
}))