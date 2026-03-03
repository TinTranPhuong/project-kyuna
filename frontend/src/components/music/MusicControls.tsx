import { SkipBack, Play, Pause, SkipForward, Volume2, VolumeX } from 'lucide-react';

interface MusicControlsProps {
  isPlaying: boolean;
  volume: number;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onVolumeChange: (v: number) => void;
}

export const MusicControls = ({
  isPlaying,
  volume,
  onTogglePlay,
  onPrev,
  onNext,
  onVolumeChange,
}: MusicControlsProps) => {
  return (
    <div className="flex flex-col items-center gap-8 w-full">
      
      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPrev}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95"
          aria-label="Previous Track"
        >
          <SkipBack size={20} fill="currentColor" />
        </button>

        <button
          onClick={onTogglePlay}
          className="p-4 bg-white text-black hover:bg-white/90 hover:scale-105 rounded-full transition-all active:scale-95 shadow-xl"
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

      {/* Volume Slider */}
      <div className="flex items-center gap-3 w-full max-w-[200px] text-white/50">
        <button 
          onClick={() => onVolumeChange(volume === 0 ? 50 : 0)} 
          className="hover:text-white transition-colors p-1"
        >
          {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer outline-none hover:bg-white/30 transition-colors [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
        />
      </div>

    </div>
  );
};

export default MusicControls;