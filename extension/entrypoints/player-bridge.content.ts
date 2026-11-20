import { youtubePlayerMatches } from '@/youtube';

interface YouTubePlayer extends HTMLElement {
  getVideoData?(): { video_id?: string } | null;
  getAvailableQualityLevels?(): string[];
  setPlaybackQualityRange?(min: string, max: string): void;
  setVolume?(level: number): void;
  unMute?(): void;
}

const heights = new Map(Object.entries({
  tiny: 144, small: 240, medium: 360, large: 480, hd720: 720, hd1080: 1080,
  hd1440: 1440, hd2160: 2160, hd2880: 2880, hd4320: 4320, highres: 4320,
}));

export default defineContentScript({
  matches: youtubePlayerMatches,
  allFrames: true,
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    if (window !== window.top && !location.pathname.startsWith('/embed/')) return;
    const listeners = new AbortController();
    document.dispatchEvent(new Event('yr:replace-player-bridge'));
    document.addEventListener('yr:replace-player-bridge', () => listeners.abort(), { once: true });

    // This page-world script only calls local player methods. Use strings to cross Firefox worlds.
    document.addEventListener('yr:player-request', (request) => {
      const player = request.target as YouTubePlayer;
      if (!(request instanceof CustomEvent) || typeof request.detail !== 'string'
        || !(player instanceof HTMLElement) || !player.matches('.html5-video-player')) return;
      const [command, value = '', unmute] = request.detail.split(':');
      try {
        if (command === 'id') {
          const id = player.getVideoData?.()?.video_id;
          if (id) player.dispatchEvent(new CustomEvent('yr:player-response', { detail: id }));
        }
        if (command === 'volume' && /^(?:100|[0-9]{1,2})$/.test(value) && player.setVolume) {
          player.setVolume(Number(value));
          if (unmute === 'unmute') player.unMute?.();
          request.preventDefault();
        }
        if (command === 'quality' && player.setPlaybackQualityRange) {
          const quality = value === 'auto' ? 'auto' : closestQuality(player.getAvailableQualityLevels?.(), value);
          if (!quality) return;
          player.setPlaybackQualityRange(quality, quality);
          request.preventDefault();
        }
      } catch {
        // The element can exist before YouTube attaches its player methods.
      }
    }, { signal: listeners.signal });
  },
});

function closestQuality(levels: string[] | undefined, requested: string) {
  const target = Number(requested);
  if ((!Number.isFinite(target) && requested !== 'highest') || !levels?.length) return;
  const known = levels.flatMap((level) => {
    const height = heights.get(level) ?? Number(/^hd(\d+)$/.exec(level)?.[1]);
    return height ? [{ level, height }] : [];
  });
  if (requested === 'highest') return known.toSorted((a, b) => b.height - a.height)[0]?.level;
  return known.toSorted((a, b) => Math.abs(a.height - target) - Math.abs(b.height - target) || a.height - b.height)[0]?.level;
}
