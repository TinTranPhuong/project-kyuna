import axiosInstance from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

const API = '/api/v1/code-workspace';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CodingSessionListItem {
  id: string;
  title: string;
  file_count: number;
  created_at: string;
  last_active: string;
}

export interface CodingSessionDetail {
  id: string;
  user_id: string;
  title: string;
  file_tree: Record<string, { size: number; lang: string }>;
  chat_history: Array<{ role: string; content: string }>;
  created_at: string;
  last_active: string;
}

export interface FileReadResponse {
  path: string;
  content: string;
  lang: string;
}

// ── API Functions ────────────────────────────────────────────────────────────

export async function createSession(title: string = 'Untitled Project'): Promise<CodingSessionDetail> {
  const res = await axiosInstance.post(`${API}/sessions`, { title });
  return res.data;
}

export async function listSessions(): Promise<CodingSessionListItem[]> {
  const res = await axiosInstance.get(`${API}/sessions`);
  return res.data;
}

export async function getSession(sessionId: string): Promise<CodingSessionDetail> {
  const res = await axiosInstance.get(`${API}/sessions/${sessionId}`);
  return res.data;
}

export async function uploadFiles(sessionId: string, files: FileList | File[]): Promise<{ uploaded: number; file_tree: Record<string, any> }> {
  const formData = new FormData();
  for (const file of Array.from(files)) {
    // Use webkitRelativePath for directory structure, fallback to name
    const relativePath = (file as any).webkitRelativePath || file.name;
    formData.append(relativePath, file);
  }
  const res = await axiosInstance.post(`${API}/sessions/${sessionId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function readFile(sessionId: string, path: string): Promise<FileReadResponse> {
  const res = await axiosInstance.get(`${API}/sessions/${sessionId}/files/${path}`);
  return res.data;
}

export async function writeFile(sessionId: string, path: string, content: string): Promise<void> {
  await axiosInstance.put(`${API}/sessions/${sessionId}/files/${path}`, { content });
}

export async function deleteFile(sessionId: string, path: string): Promise<void> {
  await axiosInstance.delete(`${API}/sessions/${sessionId}/files/${path}`);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await axiosInstance.delete(`${API}/sessions/${sessionId}`);
}

export function getDownloadUrl(sessionId: string): string {
  return `${axiosInstance.defaults.baseURL || ''}${API}/sessions/${sessionId}/download`;
}

export async function renameSession(sessionId: string, title: string): Promise<CodingSessionDetail> {
  const res = await axiosInstance.patch(`${API}/sessions/${sessionId}`, { title });
  return res.data;
}

export async function getChatHistory(sessionId: string): Promise<Array<{ role: string; content: string }>> {
  const res = await axiosInstance.get(`${API}/sessions/${sessionId}/chat-history`);
  return res.data.messages || [];
}

export async function saveChatHistory(sessionId: string, messages: Array<{ role: string; content: string }>): Promise<void> {
  await axiosInstance.put(`${API}/sessions/${sessionId}/chat-history`, { messages });
}

// ── SSE Streaming for Coding Chat ────────────────────────────────────────────

export async function* sendCodingMessageStream(
  sessionId: string,
  message: string,
  activeFile: string,
  signal?: AbortSignal
): AsyncGenerator<any, void, unknown> {
  const token = useAuthStore.getState().token;
  const baseUrl = axiosInstance.defaults.baseURL || '';
  const url = `${baseUrl}${API}/sessions/${sessionId}/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message, active_file: activeFile }),
    signal,
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          yield data;
        } catch {
          // skip malformed JSON
        }
      }
    }
  }
}
