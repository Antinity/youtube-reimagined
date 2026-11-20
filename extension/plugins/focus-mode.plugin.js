// @ts-check

// Visibility controls informed by Unhook (https://unhook.app/).
/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'focus-mode',
  name: 'Focus Mode',
  description: 'Hide distracting parts of YouTube and optionally start on Subscriptions.',
  version: '1.1.1',
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
    watchButtons: {
      type: 'group', label: 'On-page buttons', options: {
        sidebarButton: { type: 'boolean', label: 'Add sidebar button', default: false },
        commentsButton: { type: 'boolean', label: 'Add comments button', default: false },
        liveChatButton: { type: 'boolean', label: 'Add live chat button', default: false },
        playlistButton: { type: 'boolean', label: 'Add playlist button', default: false },
        descriptionButton: { type: 'boolean', label: 'Add description button', default: false },
        restoreButtons: { type: 'boolean', label: 'Keep buttons to show hidden sections', default: true,
          tooltip: 'Turn off to remove each button after it hides its section. Changes made with the buttons apply to the current video.' },
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
    /** @type {Map<string, boolean>} */
    const overrides = new Map();
    /** @type {Map<string, ReturnType<typeof createSectionButton>>} */
    const buttons = new Map();
    let videoId = watchVideoId(new URL(location.href));
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        placeButtons();
      });
    });
    onCleanup(() => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      for (const { button } of buttons.values()) button.remove();
      style.remove();
    });

    function route(url = new URL(location.href)) {
      if (settings.subscriptions && url.pathname === '/') location.replace('/feed/subscriptions');
    }

    /** @param {string} section */
    function hidden(section) {
      // The sidebar button can reveal recommendations hidden by either watch setting.
      if (section === 'related' && overrides.has('sidebar')) return false;
      return overrides.get(section) ?? Boolean(settings[section]);
    }

    /** @param {string} section */
    function collapsed(section) {
      return hidden(section) || (section === 'sidebar' && hidden('related'));
    }

    function renderVisibility() {
      const rules = Object.entries(selectors).filter(([key]) => hidden(key))
        .map(([, selector]) => `${selector} { display: none !important; }`);
      style.textContent = [buttonStyle, ...rules].join('\n');
    }

    function placeButtons() {
      const watch = location.pathname === '/watch' ? document.querySelector(watchSelector) : null;
      for (const [key, section] of Object.entries(watchSections)) {
        const target = watch && settings[section.option] ? sectionTarget(watch, key) : null;
        const anchor = target && !target.parentElement?.closest('[hidden]')
          && (settings.restoreButtons || overrides.get(key) !== true)
          ? buttonAnchor(watch, target, key, hidden('sidebar')) : null;
        let control = buttons.get(key);
        if (!anchor) {
          control?.button.remove();
          continue;
        }
        if (!control) {
          control = createSectionButton(key, toggleSection);
          buttons.set(key, control);
        }
        const { button, icon, label } = control;
        const isCollapsed = collapsed(key);
        const action = `${isCollapsed ? 'Show' : 'Hide'} ${section.label}`;
        if (label.data !== action) {
          label.data = action;
          button.setAttribute('aria-expanded', String(!isCollapsed));
          icon.setAttribute('d', section.shape + (isCollapsed ? section.show : section.hide));
        }
        const targetId = target?.id || null;
        if (button.getAttribute('aria-controls') !== targetId) {
          if (targetId) button.setAttribute('aria-controls', targetId);
          else button.removeAttribute('aria-controls');
        }
        if (anchor.previousElementSibling !== button) {
          const focused = document.activeElement === button;
          anchor.before(button);
          if (focused) button.focus({ preventScroll: true });
        }
      }
    }

    /** @param {string} section @param {HTMLButtonElement} button */
    function toggleSection(section, button) {
      const reveal = collapsed(section);
      overrides.set(section, !reveal);
      renderVisibility();
      placeButtons();
      if (button.isConnected) button.scrollIntoView({ block: 'nearest' });
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const watch = button.closest(watchSelector);
      const animated = reveal && watch ? sectionTarget(watch, section) : button.querySelector('svg');
      animated?.animate([{ opacity: 0.45, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }],
        { duration: 180, easing: 'ease-out' });
    }

    function update(url = new URL(location.href)) {
      route(url);
      const nextVideo = watchVideoId(url);
      if (nextVideo !== videoId) overrides.clear();
      videoId = nextVideo;
      renderVisibility();

      if (url.pathname === '/watch' && Object.values(watchSections).some(({ option }) => settings[option])) {
        observer.observe(document.documentElement, {
          childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'],
        });
      } else {
        observer.disconnect();
      }
      placeButtons();
    }

    update();
    return {
      onNavigate: update,
      onSettingsChange(next) {
        for (const [key, { option }] of Object.entries(watchSections)) {
          if (settings[key] !== next[key] || settings[option] !== next[option]
            || (key === 'sidebar' && settings.related !== next.related)) overrides.delete(key);
        }
        settings = next;
        update();
      },
    };
  },
};

/** @type {Record<string, string>} */
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

const watchSelector = 'ytd-watch-flexy:not([hidden]), ytm-watch:not([hidden])';

const watchSections = {
  sidebar: { option: 'sidebarButton', label: 'sidebar', shape: 'M3 5h18v14H3z M14 5v14',
    hide: ' M7 9l3 3-3 3', show: ' M10 9l-3 3 3 3' },
  comments: { option: 'commentsButton', label: 'comments', shape: 'M20 16H9l-5 4V5h16z M9 10h6',
    hide: '', show: ' M12 7v6' },
  liveChat: { option: 'liveChatButton', label: 'live chat', shape: 'M20 11a8 8 0 0 1-8 8H4l2-3.5A8 8 0 1 1 20 11Z M9 11h6',
    hide: '', show: ' M12 8v6' },
  playlist: { option: 'playlistButton', label: 'playlist', shape: 'M4 6h16 M4 11h8 M4 16h8 M15 15h6',
    hide: '', show: ' M18 12v6' },
  description: { option: 'descriptionButton', label: 'description', shape: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 14h6',
    hide: '', show: ' M12 11v6' },
};

const buttonStyle = `
  button.yr-focus-section-toggle {
    display: flex; align-items: center; align-self: flex-start; gap: 6px; inline-size: fit-content; max-inline-size: 100%;
    min-block-size: 32px; margin: 0 0 8px; padding: 4px 10px;
    border: 1px solid light-dark(#dce2e8, #414750); border-radius: 16px; cursor: pointer;
    font: 500 12px/1.3 Roboto, Arial, sans-serif;
    color: light-dark(#181c21, #fff);
    background: light-dark(#eef1f4, #282c32);
    transition: background-color 150ms ease, transform 150ms ease;
  }
  :where(html[dark], html[data-theme='dark'], ytd-app[dark]) button.yr-focus-section-toggle { color-scheme: dark; }
  button.yr-focus-section-toggle[data-section="sidebar"] { margin-inline-start: auto; }
  button.yr-focus-section-toggle:hover { background: light-dark(#e1e7ee, #343a44); }
  button.yr-focus-section-toggle:focus-visible { outline: 2px solid light-dark(#0754b4, #82baff); outline-offset: 2px; }
  button.yr-focus-section-toggle:active { transform: scale(0.97); }
  button.yr-focus-section-toggle svg { flex: none; }
  @media (prefers-reduced-motion: reduce) {
    button.yr-focus-section-toggle { transition: none; }
    button.yr-focus-section-toggle:active { transform: none; }
  }
`;

/** @param {URL} url */
function watchVideoId(url) {
  return url.pathname === '/watch' ? url.searchParams.get('v') : null;
}

/** @param {Element} watch @param {string} section */
function sectionTarget(watch, section) {
  if (section === 'liveChat') {
    const chat = watch.querySelector('ytd-live-chat-frame, ytm-live-chat-renderer');
    return chat?.closest('#chat-container.ytd-watch-flexy') ?? chat;
  }
  const selector = selectors[section];
  const target = selector ? watch.querySelector(selector) : null;
  if (section === 'playlist' && !new URLSearchParams(location.search).has('list')
    && !target?.querySelector('ytd-playlist-panel-video-renderer, ytm-playlist-panel-video-renderer')) return null;
  return target;
}

/** @param {Element | null} watch @param {Element} target @param {string} section @param {boolean} sidebarHidden */
function buttonAnchor(watch, target, section, sidebarHidden) {
  if (section === 'description') return target.closest('#bottom-row') ?? target;
  if (section !== 'sidebar' || target.id !== 'secondary') return target;
  if (sidebarHidden) return watch?.querySelector('#primary-inner > :not(.yr-focus-section-toggle)')
    ?? watch?.querySelector('#primary > :not(.yr-focus-section-toggle)');
  return target.querySelector('#related') ?? target.querySelector('#secondary-inner');
}

/** @param {string} section @param {(section: string, button: HTMLButtonElement) => void} onClick */
function createSectionButton(section, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'yr-focus-section-toggle';
  button.dataset.section = section;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '1.75');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  svg.append(icon);
  const label = document.createTextNode('');
  button.append(svg, label);
  button.addEventListener('click', () => onClick(section, button));
  return { button, icon, label };
}

export default plugin;
