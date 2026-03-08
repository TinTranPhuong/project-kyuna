import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, ListMusic, ChevronDown, ChevronRight, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore, type MusicGroup } from '@/store/settingsStore';
import { cn } from '@/lib/utils';
import YouTubeEmbed, { type YouTubePlayerRef } from './YouTubeEmbed';

export const MusicPlayer = () => {
  const musicUrl = useSettingsStore(state => state.musicUrl);
  const setMusicUrl = useSettingsStore(state => state.setMusicUrl);
  const musicGroups = useSettingsStore(state => state.musicGroups);

  const playerRef = useRef<YouTubePlayerRef>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [currentTrackTitle, setCurrentTrackTitle] = useState('Kyuna Radio');
  const [channelName, setChannelName] = useState('Kyuna');
  const [thumbnail, setThumbnail] = useState('');

  const [showPlaylists, setShowPlaylists] = useState(false);

  // NEW: State to track which playlists are dropped down
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // NEW: Shuffle state
  const [isShuffle, setIsShuffle] = useState(false);

  useEffect(() => {
    if (musicUrl) setIsPlaying(true);
  }, [musicUrl]);

  const handleTogglePlay = () => {
    if (!musicUrl) return;
    if (isPlaying) playerRef.current?.pause(); else playerRef.current?.play();
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    playerRef.current?.setVolume(newVolume);
  };

  const handleCustomNext = () => {
    for (const group of musicGroups) {
      const currentIndex = group.links.findIndex(l => l.url === musicUrl);
      if (currentIndex !== -1) {
        let nextIndex;
        if (isShuffle) {
          nextIndex = Math.floor(Math.random() * group.links.length);
        } else {
          nextIndex = (currentIndex + 1) % group.links.length;
        }
        setMusicUrl(group.links[nextIndex].url);
        setIsPlaying(true);
        setTimeout(() => playerRef.current?.play(), 300);
        return;
      }
    }
    playerRef.current?.nextTrack?.();
    setIsPlaying(true);
    setTimeout(() => playerRef.current?.play(), 300);
  };

  const handleCustomPrev = () => {
    for (const group of musicGroups) {
      const currentIndex = group.links.findIndex(l => l.url === musicUrl);
      if (currentIndex !== -1) {
        let prevIndex;
        if (isShuffle) {
          prevIndex = Math.floor(Math.random() * group.links.length);
        } else {
          prevIndex = currentIndex - 1 < 0 ? group.links.length - 1 : currentIndex - 1;
        }
        setMusicUrl(group.links[prevIndex].url);
        setIsPlaying(true);
        setTimeout(() => playerRef.current?.play(), 300);
        return;
      }
    }
    playerRef.current?.prevTrack?.();
    setIsPlaying(true);
    setTimeout(() => playerRef.current?.play(), 300);
  };

  // Accordion Toggle
  const toggleGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Strict Auto-Play Triggers
  const handlePlayGroup = (group: MusicGroup, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (group.links.length > 0) {
      setMusicUrl(group.links[0].url);
      setIsPlaying(true);
      setShowPlaylists(false);
      setTimeout(() => playerRef.current?.play(), 300);
    }
  };

  const handlePlaySong = (url: string) => {
    setMusicUrl(url);
    setIsPlaying(true);
    setShowPlaylists(false);
    setTimeout(() => playerRef.current?.play(), 300);
  };

  return (
    <div className="relative w-full flex items-center justify-between pointer-events-none">

      <YouTubeEmbed
        ref={playerRef}
        url={musicUrl}
        isPlaying={isPlaying}
        volume={volume}
        onStateChange={(state) => {
          if (state === 1) setIsPlaying(true);
          if (state === 2) setIsPlaying(false);
          if (state === 0) handleCustomNext();
        }}
        onTrackInfo={(title, channel, thumb) => {
          setCurrentTrackTitle(title);
          setChannelName(channel);
          setThumbnail(thumb);
        }}
      />

      <div className="flex-1 flex justify-start pr-4">
        <div className={cn(
          "flex items-center gap-3 shrink-0 h-14 pointer-events-auto",
          "bg-black/30 backdrop-blur-2xl border border-white/10 rounded-full",
          "p-1.5 pr-6 shadow-2xl w-max"
        )}>
          <div className="w-11 h-11 rounded-full overflow-hidden bg-white/5 shrink-0 shadow-inner flex items-center justify-center">
            {thumbnail ? (
              <img src={thumbnail} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <Music className="w-5 h-5 text-white/30" />
            )}
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-sm font-bold text-white whitespace-nowrap">{currentTrackTitle}</span>
            <span className="text-[11px] font-medium text-white/50 whitespace-nowrap tracking-wide">{channelName}</span>
          </div>
        </div>
      </div>

      <div className="shrink-0 pointer-events-auto">
        <div className={cn(
          "flex items-center gap-3 md:gap-4 shrink-0 h-14",
          "bg-black/30 backdrop-blur-2xl border border-white/10 rounded-full",
          "px-4 md:px-6 py-2 shadow-2xl"
        )}>

          <div className="relative flex items-center justify-center">
            <button
              onClick={() => setShowPlaylists(!showPlaylists)}
              className={cn(
                "p-2 hover:text-white transition-colors rounded-full mr-1",
                showPlaylists ? "text-primary-400 bg-white/10" : "text-white/60 hover:bg-white/5"
              )}
              title="Playlists"
            >
              <ListMusic size={16} />
            </button>

            <AnimatePresence>
              {showPlaylists && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPlaylists(false)} />

                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl z-50"
                  >
                    <div className="max-h-80 overflow-y-auto custom-scrollbar p-1">
                      {musicGroups.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-white/40 text-center italic">
                          No playlists yet.<br />Create one in Settings!
                        </div>
                      ) : (
                        musicGroups.map(group => {
                          const isExpanded = expandedGroups[group.id];
                          return (
                            <div key={group.id} className="mb-2 last:mb-1 bg-white/5 rounded-xl overflow-hidden border border-white/5">

                              {/* --- Dropdown Accordion Header --- */}
                              <div
                                onClick={(e) => toggleGroup(group.id, e)}
                                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors select-none"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className="text-white/40 shrink-0">
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </div>
                                  <span className="text-xs font-bold text-white/80 uppercase tracking-widest truncate">
                                    {group.name} <span className="text-[10px] font-normal text-white/40 normal-case">({group.links.length})</span>
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => handlePlayGroup(group, e)}
                                  className="p-1.5 rounded-md text-white bg-primary-600 hover:bg-primary-500 shadow-sm transition-all shrink-0 ml-2"
                                  title={`Play ${group.name} from beginning`}
                                >
                                  <Play size={10} fill="currentColor" className="ml-0.5" />
                                </button>
                              </div>

                              {/* --- Expanding Song List --- */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <div className="p-1.5 bg-black/20 border-t border-white/5">
                                      {group.links.length === 0 ? (
                                        <div className="px-2 py-2 text-[10px] text-white/30 italic text-center">Empty playlist</div>
                                      ) : (
                                        group.links.map(link => {
                                          const isActive = musicUrl === link.url;
                                          return (
                                            <button
                                              key={link.id}
                                              onClick={() => handlePlaySong(link.url)}
                                              className={cn(
                                                "w-full text-left px-2 py-1.5 rounded-lg transition-colors flex items-center gap-2.5 group/item",
                                                isActive ? "bg-primary-500/10 text-primary-400" : "hover:bg-white/10 text-white/80"
                                              )}
                                            >
                                              {isActive ? (
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0 shadow-[0_0_8px_rgba(var(--primary-400),0.8)]" />
                                              ) : (
                                                <div className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0 group-hover/item:bg-white/40 transition-colors" />
                                              )}
                                              <span className="text-xs truncate font-medium">{link.title}</span>
                                            </button>
                                          );
                                        })
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleTogglePlay}
            className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-md shrink-0"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>

          <div className="flex items-center gap-2 md:gap-3 text-white/60 shrink-0">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={cn(
                "hover:text-white transition-colors active:scale-95",
                isShuffle && "text-primary-400 hover:text-primary-300"
              )}
              title="Toggle Shuffle"
            >
              <Shuffle size={14} strokeWidth={isShuffle ? 3 : 2} />
            </button>
            <button onClick={handleCustomPrev} className="hover:text-white transition-colors active:scale-95"><SkipBack size={16} fill="currentColor" /></button>
            <button onClick={handleCustomNext} className="hover:text-white transition-colors active:scale-95"><SkipForward size={16} fill="currentColor" /></button>
          </div>

          <div className="w-px h-6 bg-white/10 mx-1 hidden md:block shrink-0"></div>

          <button
            onClick={() => handleVolumeChange(volume === 0 ? 50 : 0)}
            className="text-white/60 hover:text-white transition-colors shrink-0"
          >
            {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <input
            type="range"
            min="0" max="100" value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="h-1.5 w-16 md:w-24 rounded-full appearance-none cursor-pointer outline-none transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full shrink-0"
            style={{ background: `linear-gradient(to right, white ${volume}%, rgba(255,255,255,0.2) ${volume}%)` }}
          />
        </div>
      </div>

      <div className="flex-1 flex justify-end pointer-events-none"></div>

    </div>
  );
};

export default MusicPlayer;