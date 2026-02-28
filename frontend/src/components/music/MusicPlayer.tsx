import { useState, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
// import { cn } from '@/lib/utils';
import YouTubeEmbed, { YouTubePlayerRef } from './YouTubeEmbed';

export const MusicPlayer = () => {
  const musicUrl = useSettingsStore((state) => state.musicUrl);
  const playerRef = useRef<YouTubePlayerRef>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  
  // Track metadata (Optional: can be used for tooltips later)
  const [currentTrackTitle, setCurrentTrackTitle] = useState('Loading track info...');
  const [channelName, setChannelName] = useState('YouTube Music');

  const togglePlay = () => {
    // If your YouTubeEmbed ref exposes play/pause methods, we call them,
    // otherwise we just toggle the state and let the embed react.
    if (isPlaying) {
      if (playerRef.current && 'pause' in playerRef.current) (playerRef.current as any).pause();
      setIsPlaying(false);
    } else {
      if (playerRef.current && 'play' in playerRef.current) (playerRef.current as any).play();
      setIsPlaying(true);
    }
  };

  return (
    <>
      {/* Hidden YouTube Player (Keeps the JS Player API active in the background) */}
      <div className="hidden">
        <YouTubeEmbed 
          ref={playerRef}
          url={musicUrl} 
          isPlaying={isPlaying} 
          volume={volume}
          onStateChange={(state) => {
            if (state === 1) setIsPlaying(true);
            if (state === 2) setIsPlaying(false);
          }}
          onTrackInfo={(title, channel) => {
            setCurrentTrackTitle(title);
            setChannelName(channel);
          }}
        />
      </div>

      {/* --- Sleek Floating Glass Pill --- */}
      <div className="mx-auto flex items-center gap-4 px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-2xl w-fit hover:bg-black/50 transition-colors duration-300">
        
        {/* Play/Pause Button */}
        <button 
          onClick={togglePlay}
          className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shrink-0 shadow-lg"
          title={currentTrackTitle !== 'Loading track info...' ? `${currentTrackTitle} - ${channelName}` : 'Play/Pause'}
        >
          {isPlaying ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} className="ml-0.5" fill="currentColor" />
          )}
        </button>

        {/* Playback & Volume Controls */}
        <div className="flex items-center gap-2.5 text-white/70 shrink-0">
          <button 
            onClick={() => playerRef.current?.prevTrack?.()} 
            className="hover:text-white transition-colors"
          >
            <SkipBack size={14} fill="currentColor" />
          </button>
          
          <button 
            onClick={() => playerRef.current?.nextTrack?.()} 
            className="hover:text-white transition-colors"
          >
            <SkipForward size={14} fill="currentColor" />
          </button>
          
          <button 
            onClick={() => setVolume(volume === 0 ? 50 : 0)} 
            className="hover:text-white transition-colors ml-1.5"
          >
            {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>

        {/* Progress Bar & Time */}
        <div className="flex items-center gap-3 w-48 md:w-64 ml-1">
          <div className="h-1 flex-1 bg-white/20 rounded-full relative cursor-pointer group">
            {/* Simulated progress width (Update this if YouTubeEmbed passes current time) */}
            <div className="absolute top-0 left-0 h-full bg-white w-1/3 rounded-full transition-all duration-1000"></div>
            <div className="absolute top-1/2 -translate-y-1/2 left-1/3 w-2.5 h-2.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          {/* Simulated static time (Update this if YouTubeEmbed passes video length) */}
          <span className="text-[10px] text-white/60 font-mono tracking-wider shrink-0">
            {isPlaying ? "Live" : "0:00"}
          </span>
        </div>
        
      </div>
    </>
  );
};

export default MusicPlayer;