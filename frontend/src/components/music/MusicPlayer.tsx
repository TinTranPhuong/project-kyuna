import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2, Volume2, VolumeX, Music } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';

// We will implement these two child components next
import YouTubeEmbed, { YouTubePlayerRef } from './YouTubeEmbed';
import MusicControls from './MusicControls';

export const MusicPlayer = () => {
  // Retrieve the user's saved Lo-Fi/Music URL from settings
  const musicUrl = useSettingsStore((state) => state.musicUrl);
  const playerRef = useRef<YouTubePlayerRef>(null);

  // Local session state (does not persist across reloads, as requested)
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  
  // Track metadata (will be populated by the YouTube API inside YouTubeEmbed)
  const [currentTrackTitle, setCurrentTrackTitle] = useState('Loading track info...');
  const [channelName, setChannelName] = useState('YouTube Music');
  const [thumbnail, setThumbnail] = useState('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=150&auto=format&fit=crop');

  return (
    <>
      {/* Hidden YouTube Player 
        This renders the iframe out of sight, but keeps the JS Player API active
      */}
      <div className="hidden">
        <YouTubeEmbed 
          ref={playerRef}
          url={musicUrl} 
          isPlaying={isPlaying} 
          volume={volume}
          onStateChange={(state) => {
            // 1 = playing, 2 = paused in YT API
            if (state === 1) setIsPlaying(true);
            if (state === 2) setIsPlaying(false);
          }}
          onTrackInfo={(title, channel, thumb) => {
            setCurrentTrackTitle(title);
            setChannelName(channel);
            setThumbnail(thumb);
          }}
        />
      </div>

      <AnimatePresence>
        {!isMinimized ? (
          /* --- Maximized Glass Bar --- */
          <motion.div
            key="maximized-player"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.1, duration: 0.6 }}
            className={cn(
              "fixed bottom-0 left-[64px] right-0 h-20 z-30 px-6",
              "bg-surface-950/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]",
              "flex items-center justify-between"
            )}
          >
            {/* Left: Track Info & Thumbnail */}
            <div className="flex items-center gap-4 w-1/3">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-surface-800 shrink-0 shadow-md border border-white/5">
                <img src={thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center mix-blend-overlay" />
                )}
              </div>
              <div className="flex flex-col overflow-hidden whitespace-nowrap">
                <span className="text-sm font-bold text-white truncate">{currentTrackTitle}</span>
                <span className="text-xs text-white/50 truncate">{channelName}</span>
              </div>
            </div>

            {/* Center: Playback Controls */}
            <div className="w-1/3 flex justify-center">
              <MusicControls 
                isPlaying={isPlaying} 
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onPrev={() => playerRef.current?.prevTrack()}
                onNext={() => playerRef.current?.nextTrack()}
              />
            </div>

            {/* Right: Volume & Minimize */}
            <div className="flex items-center justify-end gap-6 w-1/3">
              <div className="flex items-center gap-2 group">
                <button 
                  onClick={() => setVolume(volume === 0 ? 50 : 0)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                {/* Custom styled range slider for volume */}
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className={cn(
                    "w-24 h-1 bg-white/10 rounded-full appearance-none outline-none cursor-pointer",
                    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3",
                    "[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                  )}
                />
              </div>
              
              <div className="w-px h-8 bg-white/10" />

              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                aria-label="Minimize Player"
              >
                <Minimize2 size={18} />
              </button>
            </div>
          </motion.div>
        ) : (
          /* --- Minimized Floating Bubble --- */
          <motion.button
            key="minimized-player"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMinimized(false)}
            className={cn(
              "fixed bottom-6 right-6 w-14 h-14 z-40 outline-none flex items-center justify-center",
              "rounded-full bg-primary-600 text-white shadow-2xl border border-white/20"
            )}
            aria-label="Maximize Player"
          >
            {isPlaying ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Music size={24} />
              </motion.div>
            ) : (
              <Music size={24} />
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

export default MusicPlayer;