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
}

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

export interface TranslationJobDetail extends TranslationJob {
  pages: TranslationPage[]
}

// ── UI Types & Pipeline Streaming ──────────────────────────────────────────

export type OverlayMode = 'dots' | 'text' | 'original';

export interface PipelineRegion {
  index: number;
  bbox: [number, number, number, number];
  japanese: string;
  english?: string;
}

export type PhaseStatus = 'waiting' | 'running' | 'done' | 'failed';

export interface PhaseState {
  stage: number;
  name: string;
  status: PhaseStatus;
  detail?: string;
}

export type PhaseEvent =
  | { waiting: boolean }
  | { stage: 0; status: 'failed'; error: string }
  | { stage: 1 | 2 | 3 | 4 | 5; status: 'running' | 'done'; region_count?: number; done?: number; total?: number }
  | { stage: 6; status: 'done'; regions: PipelineRegion[] };