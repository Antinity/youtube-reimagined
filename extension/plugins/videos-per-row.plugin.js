// @ts-check

const defaultColumns = 4;

/** @type {import('./index').Plugin} */
const plugin = {
  id: 'videos-per-row',
  name: 'Videos Per Row',
  description: 'Choose how many videos appear per row in desktop YouTube grids.',
  version: '1.0.0',
  authors: ['YouTube Reimagined'],
  options: {
    columns: { type: 'number', label: 'Videos per row', default: defaultColumns, min: 1, max: 8, integer: true },
  },
  activate({ settings, onCleanup }) {
    const style = document.createElement('style');
    onCleanup(() => style.remove());

    /** @param {import('./index').PluginSettings} values */
    function update(values) {
      const columns = typeof values.columns === 'number' ? values.columns : defaultColumns;
      style.textContent = `
        ytd-rich-grid-renderer > #contents {
          display: grid !important;
          grid-template-columns: repeat(${columns}, minmax(0, 1fr));
          column-gap: var(--ytd-rich-grid-item-margin, 16px);
        }
        ytd-rich-grid-renderer > #contents > ytd-rich-grid-row,
        ytd-rich-grid-renderer > #contents > ytd-rich-grid-row > #contents {
          display: contents !important;
        }
        :is(ytd-rich-grid-renderer, ytd-rich-grid-row) > #contents > ytd-rich-item-renderer {
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
          margin-inline: 0 !important;
        }
        :is(ytd-rich-grid-renderer, ytd-rich-grid-row) > #contents
            > :not(ytd-rich-item-renderer, ytd-rich-grid-row) {
          grid-column: 1 / -1;
        }
      `;
    }

    update(settings);
    (document.head ?? document.documentElement).append(style);
    return { onSettingsChange: update };
  },
};

export default plugin;
