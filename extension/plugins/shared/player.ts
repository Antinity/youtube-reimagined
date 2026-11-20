import type { PluginContext } from '@/plugin-engine';

const playerSelector = '#movie_player.html5-video-player, #player .html5-video-player';
const shortsPlayerSelector = ':is(ytd-reel-video-renderer, ytm-reel-video-renderer)[is-active] .html5-video-player';

export function requestPlayer(player: Element, command: string) {
  return !player.dispatchEvent(new CustomEvent('yr:player-request', {
    detail: command, bubbles: true, cancelable: true,
  }));
}

function readPlayerResponse(player: HTMLElement, command: string) {
  let response: string | undefined;
  const receive = (event: Event) => {
    if (event instanceof CustomEvent && typeof event.detail === 'string') response = event.detail;
  };
  player.addEventListener('yr:player-response', receive, { once: true });
  requestPlayer(player, command);
  player.removeEventListener('yr:player-response', receive);
  return response;
}

export function getPlayerVolume(player: HTMLElement, video: HTMLVideoElement) {
  if (video.muted) return 0;
  // YouTube can scale the media element's volume independently of the slider.
  const volume = Number(readPlayerResponse(player, 'get-volume'));
  return Math.round(volume >= 0 && volume <= 100 ? volume : video.volume * 100);
}

export function setPlayerVolume(player: HTMLElement, video: HTMLVideoElement, percent: number, unmute = false) {
  if (!requestPlayer(player, `volume:${percent}${unmute ? ':unmute' : ''}`)) video.volume = percent / 100;
  if (unmute) video.muted = false;
}

interface VideoPlayer {
  player: HTMLElement;
  video: HTMLVideoElement;
  id: string;
  mode: 'embed' | 'popup' | 'playlist' | 'video';
  fullscreen: boolean;
}

export function watchVideoPlayer(onCleanup: PluginContext['onCleanup'], apply: (state: VideoPlayer) => boolean) {
  let player: HTMLElement | null = null;
  let frame = 0;
  let retry = 0;
  let attempts = 0;
  const controller = new AbortController();
  const playerObserver = new MutationObserver(schedule);
  const pageObserver = new MutationObserver((mutations) => {
    if (mutations.some(({ type, addedNodes, removedNodes }) => type === 'attributes'
      || [...addedNodes, ...removedNodes].some((node) => node instanceof Element
        && (node.matches('video, #movie_player') || node.querySelector('video, #movie_player'))))) schedule();
  });

  function schedule() {
    if (frame) return;
    window.clearTimeout(retry);
    frame = requestAnimationFrame(update);
  }

  function update() {
    frame = 0;
    const url = new URL(location.href);
    const shortsId = /^\/shorts\/([\w-]+)\/?$/.exec(url.pathname)?.[1];
    const next = document.querySelector<HTMLElement>(shortsId ? shortsPlayerSelector : playerSelector);
    if (next !== player) {
      playerObserver.disconnect();
      player = next;
      if (player) playerObserver.observe(player, { attributes: true, attributeFilter: ['class'] });
    }

    const watch = url.pathname === '/watch';
    const embed = url.pathname.startsWith('/embed/');
    const video = player?.querySelector<HTMLVideoElement>('video');
    const popup = Boolean(window.opener || player?.matches('.ytp-player-minimized')
      || (video && document.pictureInPictureElement === video));
    if (!watch && !embed && !popup && !shortsId) return;

    if (player && video && !player.matches('.ad-showing, .ad-interrupting')) {
      const actualId = readPlayerResponse(player, 'id');
      const expectedId = watch ? url.searchParams.get('v') : shortsId;
      const watchId = player.closest('ytd-watch-flexy')?.getAttribute('video-id');
      if (!(expectedId && ((actualId && actualId !== expectedId) || (!actualId && watchId && watchId !== expectedId)))) {
        const id = actualId || expectedId || video.currentSrc || (embed && url.pathname.split('/')[2]);
        if (id && apply({ player, video, id,
          mode: popup ? 'popup' : embed ? 'embed' : url.searchParams.has('list') ? 'playlist' : 'video',
          fullscreen: Boolean(document.fullscreenElement?.contains(player) || player.matches('.ytp-fullscreen')),
        })) {
          attempts = 0;
          return;
        }
      }
    }

    if (attempts < 8) retry = window.setTimeout(schedule, Math.min(250 * 2 ** attempts++, 2000));
  }

  const options = { capture: true, signal: controller.signal };
  function refresh() {
    attempts = 0;
    schedule();
  }
  for (const event of ['loadedmetadata', 'playing', 'enterpictureinpicture', 'leavepictureinpicture']) {
    document.addEventListener(event, (e) => {
      if (e.target instanceof HTMLVideoElement && e.target.closest(`${playerSelector}, ${shortsPlayerSelector}`)) refresh();
    }, options);
  }
  document.addEventListener('fullscreenchange', refresh, options);
  document.addEventListener('yt-navigate-finish', refresh, options);
  pageObserver.observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['video-id', 'is-active'],
  });
  onCleanup(() => {
    controller.abort();
    playerObserver.disconnect();
    pageObserver.disconnect();
    cancelAnimationFrame(frame);
    window.clearTimeout(retry);
  });
  refresh();
  return refresh;
}
