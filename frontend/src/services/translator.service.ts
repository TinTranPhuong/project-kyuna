import axiosInstance from '@/lib/axios'
import type {
  TranslationJob,
  TranslationJobDetail,
} from '@/types/translator.types'

// Re-export canonical types so callers import from one place
export type { TranslationJob, TranslationJobDetail }

/**
 * Translator service.
 *
 * Backend router prefix: /api/v1/translate  (NOT /api/v1/translator)
 * See: backend/app/main.py →
 *   app.include_router(translator.router, prefix="/api/v1/translate", tags=["translator"])
 *
 * Endpoints (backend/app/routers/translator.py):
 *   POST /upload                            — upload file, start job
 *   GET  /jobs                              — list user's jobs
 *   GET  /jobs/{id}                         — job detail + pages
 *   POST /jobs/{id}/retranslate             — re-run translation
 *   DELETE /jobs/{id}                       — delete job + files
 *   GET  /jobs/{id}/pages/{num}/original    — original image (FileResponse)
 *   GET  /jobs/{id}/pages/{num}/translated  — translated image (FileResponse)
 *   GET  /jobs/{id}/download               — ZIP of all translated pages
 */
export const translatorService = {

  /**
   * POST /api/v1/translate/upload
   *
   * Sends a multipart/form-data request with the file and language settings.
   * The backend saves the file, creates the job record, and immediately returns
   * the job (status: 'pending') — processing happens in a background task.
   *
   * Do NOT set Content-Type manually — axios sets it automatically with the
   * correct multipart boundary when the body is a FormData instance.
   */
  uploadFile: async (
    file: File,
    sourceLanguage: string,
    targetLanguage: string,
    onProgress?: (pct: number) => void,
  ): Promise<TranslationJob> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('source_language', sourceLanguage)
    formData.append('target_language', targetLanguage)

    const response = await axiosInstance.post<TranslationJob>(
      '/api/v1/translate/upload',
      formData,
      {
        onUploadProgress: progressEvent => {
          if (onProgress && progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(pct)
          }
        },
      },
    )
    return response.data
  },

  /** GET /api/v1/translate/jobs */
  getJobs: async (): Promise<TranslationJob[]> => {
    const response = await axiosInstance.get<TranslationJob[]>('/api/v1/translate/jobs')
    return response.data
  },

  /** GET /api/v1/translate/jobs/:id */
  getJob: async (id: string): Promise<TranslationJobDetail> => {
    const response = await axiosInstance.get<TranslationJobDetail>(
      `/api/v1/translate/jobs/${id}`,
    )
    return response.data
  },

  /** POST /api/v1/translate/jobs/:id/retranslate */
  retranslate: async (id: string): Promise<TranslationJob> => {
    const response = await axiosInstance.post<TranslationJob>(
      `/api/v1/translate/jobs/${id}/retranslate`,
    )
    return response.data
  },

  /**
   * GET /api/v1/translate/jobs/:id/download
   * Returns a Blob — caller creates an object URL and triggers a browser download.
   */
  downloadZip: async (id: string): Promise<Blob> => {
    const response = await axiosInstance.get(`/api/v1/translate/jobs/${id}/download`, {
      responseType: 'blob',
    })
    return response.data
  },

  /** DELETE /api/v1/translate/jobs/:id */
  deleteJob: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/translate/jobs/${id}`)
  },

  /**
   * Returns the absolute URL for a single translated or original page image.
   *
   * The backend exposes two separate routes (not a single route with a ?type= param):
   *   GET /api/v1/translate/jobs/{id}/pages/{num}/original
   *   GET /api/v1/translate/jobs/{id}/pages/{num}/translated
   *
   * These return a FileResponse — use as <img src={url} /> directly.
   * The browser will attach the Authorization header automatically because the
   * request goes through the Nginx proxy (not a cross-origin fetch).
   * If your deployment requires explicit auth headers on image requests,
   * replace <img src> with a custom hook that fetches → creates an objectURL.
   */
  getPageUrl: (
    jobId: string,
    page: number,
    type: 'original' | 'translated',
  ): string => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    return `${baseUrl}/api/v1/translate/jobs/${jobId}/pages/${page}/${type}`
  },
}