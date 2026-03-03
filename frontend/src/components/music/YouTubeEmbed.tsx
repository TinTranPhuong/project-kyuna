import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface YouTubePlayerRef {
  play: () => void;
  pause: () => void;
  setVolume: (vol: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  getCurrentInfo: () => { title: string; thumbnail: string };
}

interface YouTubeEmbedProps {
  url: string;
  isPlaying: boolean;
  volume: number;
  onStateChange: (state: number) => void;
  onTrackInfo: (title: string, channel: string, thumb: string) => void;
}

export const YouTubeEmbed = forwardRef<YouTubePlayerRef, YouTubeEmbedProps>(
  ({ url, isPlaying, volume, onStateChange, onTrackInfo }, ref) => {
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isReadyRef = useRef(false);

    const extractId = (fullUrl: string) => {
      // 1. THE FIX: If the URL is empty, load a silent dummy video so the iframe doesn't crash permanently!
      if (!fullUrl) return { id: 'jfKfPfyJRdk', isPlaylist: false }; 
      try {
        const parsed = new URL(fullUrl);
        const list = parsed.searchParams.get('list');
        if (list) return { id: list, isPlaylist: true };
      } catch {}
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|\?v=)([^#&?]*).*/;
      const match = fullUrl.match(regExp);
      if (match && match[2].length === 11) return { id: match[2], isPlaylist: false };
      return { id: fullUrl || 'jfKfPfyJRdk', isPlaylist: false };
    };

    // --- INITIALIZE PLAYER EXACTLY ONCE ---
    useEffect(() => {
      if (!containerRef.current) return;

      containerRef.current.innerHTML = ''; 
      const ytDiv = document.createElement('div');
      containerRef.current.appendChild(ytDiv);

      const initPlayer = () => {
        const { id, isPlaylist } = extractId(url);

        playerRef.current = new window.YT.Player(ytDiv, {
          height: '10', 
          width: '10',  
          playerVars: {
            autoplay: 0, 
            controls: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1, // THE FIX: Explicitly turns on API remote control
            origin: window.location.origin,
            ...(isPlaylist ? { listType: 'playlist', list: id } : { videoId: id }),
          },
          events: {
            onReady: (event: any) => {
              isReadyRef.current = true;
              event.target.setVolume(volume);
              if (isPlaying) event.target.playVideo();
            },
            onStateChange: (event: any) => {
              onStateChange(event.data);
              if (event.data === 1 && playerRef.current?.getVideoData) {
                const data = playerRef.current.getVideoData();
                const title = data.title || 'Unknown Track';
                const channel = data.author || 'YouTube';
                const thumb = data.video_id ? `https://img.youtube.com/vi/${data.video_id}/hqdefault.jpg` : '';
                onTrackInfo(title, channel, thumb);
              }
            },
            onError: (e: any) => {
              console.error("YouTube Error:", e.data);
              // Only auto-skip if the error is 150 (copyright restricted) or 101/100 (not found)
              if (e.data === 150 || e.data === 101 || e.data === 100) {
                  if (playerRef.current?.nextVideo) playerRef.current.nextVideo();
              }
            },
          },
        });
      };

      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
        window.onYouTubeIframeAPIReady = () => initPlayer();
      } else {
        initPlayer();
      }

      return () => {
        if (playerRef.current?.destroy) playerRef.current.destroy();
        isReadyRef.current = false;
      };
    }, []); // <-- EMPTY DEPENDENCY ARRAY: Never destroys the iframe!

    // --- SEAMLESS TRACK SWITCHING ---
    useEffect(() => {
      if (isReadyRef.current && playerRef.current && url) {
        const { id, isPlaylist } = extractId(url);
        if (isPlaylist) {
          playerRef.current.loadPlaylist({ list: id });
        } else {
          // loadVideoById automatically plays the video!
          playerRef.current.loadVideoById(id);
        }
      }
    }, [url]);

    // --- REACT TO VOLUME ---
    useEffect(() => {
      if (isReadyRef.current && playerRef.current?.setVolume) {
        playerRef.current.setVolume(volume);
      }
    }, [volume]);

    // --- SMART PLAY/PAUSE (THE RACE CONDITION FIX) ---
    useEffect(() => {
      if (!isReadyRef.current || !playerRef.current) return;
      
      if (isPlaying) {
        const state = playerRef.current.getPlayerState?.();
        // Only trigger manual play if explicitly paused (2) or cued (5).
        // If state is 3 (buffering), we DO NOT interrupt it!
        if (state === 2 || state === 5) {
          playerRef.current.playVideo?.();
        }
      } else {
        playerRef.current.pauseVideo?.();
      }
    }, [isPlaying]);

    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.playVideo?.(),
      pause: () => playerRef.current?.pauseVideo?.(),
      setVolume: (vol: number) => playerRef.current?.setVolume?.(vol),
      nextTrack: () => playerRef.current?.nextVideo?.(),
      prevTrack: () => playerRef.current?.previousVideo?.(),
      getCurrentInfo: () => ({ title: 'Loading...', thumbnail: '' })
    }));

    return (
      <div 
        ref={containerRef} 
        className="absolute w-[10px] h-[10px] opacity-0 pointer-events-none overflow-hidden z-[-1]" 
        aria-hidden="true" 
      />
    );
  }
);

YouTubeEmbed.displayName = 'YouTubeEmbed';
export default YouTubeEmbed;