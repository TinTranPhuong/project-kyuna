import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Note {
  id: string;
  title: string;
  text: string;
  isOpen: boolean; // Tracks if the floating window is currently visible
}

interface NoteStore {
  notes: Note[];
  isManagerOpen: boolean;
  setManagerOpen: (isOpen: boolean) => void;
  addNote: () => void;
  updateNote: (id: string, text: string) => void;
  updateNoteTitle: (id: string, title: string) => void;
  closeNote: (id: string) => void; // Hides the note, but keeps it saved
  openNote: (id: string) => void;  // Shows the hidden note
  removeNote: (id: string) => void; // Actually deletes the note permanently
}

export const useNoteStore = create<NoteStore>()(
  persist(
    (set) => ({
      notes: [],
      isManagerOpen: false,
      setManagerOpen: (isOpen) => set({ isManagerOpen: isOpen }),
      addNote: () => set((state) => ({
        notes: [...state.notes, { id: Date.now().toString(), title: 'NOTE', text: '', isOpen: true }]
      })),
      updateNoteTitle: (id, title) => set((state) => ({
        notes: state.notes.map(n => n.id === id ? { ...n, title } : n)
      })),
      updateNote: (id, text) => set((state) => ({
        notes: state.notes.map(n => n.id === id ? { ...n, text } : n)
      })),
      closeNote: (id) => set((state) => ({
        notes: state.notes.map(n => n.id === id ? { ...n, isOpen: false } : n)
      })),
      openNote: (id) => set((state) => ({
        notes: state.notes.map(n => n.id === id ? { ...n, isOpen: true } : n)
      })),
      removeNote: (id) => set((state) => ({
        notes: state.notes.filter(n => n.id !== id)
      })),
    }),
    { name: 'kyuna-notes' }
  )
);