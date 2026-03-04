import axiosInstance from '@/lib/axios'

export interface NotePayload {
  title?: string
  text?: string
}

export interface NoteResponse {
  id: string
  user_id: string
  title: string
  text: string
  created_at: string
  updated_at: string
}

export const notesService = {

  getAll: async (): Promise<NoteResponse[]> => {
    const res = await axiosInstance.get<NoteResponse[]>('/api/v1/notes')
    return res.data
  },

  create: async (data: NotePayload = {}): Promise<NoteResponse> => {
    const res = await axiosInstance.post<NoteResponse>('/api/v1/notes', {
      title: data.title ?? 'NOTE',
      text:  data.text  ?? '',
    })
    return res.data
  },

  update: async (id: string, data: NotePayload): Promise<NoteResponse> => {
    const res = await axiosInstance.patch<NoteResponse>(`/api/v1/notes/${id}`, data)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/notes/${id}`)
  },
}