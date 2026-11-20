// @ts-check

// Based on the supplied Old player and Pre-delhi UI UserStyle by sussteve226.
/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'old-player-controls',
  name: 'Old Player Controls',
  description: 'Bring back classic player controls, with optional changes to the sidebar, descriptions, and comment threads.',
  version: '1.0.1',
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
        ${options.oldPlayer ? toolbar(options.compact === true, options.oldPlayerIcons === true) : ''}
        ${options.oldPlayerIcons ? icons : ''}
        ${options.redProgress ? '.html5-video-player .ytp-play-progress, .ytd-app #progress { background: #f03 !important; }' : ''}
        ${options.square ? '#player-container #ytd-player, ytd-watch-flexy #movie_player, .ytp-contextmenu { border-radius: 0 !important; }' : ''}
        ${options.oldRecommendations ? `
          .yt-lockup-view-model--horizontal .yt-lockup-view-model__content-image { max-width: 170px !important; }
          ytd-watch-flexy .yt-lockup-view-model--vertical .yt-lockup-view-model__content-image {
            min-width: 170px !important;
            padding-right: 4px !important;
          }
          ytd-watch-flexy .yt-lockup-view-model--vertical { flex-direction: row !important; }
          ytd-watch-flexy yt-avatar-stack-view-model.yt-avatar-stack-view-model--tappable,
          ytd-watch-flexy div[class="yt-spec-avatar-shape yt-spec-avatar-shape__button yt-spec-avatar-shape__button--button-medium yt-spec-avatar-shape__button--tappable"] {
            display: none !important;
          }
        ` : ''}
        ${options.oldNavigation ? `
          #sections.ytd-guide-renderer { display: flex; flex-direction: column; }
          #sections.ytd-guide-renderer > :first-child { order: -3; }
          #sections.ytd-guide-renderer > ytd-guide-section-renderer:nth-child(3):has(a[href="/feed/you"]) { order: -2; }
          #sections.ytd-guide-renderer > ytd-guide-section-renderer:nth-child(2):has(a[href="/feed/subscriptions"]) { order: -1; }
          ytd-guide-entry-renderer[is-header] .guide-icon.ytd-guide-entry-renderer { display: block !important; }
          ytd-guide-entry-renderer[is-header] .title.ytd-guide-entry-renderer {
            font-size: 1.4rem !important;
            line-height: 2rem !important;
            font-weight: 400 !important;
          }
          ytd-guide-entry-renderer[is-header] .arrow-icon.ytd-guide-entry-renderer { display: none !important; }
        ` : ''}
        ${options.hoverEffects ? `
          ytd-watch-metadata[description-collapsed]:hover #description.ytd-watch-metadata:hover {
            opacity: 1 !important;
            background: var(--yt-spec-additive-background) !important;
          }
          ytd-browse[page-subtype="home"] yt-touch-feedback-shape { display: none !important; }
        ` : ''}
        ${options.oldComments ? `
          .ytSubThreadThreadline { display: none !important; }
          :is(.show-replies-button, .replies-continuation, #less-replies-sub-thread).ytd-comment-replies-renderer {
            padding-left: 50px !important;
            position: relative;
            top: -10px !important;
          }
          :is(.show-replies-button, .replies-continuation, #less-replies-sub-thread).ytd-comment-replies-renderer
            .yt-spec-button-shape-next--mono.yt-spec-button-shape-next--text {
            color: #3ea6ff !important;
          }
          #expanded-threads { margin-left: 50px !important; }
        ` : ''}
      `;
    }

    update(settings);
    return { onSettingsChange: update };
  },
};

/** @param {boolean} compact @param {boolean} classicIcons */
function toolbar(compact, classicIcons) {
  return `
    .ytp-delhi-modern .ytp-chrome-controls { --yt-frosted-glass-backdrop-filter-override: none; }
    .ytp-chrome-controls .ytp-button:hover::after,
    .ytp-delhi-modern.ytp-delhi-horizontal-volume-controls .ytp-volume-area:hover::after {
      background: transparent !important;
      padding: 2px !important;
    }
    .ytp-delhi-modern .ytp-chrome-bottom { height: 45px !important; }
    .ytp-delhi-modern .ytp-gradient-bottom { display: block !important; }
    .ytp-delhi-modern.ytp-delhi-modern-compact-controls .ytp-chrome-controls .ytp-button {
      background: transparent !important;
      bottom: ${compact ? 2 : 5}px !important;
    }
    .ytp-delhi-modern .ytp-chrome-controls :is(.ytp-left-controls, .ytp-right-controls),
    .ytp-delhi-modern .ytp-chrome-controls .ytp-right-controls .ytp-button:hover::before,
    .ytp-delhi-modern.ytp-delhi-horizontal-volume-controls .ytp-volume-area,
    .ytp-delhi-modern .ytp-time-wrapper:not(.ytp-miniplayer-ui *):hover::after {
      background: transparent !important;
    }
    .ytp-delhi-modern .ytp-time-wrapper:not(.ytp-miniplayer-ui *) {
      background: transparent !important;
      bottom: 5px !important;
    }
    .ytp-delhi-modern .ytp-time-wrapper:not(.ytp-miniplayer-ui *) .ytp-time-current { font-weight: 400 !important; }
    .ytp-delhi-modern:not(.ytp-player-minimized) .ytp-progress-bar-container { bottom: ${compact ? 40 : 45}px !important; }
    .ytp-delhi-modern.ytp-big-mode:not(.ytp-xsmall-width-mode) :is(.ytp-chrome-bottom, .ytp-progress-bar-container) {
      bottom: 25px !important;
    }
    .ytp-delhi-modern.ytp-big-mode:not(.ytp-xsmall-width-mode) .ytp-chrome-controls :is(.ytp-play-button, .ytp-play-button-playlist) {
      height: 50px !important;
      width: 50px !important;
    }
    .ytp-delhi-modern.ytp-big-mode:not(.ytp-xsmall-width-mode) .ytp-chapter-title.ytp-button { background: transparent !important; }
    .ytp-volume-slider-active .ytp-volume-panel,
    .ytp-volume-panel[role="slider"] {
      top: -5px !important;
      position: relative;
      margin-right: -20px !important;
    }
    .ytp-contextmenu.ytp-delhi-modern-contextmenu { background: rgb(28 28 28 / 90%) !important; }
    .ytp-button.ytp-autonav-toggle .ytp-autonav-toggle-button-container .ytp-autonav-toggle-button {
      background: #5f5f5f !important;
      height: 15px;
      width: 32px;
      border-radius: 14px;
    }
    .ytp-button.ytp-autonav-toggle .ytp-autonav-toggle-button-container .ytp-autonav-toggle-button::after {
      background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxNyAxNyIgZmlsbD0ibm9uZSI+PGRlZnMgLz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTguNSAxNmE3LjUgNy41IDAgMTAwLTE1IDcuNSA3LjUgMCAwMDAgMTV6IiBmaWxsPSIjNzE3MTcxIiAvPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTcgOC41YTguNSA4LjUgMCAxMS0xNyAwIDguNSA4LjUgMCAwMTE3IDB6bS0xIDBhNy41IDcuNSAwIDExLTE1IDAgNy41IDcuNSAwIDAxMTUgMHoiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iLjE1IiAvPjxwYXRoIGQ9Ik01LjUgMTJoMlY1aC0ydjd6TTkuNSA1djdoMlY1aC0yeiIgZmlsbD0iI2ZmZiIgLz48L3N2Zz4=') !important;
      background-size: 115%;
      transition: all .08s cubic-bezier(.4, 0, 1, 1);
      top: -2px;
    }
    .ytp-button.ytp-autonav-toggle .ytp-autonav-toggle-button-container .ytp-autonav-toggle-button[aria-checked="true"]::after {
      background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxNyAxNyIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xNyA4LjVhOC41IDguNSAwIDExLTE3IDAgOC41IDguNSAwIDAxMTcgMHptLTUgMEw2LjUgNXY3TDEyIDguNXptLTEuODYgMEw3LjUgNi44MnYzLjM2bDIuNjQtMS42OHpNOC41IDE2YTcuNSA3LjUgMCAxMDAtMTUgNy41IDcuNSAwIDAwMCAxNXoiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iLjE1IiAvPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTYgOC41YTcuNSA3LjUgMCAxMS0xNSAwIDcuNSA3LjUgMCAwMTE1IDB6bS00IDBMNi41IDEyVjVMMTIgOC41eiIgZmlsbD0iI2ZmZiIgLz48L3N2Zz4=') !important;
    }
    .ytp-delhi-modern .ytp-subtitles-button[aria-pressed="true"] .ytp-subtitles-button-icon::after {
      content: "";
      display: block;
      position: absolute;
      width: ${classicIcons ? 25 : 30}px;
      left: ${classicIcons ? 20 : 10}px;
      bottom: 5px;
      height: 3px;
      background-color: #c00;
      border-radius: 5px;
    }
    ${compact ? `
      .ytp-delhi-modern .ytp-chrome-controls .ytp-right-controls .ytp-button {
        width: 45px !important;
        left: 5px !important;
      }
      .ytp-contextmenu.ytp-delhi-modern-contextmenu { border-radius: 0 !important; }
      .ytp-contextmenu.ytp-delhi-modern-contextmenu .ytp-menuitem-icon { display: none !important; }
      .ytp-contextmenu.ytp-delhi-modern-contextmenu .ytp-menuitem-label {
        left: 10px !important;
        position: relative;
      }
      .ytp-contextmenu.ytp-delhi-modern-contextmenu .ytp-menuitem:not(.ytp-menuitem-with-footer) { height: 33px !important; }
      ${classicIcons ? `
        .ytp-delhi-modern .ytp-chrome-controls .ytp-left-controls .ytp-button:not(.ytp-play-button) {
          right: 5px !important;
          width: 35px !important;
        }
        .ytp-delhi-modern .ytp-chrome-controls .ytp-left-controls .ytp-button.ytp-play-button {
          right: 4px !important;
          width: 37px !important;
        }
      ` : ''}
    ` : ''}
  `;
}

const icons = `
  .ytp-delhi-modern .ytp-chrome-controls .ytp-left-controls {
    position: relative;
    right: 6px !important;
  }
  .ytp-delhi-modern .ytp-chrome-controls .ytp-right-controls {
    position: relative;
    right: 2px !important;
  }
  .ytp-delhi-modern .ytp-chrome-controls .ytp-right-controls [data-title-no-tooltip="Exit full screen"] {
    bottom: -5px !important;
    right: -8px !important;
  }
  .ytp-delhi-modern-icons:not(.ytp-big-mode) .ytp-chrome-controls .ytp-play-button svg {
    width: 39px !important;
    height: 39px !important;
    bottom: 8px !important;
    position: relative;
    overflow: visible;
  }
  .ytp-delhi-modern-icons.ytp-big-mode .ytp-chrome-controls .ytp-play-button svg {
    height: 25px !important;
    width: 25px !important;
  }
  .ytp-chrome-controls :is(.ytp-svg-volume-animation-small-ripple, .ytp-svg-volume-animation-big-ripple) {
    display: none !important;
  }
  .ytp-delhi-modern.ytp-delhi-horizontal-volume-controls .ytp-volume-area .ytp-volume-icon svg,
  .ytp-delhi-modern .ytp-chrome-controls .ytp-right-controls svg {
    overflow: visible;
    bottom: 8px !important;
    position: relative;
    width: 27px !important;
    height: 27px !important;
  }
  .ytp-delhi-modern.ytp-delhi-horizontal-volume-controls .ytp-volume-area .ytp-volume-icon svg {
    right: 4px !important;
    width: 26px !important;
    height: 26px !important;
  }
  .ytp-chrome-controls .ytp-chapter-title.ytp-button { right: 16px !important; }
  .ytp-chrome-controls .ytp-button.ytp-settings-button[aria-expanded="true"] { transform: translate(5px, -2px); }

  :where(.ytp-chrome-controls, .ytp-miniplayer-ui) .ytp-play-button[data-title-no-tooltip="Play"] path,
  :where(.ytp-chrome-controls, .ytp-miniplayer-ui) path[d^="M 17 8.6 L 10.89 4.99"] {
    d: path("M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z") !important;
  }
  :where(.ytp-chrome-controls, .ytp-miniplayer-ui) .ytp-play-button[data-title-no-tooltip="Pause"] path,
  :where(.ytp-chrome-controls, .ytp-miniplayer-ui) path[d^="M 12.75 4.5 L 9.75 4.5"] {
    d: path("M 12,26 16,26 16,10 12,10 z M 21,26 25,26 25,10 21,10 z") !important;
  }
  :where(.ytp-chrome-controls, .ytp-miniplayer-ui) path[d^="M 11.60 2.08 L 11.48 2.14"] {
    d: path("M8,21 L12,21 L17,26 L17,10 L12,15 L8,15 L8,21 Z M19,14 L19,22 C20.48,21.32 21.5,19.77 21.5,18 C21.5,16.26 20.48,14.74 19,14 ZM19,11.29 C21.89,12.15 24,14.83 24,18 C24,21.17 21.89,23.85 19,24.71 L19,26.77 C23.01,25.86 26,22.28 26,18 C26,13.72 23.01,10.14 19,9.23 L19,11.29 Z") !important;
  }
  :where(.ytp-chrome-controls, .ytp-miniplayer-ui) path[d^="M11.60 2.08L11.48 2.14"] {
    d: path("m 21.48,17.98 c 0,-1.77 -1.02,-3.29 -2.5,-4.03 v 2.21 l 2.45,2.45 c .03,-0.2 .05,-0.41 .05,-0.63 z m 2.5,0 c 0,.94 -0.2,1.82 -0.54,2.64 l 1.51,1.51 c .66,-1.24 1.03,-2.65 1.03,-4.15 0,-4.28 -2.99,-7.86 -7,-8.76 v 2.05 c 2.89,.86 5,3.54 5,6.71 z M 9.25,8.98 l -1.27,1.26 4.72,4.73 H 7.98 v 6 H 11.98 l 5,5 v -6.73 l 4.25,4.25 c -0.67,.52 -1.42,.93 -2.25,1.18 v 2.06 c 1.38,-0.31 2.63,-0.95 3.69,-1.81 l 2.04,2.05 1.27,-1.27 -9,-9 -7.72,-7.72 z m 7.72,.99 -2.09,2.08 2.09,2.09 V 9.98 z") !important;
  }
  :where(.ytp-chrome-controls, .ytp-miniplayer-ui) .ytp-subtitles-button path[d^="M21 3H3C2.46"],
  :where(.ytp-chrome-controls, .ytp-miniplayer-ui) .ytp-subtitles-button path[d^="M21.20 3.01L21 3H3"] {
    d: path("M11,11 C9.89,11 9,11.9 9,13 L9,23 C9,24.1 9.89,25 11,25 L25,25 C26.1,25 27,24.1 27,23 L27,13 C27,11.9 26.1,11 25,11 L11,11 Z M17,17 L15.5,17 L15.5,16.5 L13.5,16.5 L13.5,19.5 L15.5,19.5 L15.5,19 L17,19 L17,20 C17,20.55 16.55,21 16,21 L13,21 C12.45,21 12,20.55 12,20 L12,16 C12,15.45 12.45,15 13,15 L16,15 C16.55,15 17,15.45 17,16 L17,17 L17,17 Z M24,17 L22.5,17 L22.5,16.5 L20.5,16.5 L20.5,19.5 L22.5,19.5 L22.5,19 L24,19 L24,20 C24,20.55 23.55,21 23,21 L20,21 C19.45,21 19,20.55 19,20 L19,16 C19,15.45 19.45,15 20,15 L23,15 C23.55,15 24,15.45 24,16 L24,17 L24,17 Z") !important;
  }
  :where(.ytp-chrome-controls, .ytp-miniplayer-ui) .ytp-settings-button path[d^="M12.84 1H11.15"] {
    d: path("m 23.94,18.78 c .03,-0.25 .05,-0.51 .05,-0.78 0,-0.27 -0.02,-0.52 -0.05,-0.78 l 1.68,-1.32 c .15,-0.12 .19,-0.33 .09,-0.51 l -1.6,-2.76 c -0.09,-0.17 -0.31,-0.24 -0.48,-0.17 l -1.99,.8 c -0.41,-0.32 -0.86,-0.58 -1.35,-0.78 l -0.30,-2.12 c -0.02,-0.19 -0.19,-0.33 -0.39,-0.33 l -3.2,0 c -0.2,0 -0.36,.14 -0.39,.33 l -0.30,2.12 c -0.48,.2 -0.93,.47 -1.35,.78 l -1.99,-0.8 c -0.18,-0.07 -0.39,0 -0.48,.17 l -1.6,2.76 c -0.10,.17 -0.05,.39 .09,.51 l 1.68,1.32 c -0.03,.25 -0.05,.52 -0.05,.78 0,.26 .02,.52 .05,.78 l -1.68,1.32 c -0.15,.12 -0.19,.33 -0.09,.51 l 1.6,2.76 c .09,.17 .31,.24 .48,.17 l 1.99,-0.8 c .41,.32 .86,.58 1.35,.78 l .30,2.12 c .02,.19 .19,.33 .39,.33 l 3.2,0 c .2,0 .36,-0.14 .39,-0.33 l .30,-2.12 c .48,-0.2 .93,-0.47 1.35,-0.78 l 1.99,.8 c .18,.07 .39,0 .48,-0.17 l 1.6,-2.76 c .09,-0.17 .05,-0.39 -0.09,-0.51 l -1.68,-1.32 0,0 z m -5.94,2.01 c -1.54,0 -2.8,-1.25 -2.8,-2.8 0,-1.54 1.25,-2.8 2.8,-2.8 1.54,0 2.8,1.25 2.8,2.8 0,1.54 -1.25,2.8 -2.8,2.8 l 0,0 z") !important;
  }
  :where(.ytp-chrome-controls, .ytp-miniplayer-ui) .ytp-size-button path[d$="4.98 6.60 14.79 6.79ZM3 19V17H21V19H3Z"] {
    d: path("m 28,11 0,14 -20,0 0,-14 z m -18,2 16,0 0,10 -16,0 0,-10 z") !important;
    fill-rule: evenodd;
  }
  :where(.ytp-chrome-controls, .ytp-miniplayer-ui) .ytp-size-button path[d$="5.98 6.60 5.79 6.79ZM3 19V17H21V19H3Z"] {
    d: path("m 26,13 0,10 -16,0 0,-10 z m -14,2 12,0 0,6 -12,0 0,-6 z") !important;
    fill-rule: evenodd;
  }
  :where(.ytp-chrome-controls, .ytp-miniplayer-ui) .ytp-fullscreen-button path[d^="M10 3H3V10C3 10.26"] {
    d: path("M10 16h2v-4h4v-2h-6v6zM20 10v2h4v4h2v-6h-6zM24 24h-4v2h6v-6h-2v4zM12 20h-2v6h6v-2h-4v-4") !important;
  }
  :where(.ytp-chrome-controls, .ytp-miniplayer-ui) .ytp-fullscreen-button path[d^="M3.29 3.29C3.11 3.46"] {
    d: path("M1 6H7V0H5V4H1V6Zm14 4H11v6h2V12h4V10ZM7 15V10H1v2H5v4H7ZM11 1V6h6V4H13V0H11Z");
  }
`;

export default plugin;
