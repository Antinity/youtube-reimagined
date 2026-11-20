// @ts-check

import { hasWheelModifier, modifierChoices, watchPlayerWheel } from './shared/wheel';

/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'scroll-to-change-speed',
  name: 'Scroll to Change Speed',
  description: 'Hold a modifier and scroll over the video to adjust playback speed.',
  version: '1.0.0',
  authors: ['Antinity'],
  options: {
    modifier: { type: 'select', label: 'Modifier key', default: 'ctrl', choices: modifierChoices },
    step: { type: 'number', label: 'Speed change per scroll (%)', default: 10, min: 0.1, max: 100, step: 0.1,
      tooltip: 'A 10% step changes 1× to 1.1×. Supports steps as small as 0.1%.' },
  },
  activate({ settings, onCleanup }) {
    watchPlayerWheel(window, onCleanup, (event, _player, video) => {
      if (!hasWheelModifier(event, settings.modifier)) return;
      const change = Math.sign(-event.deltaY) * Number(settings.step) / 100;
      const rate = Math.max(0.25, Math.min(4, Math.round((video.playbackRate + change) * 1000) / 1000));
      video.playbackRate = rate;
      return `${rate}×`;
    });
    return { onSettingsChange(next) { settings = next; } };
  },
};

export default plugin;
