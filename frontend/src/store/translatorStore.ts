import { create } from 'zustand'
import { translatorService } from '@/services/translator.service'
import type { TranslationJob, TranslationJobDetail } from '@/services/translator.service'

export type { TranslationJob }

// ─── State Interface ──────────────────────────────────────────────────────────

interface TranslatorState {
  jobs: TranslationJob[]
  activeJobId: string | null   // matches spec field name
  currentPage: number
  totalPages: number
  isUploading: boolean
  uploadProgress: number        // 0–100
  sourceLanguage: string
  targetLanguage: string
  showOriginal: boolean

  // Actions
  loadJobs: () => Promise<void>
  uploadFile: (file: File, onProgress?: (pct: number) => void) => Promise<void>
  selectJob: (id: string) => void
  pollJobStatus: (id: string) => Promise<void>
  nextPage: () => void
  prevPage: () => void
  goToPage: (n: number) => void
  retranslate: (id: string) => Promise<void>
  downloadZip: (id: string) => Promise<void>
  deleteJob: (id: string) => Promise<void>
  toggleShowOriginal: () => void
  setSourceLanguage: (lang: string) => void
  setTargetLanguage: (lang: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive totalPages from the job object.
 * A completed job has a `pages` array (TranslationJobDetail); a fresh upload
 * or list-view job uses `page_count`. Always fall back to 1.
 */
function getTotalPages(job: TranslationJob | TranslationJobDetail): number {
  if ('pages' in job && Array.isArray(job.pages) && job.pages.length > 0) {
    return job.pages.length
  }
  return job.page_count || 1
}

/**
 * Trigger a browser file download from a Blob without opening a new tab.
 * Creates a temporary object URL, clicks it programmatically, then revokes.
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Revoke after a short delay to let the browser start the download
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
    set({ isUploading: true, uploadProgress: 0 })
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
      }))
    } catch (error) {
      set({ isUploading: false })
      console.error('Upload failed:', error)
    }
  },

  // ─── Selection ─────────────────────────────────────────────────────────────

  selectJob: (id) => {
    const job = get().jobs.find(j => j.id === id)
    set({
      activeJobId: id,
      currentPage: 1,
      totalPages: job ? getTotalPages(job) : 1,
      showOriginal: false,
    })
  },

  // ─── Polling ───────────────────────────────────────────────────────────────

  /**
   * Called every 2 seconds by TranslatorPage while job.status === 'processing'.
   * Uses getJob (returns TranslationJobDetail with pages array) so totalPages
   * updates progressively as pages are completed.
   */
  pollJobStatus: async (id) => {
    try {
      const updatedJob: TranslationJobDetail = await translatorService.getJob(id)

      set(state => ({
        jobs: state.jobs.map(j => j.id === id ? updatedJob : j),
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

  /**
   * POST /api/v1/translate/jobs/:id/retranslate
   * The backend re-runs translation using the job's stored settings —
   * no need to re-send sourceLanguage/targetLanguage, the backend has them.
   */
  retranslate: async (id) => {
    try {
      const updatedJob = await translatorService.retranslate(id)
      set(state => ({
        jobs: state.jobs.map(j => j.id === id ? updatedJob : j),
      }))
      // Start polling so the UI reflects progress
      void get().pollJobStatus(id)
    } catch (error) {
      console.error('Retranslate request failed:', error)
    }
  },

  /**
   * Downloads all translated pages as a ZIP file and triggers a browser download.
   * The service returns a Blob; this store handles the DOM-level download trigger.
   */
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
      set(state => ({
        jobs: state.jobs.filter(j => j.id !== id),
        activeJobId: state.activeJobId === id ? null : state.activeJobId,
      }))
    } catch (error) {
      console.error('Delete failed:', error)
    }
  },

  // ─── Toggles ───────────────────────────────────────────────────────────────

  toggleShowOriginal: () => set(state => ({ showOriginal: !state.showOriginal })),
  setSourceLanguage: (sourceLanguage) => set({ sourceLanguage }),
  setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
}))