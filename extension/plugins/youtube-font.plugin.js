// @ts-check

// Based on the supplied UserStyle by VividExplorer.
const fonts = {
  Inter: 'https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2',
  'DM Sans': 'https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2',
  'Source Sans 3': 'https://fonts.gstatic.com/s/sourcesans3/v20/nwpStKy2OAdR1K-IwhWudF-R3w8aZQ.woff2',
};

/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'youtube-font',
  name: 'YouTube Font',
  description: 'Choose a preset font or load a font from your own URL.',
  version: '1.0.0',
  authors: ['Antinity'],
  options: {
    font: { type: 'select', label: 'Font', default: 'YouTube Sans', choices: {
      'YouTube Sans': 'YouTube Sans', Roboto: 'Roboto (YouTube default)', Inter: 'Inter',
      'DM Sans': 'DM Sans', 'Source Sans 3': 'Source Sans 3', Arial: 'Arial', Georgia: 'Georgia',
    } },
    custom: {
      type: 'group', label: 'Custom font', options: {
        useCustom: { type: 'boolean', label: 'Use custom font', default: false },
        customName: { type: 'string', label: 'Font family name', default: 'Archivo' },
        fontUrl: { type: 'string', label: 'Font file URL', default: '',
          tooltip: 'Enter a direct HTTPS URL to a WOFF2, WOFF, TTF, or OTF font file. The server must allow cross-origin font requests.' },
      },
    },
  },
  activate({ settings, onCleanup }) {
    const style = document.createElement('style');
    (document.head ?? document.documentElement).append(style);
    onCleanup(() => style.remove());

    /** @param {import('../plugin-engine').PluginSettings} values */
    function update(values) {
      const customUrl = values.useCustom && httpsUrl(String(values.fontUrl));
      const name = customUrl && String(values.customName).trim();
      const preset = String(values.font);
      const family = name || preset;
      const url = name ? customUrl : fonts[/** @type {keyof typeof fonts} */ (preset)];
      const face = `"${CSS.escape(family)}"`;
      style.textContent = `
        ${url ? `@font-face {
          font-family: ${face}; src: url("${CSS.escape(url)}");
          font-display: swap;
          ${name ? '' : 'font-weight: 400 700;'}
        }` : ''}
        body, a, span, button, input, textarea, ::placeholder, yt-formatted-string {
          font-family: ${face}, Roboto, Arial, Helvetica, sans-serif !important;
        }
      `;
    }

    update(settings);
    return { onSettingsChange: update };
  },
};

/** @param {string} value */
function httpsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return url.href;
  } catch {
    // An incomplete URL can be present while editing the option.
  }
}

export default plugin;
