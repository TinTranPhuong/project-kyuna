import { create } from 'zustand';
import { translatorService } from '@/services/translator.service';
import type { TranslationJob, TranslationJobDetail } from '@/types/translator.types';

export type OverlayMode = 'dots' | 'text' | 'original';

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

  // Fields PageViewer reads — were missing, causing blank page crash
  overlayMode: OverlayMode;
  pageRegions: Record<number, any[]>;  // keyed by page number

  // Actions
  loadJobs: () => Promise<void>;
  uploadFile: (file: File, onProgress?: (percent: number) => void) => Promise<void>;
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
  setOverlayMode: (mode: OverlayMode) => void;
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
  overlayMode: 'dots',      // default overlay — dots mode
  pageRegions: {},           // populated by pollJobStatus when job completes

  loadJobs: async () => {
    try {
      const jobs = await translatorService.getJobs();
      set({ jobs });
    } catch (error) {
      console.error('Failed to load translation jobs', error);
    }
  },

  uploadFile: async (file: File, onProgress?: (percent: number) => void) => {
    set({ isUploading: true, uploadProgress: 0 });
    try {
      const { sourceLanguage, targetLanguage } = get();
      const newJob = await translatorService.uploadFile(file, sourceLanguage, targetLanguage, (progress) => {
        set({ uploadProgress: progress });
        if (onProgress) onProgress(progress);
      });

      set((state) => ({
        jobs: [newJob, ...state.jobs],
        activeJobId: newJob.id,
        isUploading: false,
        totalPages: 1,
        currentPage: 1,
        pageRegions: {},
      }));

      // Fetch full detail immediately so totalPages is accurate
      get().pollJobStatus(newJob.id);

    } catch (error) {
      set({ isUploading: false });
      console.error('Upload failed', error);
    }
  },

  selectJob: (id) => {
    set({
      activeJobId: id,
      currentPage: 1,
      totalPages: 1,
      showOriginal: false,
      pageRegions: {},
    });
    get().pollJobStatus(id);
  },

  pollJobStatus: async (id) => {
    try {
      const detail: TranslationJobDetail = await translatorService.getJob(id);

      // Extract regions per page from detail.pages so PageViewer can use them
      const pageRegions: Record<number, any[]> = {};
      if (detail.pages) {
        for (const page of detail.pages) {
          if (page.regions_json) {
            try {
              pageRegions[page.page_number] = JSON.parse(page.regions_json);
            } catch {
              pageRegions[page.page_number] = [];
            }
          }
        }
      }

      set((state) => ({
        jobs: state.jobs.map(j => j.id === id ? detail : j),
        totalPages: detail.id === state.activeJobId
          ? (detail.pages?.length || 1)
          : state.totalPages,
        pageRegions: detail.id === state.activeJobId
          ? pageRegions
          : state.pageRegions,
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
      await translatorService.retranslate(id);
      set({ pageRegions: {} });
      get().pollJobStatus(id);
    } catch (error) {
      console.error('Retranslate request failed', error);
    }
  },

  downloadZip: async (id) => {
    try {
      const blob = await translatorService.downloadZip(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translated_${id}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
    }
  },

  deleteJob: async (id) => {
    try {
      await translatorService.deleteJob(id);
      set((state) => ({
        jobs: state.jobs.filter(j => j.id !== id),
        activeJobId: state.activeJobId === id ? null : state.activeJobId,
        pageRegions: state.activeJobId === id ? {} : state.pageRegions,
      }));
    } catch (error) {
      console.error('Delete failed', error);
    }
  },

  setOverlayMode: (mode) => set({ overlayMode: mode }),
  toggleShowOriginal: () => set((state) => ({ showOriginal: !state.showOriginal })),
  setSourceLanguage: (sourceLanguage) => set({ sourceLanguage }),
  setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
}));

export type { TranslationJob, TranslationJobDetail };