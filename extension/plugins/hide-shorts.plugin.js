// @ts-check

/** @type {import('./index').Plugin} */
const plugin = {
  id: 'hide-shorts',
  name: 'Hide Shorts',
  description: 'Hide Shorts shelves, video cards, and navigation links.',
  version: '1.0.0',
  authors: ['YouTube Reimagined'],
  activate({ onCleanup }) {
    const style = document.createElement('style');
    onCleanup(() => style.remove());
    style.textContent = `
      ytd-reel-shelf-renderer,
      ytm-reel-shelf-renderer,
      ytd-rich-shelf-renderer[is-shorts],
      ytm-shorts-lockup-view-model,
      ytm-shorts-lockup-view-model-v2,
      ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts], ytm-shorts-lockup-view-model-v2),
      :is(ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytm-pivot-bar-item-renderer):has(
        a[href="/shorts"], a[href^="/shorts/"]
      ),
      :is(ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer,
          ytm-video-with-context-renderer, ytm-compact-video-renderer):has(a[href^="/shorts/"]) {
        display: none !important;
      }
    `;
    (document.head ?? document.documentElement).append(style);
  },
};

export default plugin;
