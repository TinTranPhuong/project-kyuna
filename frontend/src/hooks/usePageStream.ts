import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useTranslatorStore } from '@/store/translatorStore'
import type { PhaseEvent, PhaseState, PipelineRegion } from '@/types/translator.types'

interface UsePhaseStreamResult {
  phases: PhaseState[]
  regions: PipelineRegion[]
  isDone: boolean
  isFailed: boolean
  errorMsg: string | null
}

const STAGE_NAMES = [
  '',
  'Detecting text regions',
  'Cropping bubbles',
  'Reading Japanese text',
  'Hangoff Protocol - loading Qwen 35B',
  'Translating with Qwen 35B',
  'Complete',
]

function initialPhases(): PhaseState[] {
  return STAGE_NAMES.slice(1).map((name, i) => ({
    stage: i + 1,
    name,
    status: 'waiting' as const,
  }))
}

export function usePhaseStream(
  jobId: string | null,
  pageNumber: number,
): UsePhaseStreamResult {
  const [phases, setPhases] = useState<PhaseState[]>(initialPhases())
  const [regions, setRegions] = useState<PipelineRegion[]>([])
  const [isDone, setIsDone] = useState(false)
  const [isFailed, setIsFailed] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const readerRef = useRef<ReadableStreamDefaultReader | null>(null)
  
  const cachedRegions = useTranslatorStore(s => jobId ? s.pageRegions[pageNumber] : undefined)
  const token = useAuthStore(s => s.token)
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    if (cachedRegions && cachedRegions.length > 0) {
      setRegions(cachedRegions as unknown as PipelineRegion[])
      setPhases(initialPhases().map(p => ({ ...p, status: 'done' })))
      setIsDone(true)
    }
  }, [cachedRegions])

  useEffect(() => {
    if (!jobId || (cachedRegions && cachedRegions.length > 0)) return

    setPhases(initialPhases())
    setRegions([])
    setIsDone(false)
    setIsFailed(false)
    setErrorMsg(null)

    let cancelled = false

    const connect = async () => {
      // THE FIX: Ensure we have a token before connecting
      if (!token) return;

      try {
        const response = await fetch(
          `${baseUrl}/api/v1/translate/jobs/${jobId}/pages/${pageNumber}/pipeline-progress`,
          {
            headers: {
              // THE FIX: Add Authorization header to stop 401 errors
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache',
            }
          }
        )

        if (!response.ok || !response.body) return

        const reader = response.body.getReader()
        readerRef.current = reader
        const decoder = new TextDecoder()
        let buffer = ''

        while (!cancelled) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6)) as PhaseEvent
              if ('waiting' in event) continue
              if ('stage' in event) {
                if (event.stage === 6 && event.status === 'done') {
                  const stage6Event = event as { stage: 6; regions: PipelineRegion[] }
                  setRegions(stage6Event.regions)
                  setPhases(initialPhases().map(p => ({ ...p, status: 'done' })))
                  setIsDone(true)
                  reader.cancel()
                  return
                }
                if (event.stage === 0 && event.status === 'failed') {
                  const failedEvent = event as { stage: 0; error: string }
                  setIsFailed(true)
                  setErrorMsg(failedEvent.error)
                  reader.cancel()
                  return
                }
                let detailText: string | undefined = undefined
                if ('region_count' in event && event.region_count !== undefined) {
                  detailText = `${event.region_count} bubbles`
                } else if ('done' in event && 'total' in event) {
                  detailText = `${event.done}/${event.total} bubbles`
                }
                setPhases(prev => prev.map(p =>
                  p.stage === event.stage
                    ? { ...p, status: event.status === 'running' ? 'running' : 'done', detail: detailText }
                    : p
                ))
              }
            } catch { }
          }
        }
      } catch { }
    }
    connect()
    return () => {
      cancelled = true
      readerRef.current?.cancel()
    }
  }, [jobId, pageNumber, token, baseUrl, cachedRegions])

  return { phases, regions, isDone, isFailed, errorMsg }
}