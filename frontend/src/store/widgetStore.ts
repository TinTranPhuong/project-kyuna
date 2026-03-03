import { create } from 'zustand';

interface WidgetState {
  isYoutubeOpen: boolean;
  isCalculatorOpen: boolean;
  setYoutubeOpen: (isOpen: boolean) => void;
  setCalculatorOpen: (isOpen: boolean) => void;
}

export const useWidgetStore = create<WidgetState>((set) => ({
  isYoutubeOpen: false,
  isCalculatorOpen: false,
  setYoutubeOpen: (isOpen) => set({ isYoutubeOpen: isOpen }),
  setCalculatorOpen: (isOpen) => set({ isCalculatorOpen: isOpen }),
}));