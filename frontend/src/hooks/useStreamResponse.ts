import { useState, useRef, useCallback } from 'react';

interface UseStreamOptions {
  url: string;
  body: object;
  headers?: Record<string, string>;
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * Hook to handle Server-Sent Events (SSE) streams for real-time token rendering.
 */
export function useStreamResponse() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const stream = useCallback(async (options: UseStreamOptions) => {
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();
    let accumulatedText = '';

    try {
      const response = await fetch(options.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(options.body),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported in this environment.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the binary chunk into text and split by line
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();

          // Sentinel value indicating the stream is finished
          if (data === '[DONE]') {
            options.onComplete(accumulatedText);
            setIsStreaming(false);
            return;
          }

          try {
            // Parse the JSON token emitted by the backend
            const parsed = JSON.parse(data) as { token?: string };
            if (parsed.token) {
              accumulatedText += parsed.token;
              options.onToken(parsed.token);
            }
          } catch (e) {
            // Skip malformed JSON without crashing the stream
            console.warn('Failed to parse stream token:', data);
          }
        }
      }

      // Fallback in case the stream ends without a [DONE] signal
      options.onComplete(accumulatedText);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream intentionally aborted by user.');
      } else {
        options.onError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, []);

  return { stream, abort, isStreaming };
}

export default useStreamResponse;