import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─── Tailwind ─────────────────────────────────────────────────────────────────

/**
 * Merges Tailwind CSS classes, resolving conflicts correctly.
 * e.g. cn('p-2', 'p-4') → 'p-4'  (tailwind-merge deduplicates)
 * e.g. cn('bg-red', isActive && 'bg-green') → handles falsy values (clsx)
 *
 * Use this in every component's className prop to allow clean overrides.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ─── Time Formatting ──────────────────────────────────────────────────────────

/**
 * Formats a duration in seconds to MM:SS.
 * Used by the Pomodoro timer display.
 * e.g. formatTime(90)   → "01:30"
 * e.g. formatTime(1500) → "25:00"
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Formats a duration in seconds to HH:MM:SS.
 * Used by the Stopwatch display and the Dashboard total focus stats.
 * e.g. formatTimeLong(3661) → "01:01:01"
 */
export function formatTimeLong(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}

/**
 * Converts a relative timestamp to a human-readable string.
 * Used in the ConversationList and ActivityFeed components.
 * e.g. timeAgo(new Date()) → "just now"
 * e.g. timeAgo("2024-01-01") → "3 months ago"
 */
export function timeAgo(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'

  const intervals: ReadonlyArray<[string, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]

  for (const [unit, secondsInUnit] of intervals) {
    const value = Math.floor(diffInSeconds / secondsInUnit)
    if (value >= 1) {
      return `${value} ${unit}${value > 1 ? 's' : ''} ago`
    }
  }

  return 'just now'
}

// ─── Size Formatting ──────────────────────────────────────────────────────────

/**
 * Formats raw bytes to a human-readable size string.
 * Used to show AI model file sizes in the ModelSelector and Settings page.
 * e.g. formatBytes(4_900_000_000) → "4.56 GB"
 * e.g. formatBytes(0)            → "0 Bytes"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// ─── String Utilities ─────────────────────────────────────────────────────────

/**
 * Truncates a string and appends an ellipsis if it exceeds maxLength.
 * Used for conversation titles and filename labels throughout the UI.
 * e.g. truncate("Hello World", 7) → "Hello W..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Capitalizes the first letter of a string.
 * Guards against empty input and non-string types.
 * e.g. capitalize("hello") → "Hello"
 */
export function capitalize(s: string): string {
  if (!s || s.length === 0) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── YouTube ──────────────────────────────────────────────────────────────────

/**
 * Describes the result of parsing a YouTube URL.
 *
 * `type: 'video'`    → use as `<iframe src="...?v={id}">` or `YT.Player({ videoId: id })`
 * `type: 'playlist'` → use as `<iframe src="...?listType=playlist&list={id}">` or `{ list: id }`
 *
 * The YouTube embed API treats video IDs and playlist IDs differently,
 * so callers need to know which they received.
 */
export interface YouTubeSource {
  type: 'video' | 'playlist'
  id: string
}

/**
 * Parses a YouTube URL and extracts either a video ID or playlist ID.
 * Returns null if the URL is not a recognised YouTube URL format.
 *
 * Supports:
 *   Video URLs:
 *     https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *     https://youtu.be/dQw4w9WgXcQ
 *     https://www.youtube.com/embed/dQw4w9WgXcQ
 *   Playlist URLs:
 *     https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxx
 *     https://www.youtube.com/watch?v=xxx&list=PLxxxxxxxxxxxxxxxx  (extracts playlist)
 *
 * NOTE: When a URL contains BOTH a video ID and a playlist ID (watch?v=x&list=PL...),
 * the playlist ID takes priority — because the MusicPlayer plays the full playlist,
 * not just a single track.
 */
export function extractYouTubeSource(url: string): YouTubeSource | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace(/^www\./, '')

    // ── Playlist check (highest priority) ────────────────────────────────────
    // Covers:
    //   youtube.com/playlist?list=PLxxx
    //   youtube.com/watch?v=xxx&list=PLxxx  (mixed URL → treat as playlist)
    const listParam = parsed.searchParams.get('list')
    if (listParam && listParam.length > 0) {
      return { type: 'playlist', id: listParam }
    }

    // ── Short URL: youtu.be/VIDEO_ID ─────────────────────────────────────────
    if (hostname === 'youtu.be') {
      const videoId = parsed.pathname.slice(1)   // remove leading "/"
      if (videoId.length === 11) {
        return { type: 'video', id: videoId }
      }
      return null
    }

    // ── Standard video URL ───────────────────────────────────────────────────
    // Covers:
    //   youtube.com/watch?v=VIDEO_ID
    //   youtube.com/embed/VIDEO_ID
    //   youtube.com/v/VIDEO_ID
    if (hostname === 'youtube.com') {
      // watch?v= parameter
      const vParam = parsed.searchParams.get('v')
      if (vParam && vParam.length === 11) {
        return { type: 'video', id: vParam }
      }

      // /embed/ID or /v/ID path
      const pathMatch = parsed.pathname.match(/^\/(embed|v)\/([a-zA-Z0-9_-]{11})/)
      if (pathMatch) {
        return { type: 'video', id: pathMatch[2] }
      }
    }

    return null
  } catch {
    // URL constructor throws on malformed input — treat as invalid
    return null
  }
}

/**
 * @deprecated Use `extractYouTubeSource` instead, which correctly
 * handles playlist URLs and returns a typed result.
 *
 * This legacy shim returns only the video ID string for backward compatibility
 * with any code written against the old signature. It returns null for playlists.
 */
export function extractYouTubeId(url: string): string | null {
  const source = extractYouTubeSource(url)
  if (source?.type === 'video') return source.id
  return null
}

// ─── Function Utilities ───────────────────────────────────────────────────────

/**
 * Returns a debounced version of `fn` that delays invocation until
 * `delay` milliseconds have passed since the last call.
 *
 * Useful for search inputs, window resize listeners, and autosave triggers.
 * e.g. const debouncedSearch = debounce(handleSearch, 300)
 */
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>
  return function (this: unknown, ...args: unknown[]) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  } as T
}