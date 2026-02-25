import { create } from 'zustand';
import { translatorService, TranslationJob } from '@/services/translator.service';

interface TranslatorState {
  jobs: TranslationJob[];
  activeJobId: string | null;
  currentPage: number;
  totalPages: number;
  isUploading: boolean;
  uploadProgress: number;
  sourceLanguage: string;
  targetLanguage: string;
  showOriginal: boolean;

  // Actions
  loadJobs: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  selectJob: (id: string) => void;
  pollJobStatus: (id: string) => Promise<void>;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (n: number) => void;
  retranslate: (id: string) => Promise<void>;
  downloadZip: (id: string) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  toggleShowOriginal: () => void;
  setSourceLanguage: (lang: string) => void;
  setTargetLanguage: (lang: string) => void;
}

export const useTranslatorStore = create<TranslatorState>((set, get) => ({
  jobs: [],
  activeJobId: null,
  currentPage: 1,
  totalPages: 1,
  isUploading: false,
  uploadProgress: 0,
  sourceLanguage: 'auto',
  targetLanguage: 'en',
  showOriginal: false,

  loadJobs: async () => {
    try {
      const jobs = await translatorService.getJobs();
      set({ jobs });
    } catch (error) {
      console.error('Failed to load translation jobs', error);
    }
  },

  uploadFile: async (file: File) => {
    set({ isUploading: true, uploadProgress: 0 });
    
    try {
      const { sourceLanguage, targetLanguage } = get();
      const newJob = await translatorService.upload(file, sourceLanguage, targetLanguage, (progress) => {
        set({ uploadProgress: progress });
      });

      set((state) => ({
        jobs: [newJob, ...state.jobs],
        activeJobId: newJob.id,
        isUploading: false,
        totalPages: newJob.pages?.length || 1,
        currentPage: 1
      }));
    } catch (error) {
      set({ isUploading: false });
      console.error('Upload failed', error);
    }
  },

  selectJob: (id) => {
    const job = get().jobs.find(j => j.id === id);
    set({ 
      activeJobId: id, 
      currentPage: 1, 
      totalPages: job?.pages?.length || 1,
      showOriginal: false 
    });
  },

  pollJobStatus: async (id) => {
    try {
      const updatedJob = await translatorService.getJobStatus(id);
      
      set((state) => ({
        jobs: state.jobs.map(j => j.id === id ? updatedJob : j),
        // Update total pages if they were processed/extracted during the poll
        totalPages: updatedJob.id === state.activeJobId ? (updatedJob.pages?.length || 1) : state.totalPages
      }));
    } catch (error) {
      console.error('Polling error', error);
    }
  },

  nextPage: () => {
    const { currentPage, totalPages } = get();
    if (currentPage < totalPages) set({ currentPage: currentPage + 1 });
  },

  prevPage: () => {
    const { currentPage } = get();
    if (currentPage > 1) set({ currentPage: currentPage - 1 });
  },

  goToPage: (n) => {
    const { totalPages } = get();
    if (n >= 1 && n <= totalPages) set({ currentPage: n });
  },

  retranslate: async (id) => {
    try {
      const { sourceLanguage, targetLanguage } = get();
      await translatorService.retranslate(id, sourceLanguage, targetLanguage);
      // Trigger immediate poll to update UI to 'processing'
      get().pollJobStatus(id);
    } catch (error) {
      console.error('Retranslate request failed', error);
    }
  },

  downloadZip: async (id) => {
    try {
      await translatorService.downloadResults(id);
    } catch (error) {
      console.error('Download failed', error);
    }
  },

  deleteJob: async (id) => {
    try {
      await translatorService.deleteJob(id);
      set((state) => ({
        jobs: state.jobs.filter(j => j.id !== id),
        activeJobId: state.activeJobId === id ? null : state.activeJobId
      }));
    } catch (error) {
      console.error('Delete failed', error);
    }
  },

  toggleShowOriginal: () => set((state) => ({ showOriginal: !state.showOriginal })),
  
  setSourceLanguage: (sourceLanguage) => set({ sourceLanguage }),
  setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
}));