// @ts-check

// Visibility controls informed by Unhook (https://unhook.app/).
/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'focus-mode',
  name: 'Focus Mode',
  description: 'Hide distracting parts of YouTube and optionally start on Subscriptions.',
  version: '1.0.0',
  authors: ['Antinity'],
  options: {
    browsing: {
      type: 'group', label: 'Browsing', options: {
        subscriptions: { type: 'boolean', label: 'Open Subscriptions instead of Home', default: false },
        homeFeed: { type: 'boolean', label: 'Hide Home recommendations', default: true },
        shorts: { type: 'boolean', label: 'Hide Shorts shelves and links', default: false },
        mixes: { type: 'boolean', label: 'Hide YouTube Mixes', default: false },
        searchShelves: { type: 'boolean', label: 'Hide recommended shelves in Search', default: false },
        explore: { type: 'boolean', label: 'Hide Explore and Trending links', default: false },
        notifications: { type: 'boolean', label: 'Hide the notification bell', default: false },
      },
    },
    watching: {
      type: 'group', label: 'Watch page', options: {
        related: { type: 'boolean', label: 'Hide related videos', default: true },
        sidebar: { type: 'boolean', label: 'Hide the entire video sidebar', default: false },
        comments: { type: 'boolean', label: 'Hide comments', default: false },
        liveChat: { type: 'boolean', label: 'Hide live chat', default: false },
        playlist: { type: 'boolean', label: 'Hide the playlist panel', default: false },
        description: { type: 'boolean', label: 'Hide the video description', default: false },
        actions: { type: 'boolean', label: 'Hide video action buttons', default: false },
        merchandise: { type: 'boolean', label: 'Hide merchandise and offers', default: false },
      },
    },
    player: {
      type: 'group', label: 'Player', options: {
        endScreen: { type: 'boolean', label: 'Hide end-screen recommendations', default: true },
        cards: { type: 'boolean', label: 'Hide info cards', default: false },
      },
    },
  },
  activate({ settings, onCleanup }) {
    const style = document.createElement('style');
    (document.head ?? document.documentElement).append(style);
    onCleanup(() => style.remove());

    function route(url = new URL(location.href)) {
      if (settings.subscriptions && url.pathname === '/') location.replace('/feed/subscriptions');
    }

    function update() {
      style.textContent = Object.entries(selectors).filter(([key]) => settings[key])
        .map(([, selector]) => `${selector} { display: none !important; }`).join('\n');
      route();
    }

    update();
    return {
      onNavigate: route,
      onSettingsChange(next) { settings = next; update(); },
    };
  },
};

const selectors = {
  homeFeed: 'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer, ytm-browse[tab-identifier="FEwhat_to_watch"] ytm-rich-grid-renderer',
  shorts: `ytd-reel-shelf-renderer, ytm-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts],
    grid-shelf-view-model:has(.shortsLockupViewModelHost), ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2,
    :is(ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytm-pivot-bar-item-renderer):has(a[href="/shorts"])`,
  mixes: 'ytd-radio-renderer, :is(ytd-rich-item-renderer, yt-lockup-view-model):has(a[href*="list=RD"])',
  searchShelves: 'ytd-search ytd-item-section-renderer > #contents > ytd-shelf-renderer',
  explore: 'ytd-guide-entry-renderer:has(a:is([href="/feed/explore"], [href="/feed/trending"]))',
  notifications: 'ytd-notification-topbar-button-renderer, ytm-notification-topbar-button-renderer',
  related: 'ytd-watch-flexy #related, ytm-watch #related',
  sidebar: 'ytd-watch-flexy #secondary, ytm-watch #related',
  comments: 'ytd-watch-flexy ytd-comments, ytm-comments-entry-point-header-renderer, ytm-comments-section-renderer',
  liveChat: 'ytd-live-chat-frame, ytm-live-chat-renderer, #chat-container.ytd-watch-flexy',
  playlist: 'ytd-playlist-panel-renderer, ytm-playlist-panel-renderer',
  description: 'ytd-watch-metadata #description, ytm-expandable-video-description-body-renderer',
  actions: 'ytd-watch-metadata #actions, ytm-slim-video-action-bar-renderer',
  merchandise: 'ytd-merch-shelf-renderer, ytd-ticket-shelf-renderer, ytd-product-list-renderer',
  endScreen: '.ytp-endscreen-content, .ytp-ce-element',
  cards: '.ytp-cards-button, .ytp-cards-teaser, .ytp-cards-list',
};

export default plugin;
