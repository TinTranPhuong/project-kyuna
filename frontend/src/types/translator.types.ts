export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type PageStatus = 'pending' | 'processing' | 'done' | 'no_text' | 'failed'

export interface TranslationJob {
  id: string
  original_filename: string
  status: JobStatus
  source_language: string
  target_language: string
  page_count: number
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface TranslationPage {
  id: string
  job_id: string
  page_number: number
  has_text: boolean
  processing_status: PageStatus
  error_message: string | null
}

export interface TranslationJobDetail extends TranslationJob {
  pages: TranslationPage[]
}