// @ts-check

import { setPlayerVolume, watchVideoPlayer } from './shared/player';

/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'default-volume',
  name: 'Default Volume',
  description: 'Set the volume when a new video opens. Adjustments you make afterward last for that video.',
  version: '1.0.0',
  authors: ['Antinity'],
  options: {
    volume: { type: 'range', label: 'Default volume (%)', default: 50, min: 0, max: 100 },
  },
  activate({ settings, onCleanup }) {
    /** @type {{ video: HTMLVideoElement, id: string, level: number } | undefined} */
    let applied;
    const refresh = watchVideoPlayer(onCleanup, ({ player, video, id }) => {
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) return false;
      const level = Number(settings.volume);
      if (applied?.video !== video || applied.id !== id || applied.level !== level) {
        setPlayerVolume(player, video, level);
        applied = { video, id, level };
      }
      return true;
    });

    return {
      onNavigate: refresh,
      onSettingsChange(next) {
        settings = next;
        refresh();
      },
    };
  },
};

export default plugin;
