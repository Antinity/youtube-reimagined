// @ts-check

/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'hide-shorts',
  name: 'Hide Shorts',
  description: 'Hide Shorts shelves, video cards, and navigation links.',
  version: '1.0.0',
  authors: ['YouTube Reimagined'],
  contributors: ['Antinity'],
  options: {
    homepage: { type: 'boolean', label: 'Homepage', default: true },
    sidebar: { type: 'boolean', label: 'Sidebar', default: true },
    search: { type: 'boolean', label: 'Search', default: true },
    subscriptions: { type: 'boolean', label: 'Subscriptions', default: true },
    channel: { type: 'boolean', label: 'Channel', default: true },
    hashtags: { type: 'boolean', label: 'Hashtags', default: true },
    description: { type: 'boolean', label: 'Watch page', default: true },
  },
  activate({ settings, onCleanup }) {
    const style = document.createElement('style');
    onCleanup(() => style.remove());

    function update(pathname = location.pathname) {
      const page = surface(pathname);
      const selectors = settings.sidebar ? [...sidebar] : [];
      if (!page || settings[page]) selectors.push(...content);
      if ((page === 'channel' && settings.channel) || (page === 'hashtags' && settings.hashtags)) {
        selectors.push('[tab-title="Shorts"]');
      }
      if (page === 'hashtags' && settings.hashtags) selectors.push('ytd-rich-grid-renderer[is-shorts-grid] > #contents');

      const css = selectors.length ? `${selectors.join(',\n')} { display: none !important; }` : '';
      if (style.textContent !== css) style.textContent = css;
    }

    update();
    (document.head ?? document.documentElement).append(style);
    return {
      onNavigate: (url) => update(url.pathname),
      onSettingsChange(next) {
        settings = next;
        update();
      },
    };
  },
};

const sidebar = [
  `:is(ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytm-pivot-bar-item-renderer):has(
    a[title="Shorts"], a[href="/shorts"], a[href^="/shorts/"], [aria-label="Shorts"]
  )`,
  ':is(ytd-mini-guide-entry-renderer, ytm-pivot-bar-item-renderer):is([title="Shorts"], [aria-label="Shorts"], [pivot-identifier="pivot-shorts"])',
];

const content = [
  'ytd-reel-shelf-renderer',
  'ytm-reel-shelf-renderer',
  'ytd-rich-shelf-renderer[is-shorts]',
  'grid-shelf-view-model:has(.shortsLockupViewModelHost)',
  'ytm-shorts-lockup-view-model',
  'ytm-shorts-lockup-view-model-v2',
  'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts], .shortsLockupViewModelHost)',
  `:is(ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer,
      yt-lockup-view-model, ytm-video-with-context-renderer, ytm-compact-video-renderer):has(
    a[href^="/shorts/"], [overlay-style="SHORTS"]
  )`,
];

/** @param {string} pathname */
function surface(pathname) {
  if (pathname === '/') return 'homepage';
  if (pathname === '/results') return 'search';
  if (pathname === '/feed/subscriptions') return 'subscriptions';
  if (/^\/(?:@|channel\/|c\/|user\/)/.test(pathname)) return 'channel';
  if (pathname.startsWith('/hashtag/')) return 'hashtags';
  if (pathname === '/watch') return 'description';
}

export default plugin;
