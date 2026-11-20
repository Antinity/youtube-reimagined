// @ts-check

import { getPlayerVolume, setPlayerVolume } from './shared/player';
import { hasWheelModifier, modifierChoices, watchPlayerWheel } from './shared/wheel';

/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'scroll-to-change-volume',
  name: 'Scroll to Change Volume',
  description: 'Scroll over selected areas of the video or hold a modifier to adjust volume.',
  version: '1.0.2',
  authors: ['Antinity'],
  options: {
    activation: { type: 'select', label: 'Activate with', default: 'zones', choices: {
      zones: 'Player zones', key: 'Hold a modifier key',
    } },
    modifier: { type: 'select', label: 'Modifier key', default: 'alt', choices: modifierChoices },
    step: { type: 'number', label: 'Volume change per scroll (%)', default: 5, min: 1, max: 100, integer: true },
    zones: {
      type: 'group', label: 'Active player zones', options: {
        topLeft: { type: 'boolean', label: 'Top left', default: true },
        topRight: { type: 'boolean', label: 'Top right', default: true },
        bottomLeft: { type: 'boolean', label: 'Bottom left', default: false },
        bottomRight: { type: 'boolean', label: 'Bottom right', default: false },
      },
    },
  },
  activate({ settings, onCleanup }) {
    watchPlayerWheel(document, onCleanup, (event, player, video) => {
      if (settings.activation === 'key') {
        if (!hasWheelModifier(event, settings.modifier)) return;
      } else {
        if (!hasWheelModifier(event, undefined)) return;
        const { left, top, width, height } = player.getBoundingClientRect();
        const x = event.clientX - left;
        const y = event.clientY - top;
        if (x < 0 || x > width || y < 0 || y > height) return;
        const zone = y < height / 2 ? (x < width / 2 ? 'topLeft' : 'topRight')
          : (x < width / 2 ? 'bottomLeft' : 'bottomRight');
        if (!settings[zone]) return;
      }
      const current = getPlayerVolume(player, video);
      const level = Math.min(100, Math.max(0, current + Math.sign(-event.deltaY) * Number(settings.step)));
      setPlayerVolume(player, video, level, level > 0);
      return `${level}%`;
    });
    return { onSettingsChange(next) { settings = next; } };
  },
};

export default plugin;
