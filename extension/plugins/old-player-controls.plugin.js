// @ts-check

// Based on the supplied Old player and Pre-delhi UI UserStyle by sussteve226.
/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'old-player-controls',
  name: 'Old Player Controls',
  description: 'Bring back classic player controls, with optional changes to the sidebar, descriptions, and comment threads.',
  version: '1.0.0',
  authors: ['Antinity'],
  options: {
    player: {
      type: 'group', label: 'Player', options: {
        oldPlayer: { type: 'boolean', label: 'Classic player toolbar', default: true },
        oldPlayerIcons: { type: 'boolean', label: 'Classic player icons', default: true },
        redProgress: { type: 'boolean', label: 'Solid red progress', default: false },
        compact: { type: 'boolean', label: 'Compact controls', default: false },
        square: { type: 'boolean', label: 'Square player corners', default: false },
      },
    },
    layout: {
      type: 'group', label: 'Desktop layout', options: {
        hoverEffects: { type: 'boolean', label: 'Disable description and Home hover effects', default: true },
        oldRecommendations: { type: 'boolean', label: 'Classic video recommendations', default: true },
        oldNavigation: { type: 'boolean', label: 'Classic navigation order', default: true },
        oldComments: { type: 'boolean', label: 'Classic comment replies', default: true },
      },
    },
  },
  activate({ settings, onCleanup }) {
    if (location.hostname !== 'www.youtube.com') return;
    const style = document.createElement('style');
    (document.head ?? document.documentElement).append(style);
    onCleanup(() => style.remove());

    /** @param {import('../plugin-engine').PluginSettings} options */
    function update(options) {
      style.textContent = `
        ${options.oldPlayer ? `
          .ytp-delhi-modern {
            --yr-legacy-toolbar-height: ${options.compact ? 40 : 45}px;
          }
          .ytp-delhi-modern .ytp-chrome-bottom { height: var(--yr-legacy-toolbar-height); }
          .ytp-delhi-modern .ytp-gradient-bottom { display: block !important; }
          .ytp-delhi-modern .ytp-chrome-controls :is(.ytp-left-controls, .ytp-right-controls, .ytp-button),
          .ytp-delhi-modern .ytp-chrome-controls .ytp-button:hover::after,
          .ytp-delhi-modern .ytp-chrome-controls .ytp-button:hover::before,
          .ytp-delhi-modern .ytp-volume-area,
          .ytp-delhi-modern .ytp-volume-area:hover::after {
            background: transparent !important;
          }
          .ytp-delhi-modern .ytp-time-wrapper:not(.ytp-miniplayer-ui *) {
            background: transparent !important;
            bottom: 5px !important;
          }
          .ytp-delhi-modern .ytp-time-current { font-weight: 400 !important; }
          .ytp-delhi-modern:not(.ytp-player-minimized) .ytp-progress-bar-container {
            bottom: var(--yr-legacy-toolbar-height);
          }
          .ytp-delhi-modern.ytp-big-mode:not(.ytp-xsmall-width-mode) :is(.ytp-chrome-bottom, .ytp-progress-bar-container) {
            bottom: 25px !important;
          }
          .ytp-delhi-modern .ytp-volume-panel[role="slider"] { position: relative; top: -5px; }
          .ytp-contextmenu.ytp-delhi-modern-contextmenu { background: rgb(28 28 28 / 90%) !important; }
          .ytp-delhi-modern .ytp-autonav-toggle-button { width: 32px; height: 15px; border-radius: 14px; }
          .ytp-delhi-modern .ytp-subtitles-button[aria-pressed="true"] .ytp-subtitles-button-icon::after {
            content: ""; position: absolute; inset: auto 20% 5px; height: 3px;
            border-radius: 5px; background: #c00;
          }
          ${options.compact ? `
            .ytp-delhi-modern:not(.ytp-big-mode) .ytp-chrome-controls .ytp-button { width: 39px !important; }
            .ytp-delhi-modern:not(.ytp-big-mode) .ytp-chrome-controls .ytp-button svg { width: 25px; height: 25px; }
            .ytp-contextmenu.ytp-delhi-modern-contextmenu { border-radius: 0 !important; }
            .ytp-contextmenu.ytp-delhi-modern-contextmenu .ytp-menuitem-icon { display: none !important; }
            .ytp-contextmenu.ytp-delhi-modern-contextmenu .ytp-menuitem-label { padding-inline-start: 10px; }
          ` : ''}
        ` : ''}
        ${options.oldPlayerIcons ? icons : ''}
        ${options.redProgress ? '.html5-video-player .ytp-play-progress, .ytd-app #progress { background: #f03 !important; }' : ''}
        ${options.square ? '#player-container #ytd-player, ytd-watch-flexy #movie_player, .ytp-contextmenu { border-radius: 0 !important; }' : ''}
        ${options.oldRecommendations ? `
          ytd-watch-flexy #related .yt-lockup-view-model--vertical { flex-direction: row !important; }
          ytd-watch-flexy #related .yt-lockup-view-model__content-image { flex: 0 0 170px; max-width: 170px !important; }
          ytd-watch-flexy #related yt-avatar-stack-view-model { display: none !important; }
        ` : ''}
        ${options.oldNavigation ? `
          #sections.ytd-guide-renderer { display: flex; flex-direction: column; }
          #sections.ytd-guide-renderer > :first-child { order: -3; }
          #sections.ytd-guide-renderer > ytd-guide-section-renderer:has(a[href="/feed/you"]) { order: -2; }
          #sections.ytd-guide-renderer > ytd-guide-section-renderer:has(a[href="/feed/subscriptions"]) { order: -1; }
          ytd-guide-entry-renderer[is-header] .guide-icon { display: block !important; }
          ytd-guide-entry-renderer[is-header] .title { font-size: 1.4rem !important; font-weight: 400 !important; }
          ytd-guide-entry-renderer[is-header] .arrow-icon { display: none !important; }
        ` : ''}
        ${options.hoverEffects ? `
          ytd-watch-metadata[description-collapsed] #description:hover { background: var(--yt-spec-additive-background) !important; }
          ytd-browse[page-subtype="home"] yt-touch-feedback-shape { display: none !important; }
        ` : ''}
        ${options.oldComments ? `
          .ytSubThreadThreadline { display: none !important; }
          ytd-comment-replies-renderer :is(.show-replies-button, .replies-continuation, #less-replies-sub-thread) {
            padding-inline-start: 50px !important; position: relative; top: -10px;
          }
          ytd-comment-replies-renderer .yt-spec-button-shape-next--text { color: #3ea6ff !important; }
          #expanded-threads { margin-inline-start: 50px !important; }
        ` : ''}
      `;
    }

    update(settings);
    return { onSettingsChange: update };
  },
};

const icons = `
  .ytp-delhi-modern-icons .ytp-chrome-controls .ytp-play-button svg { overflow: visible; }
  .ytp-delhi-modern-icons .ytp-play-button path[d^="M 17 8.6"],
  .ytp-delhi-modern-icons .ytp-play-button[data-title-no-tooltip="Play"] path {
    d: path("M12 26V10L25 18Z") !important;
  }
  .ytp-delhi-modern-icons .ytp-play-button path[d^="M 12.75 4.5"],
  .ytp-delhi-modern-icons .ytp-play-button[data-title-no-tooltip="Pause"] path {
    d: path("M12 10H16V26H12ZM21 10H25V26H21Z") !important;
  }
  .ytp-delhi-modern-icons .ytp-mute-button path[d^="M 11.60 2.08"] {
    d: path("M2 9V15H6L11 20V4L6 9ZM14 8V16C16 15 17 14 17 12S16 9 14 8ZM14 3V5C21 7 21 17 14 19V21C24 19 24 5 14 3Z") !important;
  }
  .ytp-delhi-modern-icons .ytp-mute-button path[d^="M11.60 2.08"] {
    d: path("M2 9V15H6L11 20V4L6 9ZM15 8L14 9L17 12L14 15L15 16L18 13L21 16L22 15L19 12L22 9L21 8L18 11Z") !important;
  }
  .ytp-delhi-modern-icons .ytp-subtitles-button path[d^="M21 3H3"] {
    d: path("M3 5H21V19H3ZM5 9V15H11V13H7V11H11V9ZM13 9V15H19V13H15V11H19V9Z") !important;
    fill-rule: evenodd;
  }
  .ytp-delhi-modern-icons .ytp-settings-button path[d^="M12.84 1H11.15"] {
    d: path("M19.4 13A7.8 7.8 0 0 0 19.5 12L19.4 11L21.5 9.4L19.5 6L17 7A8 8 0 0 0 15.3 6L15 3H9L8.7 6A8 8 0 0 0 7 7L4.5 6L2.5 9.4L4.6 11L4.5 12L4.6 13L2.5 14.6L4.5 18L7 17A8 8 0 0 0 8.7 18L9 21H15L15.3 18A8 8 0 0 0 17 17L19.5 18L21.5 14.6ZM12 15A3 3 0 1 1 12 9A3 3 0 0 1 12 15Z") !important;
    fill-rule: evenodd;
  }
  .ytp-delhi-modern-icons .ytp-size-button path[d^="M21.20 3.01"] {
    d: path("M2 5H22V19H2ZM4 7V17H20V7Z") !important; fill-rule: evenodd;
  }
  .ytp-delhi-modern-icons .ytp-fullscreen-button path[d^="M10 3H3V10"] {
    d: path("M4 4H10V6H6V10H4ZM14 4H20V10H18V6H14ZM4 14H6V18H10V20H4ZM18 14H20V20H14V18H18Z") !important;
  }
  .ytp-delhi-modern-icons .ytp-fullscreen-button path[d^="M3.29 3.29"] {
    d: path("M8 4H10V10H4V8H8ZM14 4H16V8H20V10H14ZM4 14H10V20H8V16H4ZM14 14H20V16H16V20H14Z") !important;
  }
`;

export default plugin;
