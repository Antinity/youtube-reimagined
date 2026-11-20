// @ts-check

import { requestPlayer, watchVideoPlayer } from './shared/player';

const qualities = {
  auto: 'Auto (YouTube)', highest: 'Highest available', 144: '144p', 240: '240p', 360: '360p',
  480: '480p', 720: '720p HD', 1080: '1080p HD', 1440: '1440p', 2160: '2160p (4K)', 4320: '4320p (8K)',
};

/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'default-video-quality',
  name: 'Default Video Quality',
  description: 'Choose the closest available resolution for videos, playlists, pop-up players, and embeds.',
  version: '1.0.0',
  authors: ['Antinity'],
  options: {
    video: { type: 'select', label: 'Videos', default: '1080', choices: qualities },
    playlist: { type: 'select', label: 'Playlists', default: '1080', choices: qualities },
    popup: { type: 'select', label: 'Pop-up, miniplayer, and picture-in-picture', default: '1080', choices: qualities },
    embed: { type: 'select', label: 'Embedded videos', default: '1080', choices: qualities },
    fullscreenOptions: {
      type: 'group', label: 'Fullscreen', options: {
        useFullscreen: { type: 'boolean', label: 'Use a different quality in fullscreen', default: false },
        fullscreenQuality: { type: 'select', label: 'Fullscreen quality', default: '1080', choices: qualities },
        restoreQuality: { type: 'boolean', label: 'Restore default quality when exiting', default: true },
      },
    },
  },
  activate({ settings, onCleanup }) {
    /** @type {{ video: HTMLVideoElement, id: string, quality: string, override: boolean } | undefined} */
    let applied;
    const refresh = watchVideoPlayer(onCleanup, ({ player, video, id, mode, fullscreen }) => {
      const override = Boolean(fullscreen && settings.useFullscreen);
      const quality = String(override ? settings.fullscreenQuality : settings[mode]);

      if (applied?.video === video && applied.id === id) {
        if (applied.override && !override && !settings.restoreQuality && !fullscreen) {
          applied = { video, id, quality, override };
          return true;
        }
        if (applied.quality === quality && applied.override === override) return true;
      }

      if (!requestPlayer(player, `quality:${quality}`)) return false;
      applied = { video, id, quality, override };
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
