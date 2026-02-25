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

// 1. ADD THE MISSING PROPS TO THE INTERFACE
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

    const extractId = (fullUrl: string) => {
      try {
        const parsed = new URL(fullUrl);
        return parsed.searchParams.get('list') || parsed.searchParams.get('v') || fullUrl;
      } catch {
        return fullUrl;
      }
    };

    useEffect(() => {
      const initPlayer = () => {
        const playlistOrVideoId = extractId(url);
        const isPlaylist = url.includes('list=');

        playerRef.current = new window.YT.Player('yt-player', {
          height: '0',
          width: '0',
          playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            ...(isPlaylist ? { listType: 'playlist', list: playlistOrVideoId } : { videoId: playlistOrVideoId }),
          },
          events: {
            onReady: () => {
              // Apply initial volume
              playerRef.current.setVolume(volume);
            },
            onStateChange: (event: any) => {
              onStateChange(event.data);
              
              // 2. EXTRACT TRACK INFO WHEN VIDEO STARTS PLAYING (State 1)
              if (event.data === 1 && playerRef.current.getVideoData) {
                const data = playerRef.current.getVideoData();
                const title = data.title || 'Unknown Track';
                const channel = data.author || 'YouTube';
                const thumb = data.video_id ? `https://img.youtube.com/vi/${data.video_id}/hqdefault.jpg` : '';
                onTrackInfo(title, channel, thumb);
              }
            },
            onError: () => {
              if (playerRef.current?.nextVideo) {
                playerRef.current.nextVideo();
              }
            },
          },
        });
      };

      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
          initPlayer();
        };
      } else if (!playerRef.current) {
        initPlayer();
      }

      return () => {
        if (playerRef.current?.destroy) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      };
    }, [url]); // Re-init if URL changes

    // 3. REACT TO EXTERNAL VOLUME CHANGES
    useEffect(() => {
      if (playerRef.current?.setVolume) {
        playerRef.current.setVolume(volume);
      }
    }, [volume]);

    // 4. REACT TO EXTERNAL PLAY/PAUSE CHANGES
    useEffect(() => {
      if (!playerRef.current) return;
      if (isPlaying) {
        playerRef.current.playVideo?.();
      } else {
        playerRef.current.pauseVideo?.();
      }
    }, [isPlaying]);

    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      setVolume: (vol: number) => playerRef.current?.setVolume(vol),
      nextTrack: () => playerRef.current?.nextVideo(),
      prevTrack: () => playerRef.current?.previousVideo(),
      getCurrentInfo: () => {
        if (!playerRef.current || !playerRef.current.getVideoData) {
          return { title: 'Loading...', thumbnail: '' };
        }
        const data = playerRef.current.getVideoData();
        return {
          title: data.title || 'Unknown Track',
          thumbnail: data.video_id ? `https://img.youtube.com/vi/${data.video_id}/hqdefault.jpg` : '',
        };
      },
    }));

    return (
      <div ref={containerRef} className="hidden">
        <div id="yt-player" />
      </div>
    );
  }
);

YouTubeEmbed.displayName = 'YouTubeEmbed';

export default YouTubeEmbed;