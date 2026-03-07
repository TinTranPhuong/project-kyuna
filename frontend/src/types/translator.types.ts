// Matches backend/app/schemas/translator.py → JobResponse
export interface TranslationJob {
  id: string
  user_id: string
  original_filename: string
  file_path: string
  file_size_bytes: number | null
  source_language: string
  target_language: string
  engine: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  // NOTE: pages is NOT included in list/upload responses (JobResponse).
  // Only TranslationJobDetail includes pages.
}

// Matches backend/app/schemas/translator.py → PageResponse
export interface TranslationPage {
  id: string
  job_id: string
  page_number: number
  original_path: string | null
  translated_path: string | null
  processing_status: 'pending' | 'processing' | 'completed' | 'no_text' | 'failed'
  phase_status: string | null
  has_text: boolean
  regions_json: string | null
  error_message: string | null
  processing_ms: number | null
}

// Matches backend/app/schemas/translator.py → JobDetailResponse
// This is what GET /jobs/{id} returns — includes pages array
export interface TranslationJobDetail extends TranslationJob {
  pages: TranslationPage[]
}