import { SkipBack, Play, Pause, SkipForward } from 'lucide-react';

interface MusicControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const MusicControls = ({
  isPlaying,
  onPlay,
  onPause,
  onPrev,
  onNext,
}: MusicControlsProps) => {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={onPrev}
        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95"
        aria-label="Previous Track"
      >
        <SkipBack size={20} fill="currentColor" />
      </button>

      <button
        onClick={isPlaying ? onPause : onPlay}
        className="p-3 bg-white text-surface-950 hover:bg-white/90 hover:scale-105 rounded-full transition-all active:scale-95 shadow-md"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause size={24} fill="currentColor" />
        ) : (
          <Play size={24} fill="currentColor" className="ml-1" />
        )}
      </button>

      <button
        onClick={onNext}
        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95"
        aria-label="Next Track"
      >
        <SkipForward size={20} fill="currentColor" />
      </button>
    </div>
  );
};

export default MusicControls;