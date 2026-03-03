import { create } from 'zustand'
import { translatorService } from '@/services/translator.service'
import { useAuthStore } from '@/store/authStore'
import type { TranslationJobDetail } from '@/services/translator.service'
import type { TranslationJob, TranslationRegion, PipelineRegion, OverlayMode } from '@/types/translator.types'

export type { TranslationJob }

interface TranslatorState {
  jobs: TranslationJob[]
  activeJobId: string | null
  currentPage: number
  totalPages: number
  isUploading: boolean
  uploadProgress: number
  sourceLanguage: string
  targetLanguage: string
  showOriginal: boolean
  showOverlay: boolean 
  overlayMode: OverlayMode
  showDots: boolean
  
  pageRegions: Record<number, (TranslationRegion | PipelineRegion)[]>

  loadJobs: () => Promise<void>
  uploadFile: (file: File, onProgress?: (pct: number) => void) => Promise<void>
  selectJob: (id: string) => Promise<void>
  pollJobStatus: (id: string) => Promise<void>
  nextPage: () => void
  prevPage: () => void
  goToPage: (n: number) => void
  retranslate: (id: string) => Promise<void>
  downloadZip: (id: string) => Promise<void>
  deleteJob: (id: string) => Promise<void>
  // --- NEW RENAME ACTION ---
  renameJob: (id: string, newName: string) => Promise<void>
  
  toggleShowOriginal: () => void
  toggleShowOverlay: () => void
  toggleShowDots: () => void
  setOverlayMode: (mode: OverlayMode) => void
  setSourceLanguage: (lang: string) => void
  setTargetLanguage: (lang: string) => void
}

function getTotalPages(job: TranslationJob | TranslationJobDetail): number {
  if ('pages' in job && Array.isArray(job.pages) && job.pages.length > 0) {
    return job.pages.length
  }
  return job.page_count || 1
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const useTranslatorStore = create<TranslatorState>((set, get) => ({
  jobs: [],
  activeJobId: null,
  currentPage: 1,
  totalPages: 1,
  isUploading: false,
  uploadProgress: 0,
  sourceLanguage: 'auto',
  targetLanguage: 'en',
  showOriginal: false,
  showOverlay: true,
  overlayMode: 'dots',
  showDots: true,
  pageRegions: {},

  loadJobs: async () => {
    try {
      const jobs = await translatorService.getJobs()
      set({ jobs })
    } catch (error) {
      console.error('Failed to load translation jobs:', error)
    }
  },

  uploadFile: async (file, onProgress) => {
    set({ isUploading: true, uploadProgress: 0, pageRegions: {}, overlayMode: 'dots' })
    const { sourceLanguage, targetLanguage } = get()
    try {
      const newJob = await translatorService.uploadFile(
        file, sourceLanguage, targetLanguage,
        (pct) => { set({ uploadProgress: pct }); onProgress?.(pct) }
      )
      set(state => ({
        jobs: [newJob, ...state.jobs],
        activeJobId: newJob.id,
        totalPages: getTotalPages(newJob),
        currentPage: 1,
        isUploading: false,
        pageRegions: {},
        overlayMode: 'dots'
      }))
    } catch (error) {
      set({ isUploading: false })
      console.error('Upload failed:', error)
    }
  },

  selectJob: async (id) => {
    if (!id) {
      set({
        activeJobId: null,
        currentPage: 1,
        totalPages: 1,
        showOriginal: false,
        pageRegions: {},
      });
      return;
    }

    const job = get().jobs.find(j => j.id === id)
    set({
      activeJobId: id,
      currentPage: 1,
      totalPages: job ? getTotalPages(job) : 1,
      showOriginal: false,
      pageRegions: {},
    })
    await get().pollJobStatus(id);
  },

  pollJobStatus: async (id) => {
    try {
      const token = useAuthStore.getState().token;
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${baseUrl}/api/v1/translate/jobs/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      const updatedJob: TranslationJobDetail = await response.json();
      
      const newPageRegions: Record<number, (TranslationRegion | PipelineRegion)[]> = { ...get().pageRegions }
      
      for (const page of updatedJob.pages ?? []) {
        if (page.regions && page.regions.length > 0) {
          newPageRegions[page.page_number] = page.regions
        }
      }

      set(state => ({
        jobs: state.jobs.map(j => j.id === id ? updatedJob : j),
        pageRegions: newPageRegions,
        ...(state.activeJobId === id && {
          totalPages: getTotalPages(updatedJob),
        }),
      }))
    } catch (error) {
      console.error('Polling error:', error)
    }
  },

  nextPage: () => {
    const { currentPage, totalPages } = get()
    if (currentPage < totalPages) set({ currentPage: currentPage + 1 })
  },

  prevPage: () => {
    const { currentPage } = get()
    if (currentPage > 1) set({ currentPage: currentPage - 1 })
  },

  goToPage: (n) => {
    const { totalPages } = get()
    if (n >= 1 && n <= totalPages) set({ currentPage: n })
  },

  retranslate: async (id) => {
    try {
      const updatedJob = await translatorService.retranslate(id)
      set(state => ({
        jobs: state.jobs.map(j => j.id === id ? updatedJob : j),
        pageRegions: state.activeJobId === id ? {} : state.pageRegions
      }))
      void get().pollJobStatus(id)
    } catch (error) {
      console.error('Retranslate request failed:', error)
    }
  },

  downloadZip: async (id) => {
    const job = get().jobs.find(j => j.id === id)
    const filename = job ? `${job.original_filename.replace(/\.[^/.]+$/, '')}_translated.zip` : 'translated.zip'
    try {
      const blob = await translatorService.downloadZip(id)
      triggerBlobDownload(blob, filename)
    } catch (error) {
      console.error('Download failed:', error)
    }
  },

  deleteJob: async (id) => {
    try {
      await translatorService.deleteJob(id)
      set(state => {
        const isActiveJob = state.activeJobId === id;
        return {
          jobs: state.jobs.filter(j => j.id !== id),
          activeJobId: isActiveJob ? null : state.activeJobId,
          pageRegions: isActiveJob ? {} : state.pageRegions,
        }
      })
    } catch (error) {
      console.error('Delete failed:', error)
    }
  },

  // --- NEW RENAME IMPLEMENTATION ---
  renameJob: async (id, newName) => {
    // 1. Optimistic UI update
    set(state => ({
      jobs: state.jobs.map(j => j.id === id ? { ...j, original_filename: newName } : j)
    }))

    try {
      const token = useAuthStore.getState().token
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      
      await fetch(`${baseUrl}/api/v1/translate/jobs/${id}/rename`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      })
    } catch (error) {
      console.error("Failed to rename job:", error)
      // Note: We leave the optimistic update as is, 
      // but in a production app you might want to revert it here.
    }
  },

  toggleShowOriginal: () => set(state => ({ showOriginal: !state.showOriginal })),
  toggleShowOverlay: () => set(state => ({ showOverlay: !state.showOverlay })),
  
  toggleShowDots: () => set(state => {
    const newMode = state.overlayMode === 'dots' ? 'original' : 'dots';
    return { overlayMode: newMode, showDots: newMode === 'dots' }
  }),
  
  setOverlayMode: (mode) => set({ overlayMode: mode, showDots: mode === 'dots' }),
  setSourceLanguage: (lang) => set({ sourceLanguage: lang }),
  setTargetLanguage: (lang) => set({ targetLanguage: lang }),
}))