// @ts-check

// Color controls adapted from ChromiaCat's supplied CC BY-NC 4.0 UserStyle
// (https://creativecommons.org/licenses/by-nc/4.0/), which cites https://uso.kkx.one/style/95280.
// Rainbow and image scrubber based on the supplied style by mivonie.
// Nyan Cat animation by Chris Torres (https://www.nyan.cat/).
/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'custom-progress-bar',
  name: 'Custom Progress Bar',
  description: 'Style the player timeline with solid colors, a gradient, custom images, or Nyan Cat.',
  version: '1.0.0',
  authors: ['Antinity'],
  options: {
    preset: { type: 'select', label: 'Style', default: 'solid', choices: {
      solid: 'Solid color', gradient: 'Gradient with glow', image: 'Custom image', nyan: 'Nyan Cat',
    } },
    colors: {
      type: 'group', label: 'Colors', options: {
        color: { type: 'color', label: 'Played color', default: '#2793e6' },
        firstColor: { type: 'color', label: 'Gradient start', default: '#0000ff' },
        matchScrubber: { type: 'boolean', label: 'Match scrubber to played color', default: true },
        scrubberColor: { type: 'color', label: 'Scrubber color', default: '#ffffff' },
        colorVolume: { type: 'boolean', label: 'Color the volume slider', default: true },
        colorAccents: { type: 'boolean', label: 'Color the quality badge and player accents', default: true },
        colorAutoplay: { type: 'boolean', label: 'Color the autoplay toggle', default: false },
      },
    },
    images: {
      type: 'group', label: 'Custom images', options: {
        barImage: { type: 'string', label: 'Played bar image URL', default: '',
          tooltip: 'Optional. Enter a direct HTTPS image URL to tile across the played portion in Custom image mode.' },
        scrubberImage: { type: 'string', label: 'Scrubber image URL', default: '',
          tooltip: 'Optional. Enter a direct HTTPS image URL or animated GIF to use as the playhead in Custom image mode.' },
        imageSize: { type: 'number', label: 'Image scrubber size (px)', default: 48, min: 12, max: 96, integer: true },
        barHeight: { type: 'number', label: 'Image and rainbow bar height (px)', default: 18, min: 4, max: 24, integer: true },
      },
    },
  },
  activate({ settings, onCleanup }) {
    const style = document.createElement('style');
    (document.head ?? document.documentElement).append(style);
    onCleanup(() => style.remove());

    /** @param {import('../plugin-engine').PluginSettings} values */
    function update(values) {
      const nyan = values.preset === 'nyan';
      const image = values.preset === 'image';
      const gradient = values.preset === 'gradient';
      const scrubber = values.matchScrubber ? values.color : values.scrubberColor;
      const fillImage = image && imageUrl(String(values.barImage));
      const playhead = nyan ? 'url("https://www.nyan.cat/cats/original.gif")'
        : image && imageUrl(String(values.scrubberImage));
      const fill = nyan
        ? 'linear-gradient(#be132f, #ed8f2e 25%, #f3f329 25%, #34e859 50%, #5afcfc 50%, #2181cb 75%, #4a2ee1 75%, #f245e5)'
        : gradient ? `linear-gradient(90deg, ${values.firstColor}, ${values.color})` : values.color;
      style.textContent = `
        .html5-video-player :is(.ytp-play-progress, .ytProgressBarLineProgressBarPlayed) {
          background: ${fillImage ? `${fillImage} left center / auto 100% repeat-x ${fill}` : fill} !important;
        }
        .html5-video-player :is(.ytp-scrubber-button, .ytProgressBarPlayheadProgressBarPlayheadDot) {
          background: ${playhead ? `${playhead} center / contain no-repeat` : scrubber} !important;
          ${gradient ? `box-shadow: 0 0 5px ${values.color} !important;` : ''}
          ${playhead ? `width: ${values.imageSize}px !important; height: ${values.imageSize}px !important;
            position: absolute !important; top: 50% !important; left: 50% !important;
            translate: -50% -50%; border: 0 !important; box-shadow: none !important;` : ''}
        }
        ${nyan || image ? `
          .html5-video-player :is(.ytp-progress-bar-container, .ytp-progress-bar, .ytp-progress-list,
            .ytp-play-progress, .ytp-hover-progress-list, .ytp-load-progress) { height: ${values.barHeight}px !important; }
          ${nyan ? '.html5-video-player .ytp-progress-list { background: #7f6e6e !important; }' : ''}
        ` : ''}
        ${values.colorVolume ? `
          .html5-video-player :is(.ytp-volume-slider-track, .ytp-volume-slider-handle)::before,
          .html5-video-player .ytp-volume-slider-handle { background: ${fill} !important; }
        ` : ''}
        ${values.colorAccents ? `
          .html5-video-player .ytp-settings-button:is(.ytp-hd-quality-badge, .ytp-4k-quality-badge,
            .ytp-5k-quality-badge, .ytp-8k-quality-badge, .ytp-3d-badge)::after,
          .html5-video-player .ytp-menuitem[aria-checked="true"] .ytp-menuitem-toggle-checkbox,
          .html5-video-player .ytp-chrome-controls .ytp-button[aria-pressed]::after,
          .resume-playback-progress-bar { background: ${fill} !important; }
          .html5-video-player .ytp-swatch-color { color: ${values.color} !important; }
          .html5-video-player :is(.ytp-cued-thumbnail-overlay:hover .ytp-large-play-button-bg,
            .ytp-youtube-button:hover .ytp-svg-fill-logo-tube-lozenge) { fill: ${values.color} !important; }
        ` : ''}
        ${values.colorAutoplay ? `
          .html5-video-player .ytp-autonav-toggle-button[aria-checked="true"] { background: ${fill} !important; }
        ` : ''}
      `;
    }

    update(settings);
    return { onSettingsChange: update };
  },
};

/** @param {string} value */
function imageUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return `url("${CSS.escape(url.href)}")`;
  } catch {
    // An incomplete URL can be present while editing the option.
  }
}

export default plugin;
