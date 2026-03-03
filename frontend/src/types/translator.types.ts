export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type PageStatus = 'pending' | 'processing' | 'done' | 'no_text' | 'failed'

// NEW: The 3-way toggle state
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
  bbox: [number, number, number, number]  // [x1, y1, x2, y2] pixel coords
  original: string
  translated: string
  center?: [number, number];
  type: 'dialogue' | 'sfx' | 'narration' | 'title'
}

export type RegionType = TranslationRegion['type']

// A single translated bubble region (Pipeline)
export interface PipelineRegion {
  index: number
  bbox: [number, number, number, number]  // [x1, y1, x2, y2] original image px
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
  // Union type preserves legacy fallback while supporting the new pipeline
  regions: TranslationRegion[] | PipelineRegion[] | null
  phase_status?: 'pending' | 'detecting' | 'cropping' | 'ocr' | 'translating' | 'done' | 'failed'
}

export interface TranslationJobDetail extends TranslationJob {
  pages: TranslationPage[]
}

// Stage status for the PhaseProgress UI component
export type PhaseStatus = 'waiting' | 'running' | 'done' | 'failed'

export interface PhaseState {
  stage: number      // 1-6
  name: string
  status: PhaseStatus
  detail?: string    // e.g. "8/12 bubbles" for Stage 3
}

// Union type for all possible SSE events from /stream endpoint (Legacy)
export type RegionStreamEvent =
  | (TranslationRegion & { index: number })         // a region arriving
  | { done: true; total_regions: number; page_number: number }  // stream complete
  | { waiting: true }                                // page still processing
  | { error: string; done: true }                    // page failed

// Union type for SSE events from /pipeline-progress (New Pipeline)
export type PhaseEvent =
  | { stage: 1 | 2 | 3 | 4 | 5; name: string; status: 'running' | 'done'; region_count?: number; done?: number; total?: number }
  | { stage: 6; name: 'Complete'; status: 'done'; regions: PipelineRegion[] }
  | { stage: 0; name: 'Failed'; status: 'failed'; error: string }
  | { waiting: true }