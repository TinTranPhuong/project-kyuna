export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type PageStatus = 'pending' | 'processing' | 'done' | 'no_text' | 'failed'
export type OverlayMode = 'dots' | 'text' | 'original'

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
  engine?: 'pipeline' | 'ocr_llm'
}

export interface TranslationRegion {
  index: number
  bbox: [number, number, number, number]
  original: string
  translated: string
  center?: [number, number];
  type: 'dialogue' | 'sfx' | 'narration' | 'title'
}

// THE FIX: Define this type so the Store accepts it
export interface PipelineRegion {
  index: number
  bbox: [number, number, number, number]
  japanese: string
  english: string
}

export interface TranslationPage {
  id: string
  job_id: string
  page_number: number
  has_text: boolean
  processing_status: PageStatus
  error_message: string | null
  // THE FIX: Allow both region types
  regions: TranslationRegion[] | PipelineRegion[] | null
  phase_status?: 'pending' | 'detecting' | 'cropping' | 'ocr' | 'translating' | 'done' | 'failed'
  regions_json?: string | null
}

export interface TranslationJobDetail extends TranslationJob {
  pages: TranslationPage[]
}

export type PhaseStatus = 'waiting' | 'running' | 'done' | 'failed'

export interface PhaseState {
  stage: number
  name: string
  status: PhaseStatus
  detail?: string
}

export type PhaseEvent =
  | { stage: 1 | 2 | 3 | 4 | 5; name: string; status: 'running' | 'done'; region_count?: number; done?: number; total?: number }
  | { stage: 6; name: 'Complete'; status: 'done'; regions: PipelineRegion[] }
  | { stage: 0; name: 'Failed'; status: 'failed'; error: string }
  | { waiting: true }