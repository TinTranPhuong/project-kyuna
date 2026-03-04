import { create } from 'zustand'
import { notesService } from '@/services/notes.service'

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

  loadNotes: () => Promise<void>

  setManagerOpen: (isOpen: boolean) => void
  openNote: (id: string) => void
  closeNote: (id: string) => void

  addNote: () => Promise<void>
  updateNote: (id: string, text: string) => Promise<void>
  updateNoteTitle: (id: string, title: string) => Promise<void>
  removeNote: (id: string) => Promise<void>
}

export const useNoteStore = create<NoteStore>((set) => ({
  notes: [],
  isManagerOpen: false,
  isLoading: false,

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

  setManagerOpen: (isOpen) => set({ isManagerOpen: isOpen }),

  openNote: (id) => set(state => ({
    notes: state.notes.map(n => n.id === id ? { ...n, isOpen: true } : n),
  })),

  closeNote: (id) => set(state => ({
    notes: state.notes.map(n => n.id === id ? { ...n, isOpen: false } : n),
  })),

  addNote: async () => {
    // Show the notepad instantly with a temp ID — don't wait for the API
    const tempId = `temp-${Date.now()}`
    set(state => ({
      notes: [{ id: tempId, title: 'NOTE', text: '', isOpen: true }, ...state.notes],
    }))
    try {
      const created = await notesService.create({ title: 'NOTE', text: '' })
      // Swap the temp ID for the real DB UUID
      set(state => ({
        notes: state.notes.map(n => n.id === tempId ? { ...created, isOpen: true } : n),
      }))
    } catch (err) {
      console.error('Failed to save note to backend:', err)
      // Remove the optimistic note so state stays consistent
      set(state => ({ notes: state.notes.filter(n => n.id !== tempId) }))
    }
  },

  updateNote: async (id, text) => {
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