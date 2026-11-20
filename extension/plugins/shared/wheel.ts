import type { PluginContext } from '@/plugin-engine';

const controls = '.ytp-chrome-top, .ytp-chrome-bottom, .ytp-popup, .ytp-contextmenu, button, [role="button"]';

export const modifierChoices = { ctrl: 'Control', alt: 'Alt', shift: 'Shift', meta: 'Meta (Command or Windows)' };

export function hasWheelModifier(event: WheelEvent, key: unknown) {
  return event.ctrlKey === (key === 'ctrl') && event.altKey === (key === 'alt')
    && event.shiftKey === (key === 'shift') && event.metaKey === (key === 'meta');
}

export function watchPlayerWheel(
  target: Document | Window,
  onCleanup: PluginContext['onCleanup'],
  adjust: (event: WheelEvent, player: HTMLElement, video: HTMLVideoElement) => string | undefined,
) {
  const listener = new AbortController();
  const hud = document.createElement('div');
  const label = document.createElement('div');
  const bezel = document.createElement('div');
  hud.className = 'ytp-bezel-text-wrapper';
  // Keep YouTube's styling while letting the wheel idle timer control visibility.
  hud.style.cssText = 'pointer-events: none; display: block; z-index: 61; animation: none; opacity: 1';
  hud.setAttribute('role', 'status');
  label.className = 'ytp-bezel-text';
  bezel.className = 'yr-wheel-hud';
  hud.append(label);
  bezel.append(hud);
  let timer = 0;

  const wheel: EventListener = (event) => {
    if (!(event instanceof WheelEvent) || event.defaultPrevented || !event.cancelable
      || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)
      || !(event.target instanceof Element) || event.target.closest(controls)) return;
    const player = event.target.closest<HTMLElement>('.html5-video-player');
    const video = player?.querySelector('video');
    if (!player || !video || player.matches('.ad-showing, .ad-interrupting')
      || player.closest('ytd-video-preview, #video-preview, ytm-inline-preview-player')) return;

    const display = adjust(event, player, video);
    if (display === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    label.textContent = display;
    if (bezel.parentElement !== player) {
      player.querySelector(':scope > .yr-wheel-hud')?.remove();
      player.append(bezel);
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(() => bezel.remove(), 800);
  };

  target.addEventListener('wheel', wheel, { capture: true, passive: false, signal: listener.signal });
  onCleanup(() => {
    listener.abort();
    window.clearTimeout(timer);
    bezel.remove();
  });
}
