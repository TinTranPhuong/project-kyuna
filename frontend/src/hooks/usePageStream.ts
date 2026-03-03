import { useState, useEffect, useRef } from 'react'
import { useTranslatorStore } from '@/store/translatorStore'
import type { TranslationRegion, RegionStreamEvent } from '@/types/translator.types'
import { useAuthStore } from '@/store/authStore'

interface UsePageStreamResult {
  regions: TranslationRegion[]
  isDone: boolean
  isWaiting: boolean
  error: string | null
}

export function usePageStream(
  jobId: string | null,
  pageNumber: number
): UsePageStreamResult {
  const [regions, setRegions]     = useState<TranslationRegion[]>([])
  const [isDone, setIsDone]       = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  
  const sourceRef                 = useRef<EventSource | null>(null)
  
  // Note: Cast to 'any' temporarily until pageRegions is added to the TranslatorState interface
  const cachedRegions = useTranslatorStore(s => 
    jobId ? (s as any).pageRegions?.[pageNumber] : undefined
  ) as TranslationRegion[] | undefined

  const token   = useAuthStore(s => s.token)
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    // 1. Reset all state when jobId or pageNumber changes
    setRegions([])
    setIsDone(false)
    setIsWaiting(false)
    setError(null)

    // 2. If jobId is null, return early
    if (!jobId) return

    // 3. If cachedRegions is defined (page already processed): skip connection
    if (cachedRegions && cachedRegions.length > 0) {
      setRegions(cachedRegions)
      setIsDone(true)
      return
    }

    // 4. Setup AbortController for clean teardown on unmount / dependency change
    const abortController = new AbortController()

    const fetchStream = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/v1/translate/jobs/${jobId}/pages/${pageNumber}/stream`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream'
          },
          signal: abortController.signal
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          
          // Split chunks by newline, keeping the last incomplete fragment in the buffer
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() === '') continue
            
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim()
              if (!dataStr) continue

              try {
                const event = JSON.parse(dataStr) as RegionStreamEvent

                // Handle: { waiting: true }
                if ('waiting' in event && event.waiting) {
                  setIsWaiting(true)
                } 
                // Handle: Region arrival (has bbox)
                else if ('bbox' in event) {
                  setIsWaiting(false)
                  setRegions(prev => {
                    const next = [...prev]
                    next[event.index] = event // Sparse array assignment (handles out-of-order)
                    return next
                  })
                } 
                // Handle: { done: true } or { error: string, done: true }
                else if ('done' in event && event.done) {
                  if ('error' in event) {
                    setError(event.error)
                  }
                  setIsDone(true)
                  setIsWaiting(false)
                  reader.cancel()
                  return // Exit the loop and close stream
                }
              } catch (err) {
                console.error('Failed to parse SSE JSON event:', err, dataStr)
              }
            }
          }
        }
      } catch (err: any) {
        // Ignore AbortError since it's an expected teardown behavior
        if (err.name !== 'AbortError') {
          setError(err.message || 'Stream connection failed')
          setIsDone(true)
        }
      }
    }

    fetchStream()

    // 5. Cleanup: aborting the controller immediately cancels the fetch & reader
    return () => {
      abortController.abort()
    }
  }, [jobId, pageNumber, cachedRegions, baseUrl, token])

  return { regions, isDone, isWaiting, error }
}