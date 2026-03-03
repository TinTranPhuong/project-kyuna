import { create } from 'zustand'
import { translatorService } from '@/services/translator.service'
import type { TranslationJobDetail } from '@/services/translator.service'
import type { TranslationJob, TranslationRegion, PipelineRegion, OverlayMode } from '@/types/translator.types'

export type { TranslationJob }

// ─── State Interface ──────────────────────────────────────────────────────────

interface TranslatorState {
  jobs: TranslationJob[]
  activeJobId: string | null
  currentPage: number
  totalPages: number
  isUploading: boolean
  uploadProgress: number        // 0-100
  sourceLanguage: string
  targetLanguage: string
  showOriginal: boolean
  showOverlay: boolean          // Controls visibility of the overlay container
  
  // NEW: 3-way overlay mode (dots | text | original)
  overlayMode: OverlayMode
  
  // Caches regions by page_number
  pageRegions: Record<number, (TranslationRegion | PipelineRegion)[]>

  // Actions
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
  
  toggleShowOriginal: () => void
  toggleShowOverlay: () => void
  setOverlayMode: (mode: OverlayMode) => void  // <--- NEW
  
  setSourceLanguage: (lang: string) => void
  setTargetLanguage: (lang: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Store ────────────────────────────────────────────────────────────────────

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
  
  // NEW: Default to 'dots' mode
  overlayMode: 'dots',
  
  pageRegions: {},

  // ─── Load ──────────────────────────────────────────────────────────────────

  loadJobs: async () => {
    try {
      const jobs = await translatorService.getJobs()
      set({ jobs })
    } catch (error) {
      console.error('Failed to load translation jobs:', error)
    }
  },

  // ─── Upload ────────────────────────────────────────────────────────────────

  uploadFile: async (file, onProgress) => {
    // Reset pageRegions and overlayMode for the new job
    set({ isUploading: true, uploadProgress: 0, pageRegions: {}, overlayMode: 'dots' })
    
    const { sourceLanguage, targetLanguage } = get()

    try {
      const newJob = await translatorService.uploadFile(
        file,
        sourceLanguage,
        targetLanguage,
        (pct) => {
          set({ uploadProgress: pct })
          onProgress?.(pct)
        },
      )

      set(state => ({
        jobs: [newJob, ...state.jobs],
        activeJobId: newJob.id,
        totalPages: getTotalPages(newJob),
        currentPage: 1,
        isUploading: false,
        pageRegions: {},
        overlayMode: 'dots' // Ensure consistent state
      }))
    } catch (error) {
      set({ isUploading: false })
      console.error('Upload failed:', error)
    }
  },

  // ─── Selection ─────────────────────────────────────────────────────────────

  selectJob: async (id) => {
    const job = get().jobs.find(j => j.id === id)
    set({
      activeJobId: id,
      currentPage: 1,
      totalPages: job ? getTotalPages(job) : 1,
      showOriginal: false,
      pageRegions: {}, 
    })

    try {
      const jobDetail = await translatorService.getJob(id)
      const pageRegions: Record<number, (TranslationRegion | PipelineRegion)[]> = {}
      
      for (const page of jobDetail.pages ?? []) {
        if (page.regions && page.regions.length > 0) {
          pageRegions[page.page_number] = page.regions
        }
      }
      
      set({ pageRegions })
    } catch (error) {
      console.error('Failed to fetch job details for region caching:', error)
    }
  },

  // ─── Polling ───────────────────────────────────────────────────────────────

  pollJobStatus: async (id) => {
    try {
      const updatedJob: TranslationJobDetail = await translatorService.getJob(id)
      
      const newPageRegions = { ...get().pageRegions }
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

  // ─── Pagination ────────────────────────────────────────────────────────────

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

  // ─── Actions ───────────────────────────────────────────────────────────────

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

  // ─── Toggles ───────────────────────────────────────────────────────────────

  toggleShowOriginal: () => set(state => ({ showOriginal: !state.showOriginal })),
  toggleShowOverlay: () => set(state => ({ showOverlay: !state.showOverlay })),
  
  // NEW: Set exact overlay mode
  setOverlayMode: (mode) => set({ overlayMode: mode }),
  
  setSourceLanguage: (sourceLanguage) => set({ sourceLanguage }),
  setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
}))