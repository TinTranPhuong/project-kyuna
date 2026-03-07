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
        // Do NOT set Content-Type manually — axios sets it automatically with
        // the correct multipart boundary when the body is a FormData instance.
        // Manually setting it would omit the boundary and break server parsing.
        headers: {
          'Content-Type': undefined,
        },
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
    // Await the deletion but do NOT try to return or parse response.data
    // since a 204 No Content response has no body.
    await axiosInstance.delete(`/api/v1/translate/jobs/${id}`);
  },

  /**
   * GET /api/v1/translate/jobs/:id/pages/:num/:type
   * CRITICAL: Fetches the image as a Blob so our Axios interceptors can inject the 
   * Authorization: Bearer token header. Returns the raw blob data.
   */
  getPageBlob: async (
    jobId: string,
    page: number,
    type: 'original' | 'translated',
  ): Promise<Blob> => {
    // Note: The /api/v1 prefix is correctly included here
    const response = await axiosInstance.get(
      `/api/v1/translate/jobs/${jobId}/pages/${page}/${type}`,
      { responseType: 'blob' } // Must tell Axios to expect a file blob, not JSON
    )
    return response.data
  },
}