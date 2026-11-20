// @ts-check

/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'keyboard-shortcuts',
  name: 'Keyboard Shortcuts',
  description: 'Press Ctrl+K to focus YouTube search.',
  version: '1.0.0',
  authors: ['Antinity'],
  activate({ onCleanup }) {
    const controller = new AbortController();
    const inputs = 'ytd-masthead :is(input[name="search_query"], input.ytSearchboxComponentInput), #masthead-container input#search, ytm-search-box input, ytm-search-header input';
    window.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.isComposing || !event.ctrlKey || event.altKey || event.metaKey
        || event.shiftKey || event.key.toLowerCase() !== 'k') return;

      const search = Array.from(document.querySelectorAll(inputs)).find((input) => input.getClientRects().length);
      if (!(search instanceof HTMLInputElement)) return;
      event.preventDefault();
      event.stopPropagation();
      search.focus();
      search.select();
    }, { capture: true, signal: controller.signal });
    onCleanup(() => controller.abort());
  },
};

export default plugin;
