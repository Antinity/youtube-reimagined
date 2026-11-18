// @ts-check

/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'fullscreen-theater-mode',
  name: 'Fullscreen Theater Mode',
  description: 'Make YouTube theater mode fill the viewport. Move to the top edge to slide the search bar into view.',
  version: '1.2.0',
  authors: ['Antinity'],
  options: {
    appearance: {
      type: 'group',
      label: 'Watch page appearance',
      options: {
        alwaysTheater: {
          type: 'boolean', label: 'Always Enable Theater Mode', default: false,
          tooltip: 'Open each video in YouTube’s theater mode. You can still switch back while watching.',
        },
        geometry: {
          type: 'group',
          label: 'Theater layout',
          options: {
            playerHeight: {
              type: 'number', label: 'Player height (vh)', default: 100.5, min: 50, max: 125, step: 0.1,
              tooltip: 'Sets the theater player height as a percentage of the viewport. Browser fullscreen is excluded.',
            },
            columnsOffset: {
              type: 'number', label: 'Space above video details (px)', default: 175, min: 0, max: 500, integer: true,
              tooltip: 'Sets the top margin above the details and recommendations below the full-bleed player.',
            },
          },
        },
        hoverHeader: {
          type: 'boolean', label: 'Reveal search bar on hover', default: true,
          tooltip: 'In theater mode, move the pointer to the top edge or tab into the header to reveal it.',
        },
      },
    },
  },
  activate({ settings, onCleanup }) {
    if (location.hostname !== 'www.youtube.com') return;

    const style = document.createElement('style');
    const root = document.documentElement;
    const listeners = new AbortController();
    const theater = 'ytd-watch-flexy[theater]:not([hidden], [fullscreen])';
    const header = '#masthead-container.ytd-app';
    const revealed = 'data-yr-theater-header-open';
    const hoverHeight = 12;
    /** @type {string | null} */
    let videoId = null;
    let handledVideo = false;
    let attempts = 0;
    /** @type {number | undefined} */
    let theaterRetry;
    const playerObserver = new MutationObserver((changes) => {
      if (changes.some(({ target, attributeName }) => (attributeName === 'theater' || attributeName === 'fullscreen')
        && target instanceof Element && target.matches('ytd-watch-flexy'))) hideHeader();
      if (settings.alwaysTheater && !handledVideo) enterTheater();
    });

    function hideHeader() {
      root.removeAttribute(revealed);
    }

    function cancelRetry() {
      window.clearTimeout(theaterRetry);
      theaterRetry = undefined;
    }

    function resetTheaterAttempt() {
      cancelRetry();
      handledVideo = false;
      attempts = 0;
    }

    function observeMode() {
      playerObserver.disconnect();
      if (settings.hoverHeader) {
        playerObserver.observe(root, { subtree: true, attributes: true, attributeFilter: ['theater', 'fullscreen'] });
      }
    }

    function enterTheater() {
      const watch = document.querySelector('ytd-watch-flexy:not([hidden])');
      if (!watch || watch.hasAttribute('fullscreen')) return false;
      if (watch.getAttribute('video-id') !== videoId) return false;

      if (!watch.hasAttribute('theater')) {
        const button = watch.querySelector('button.ytp-size-button');
        if (theaterRetry !== undefined || !(button instanceof HTMLButtonElement) || button.disabled
          || button.getAttribute('aria-disabled') === 'true') return false;

        button.click();
        attempts++;
        if (!watch.hasAttribute('theater') && attempts < 5) {
          // The button can appear before YouTube connects its theater handler.
          theaterRetry = window.setTimeout(() => {
            theaterRetry = undefined;
            enterTheater();
          }, 400 * 2 ** (attempts - 1));
          return false;
        }
      }

      // Let manual toggles take effect for the rest of this video.
      handledVideo = true;
      cancelRetry();
      observeMode();
      return true;
    }

    // Track the pointer at the viewport edge without covering YouTube's player or navbar controls.
    document.addEventListener('pointermove', (event) => {
      const wasOpen = root.hasAttribute(revealed);
      if (!wasOpen && event.clientY >= hoverHeight) return;
      if (!videoId || !settings.hoverHeader || event.pointerType === 'touch' || !document.querySelector(theater)) {
        hideHeader();
        return;
      }
      const navbar = wasOpen ? document.querySelector(header) : null;
      const limit = navbar instanceof HTMLElement ? navbar.offsetHeight + hoverHeight : hoverHeight;
      root.toggleAttribute(revealed, event.clientY >= 0 && event.clientY < limit);
    }, { capture: true, passive: true, signal: listeners.signal });
    root.addEventListener('pointerleave', hideHeader, { signal: listeners.signal });
    window.addEventListener('blur', hideHeader, { signal: listeners.signal });

    onCleanup(() => {
      listeners.abort();
      playerObserver.disconnect();
      cancelRetry();
      hideHeader();
      style.remove();
    });

    function update(url = new URL(location.href)) {
      const nextVideo = url.pathname === '/watch' ? url.searchParams.get('v') : null;
      if (nextVideo !== videoId) {
        videoId = nextVideo;
        resetTheaterAttempt();
        hideHeader();
      }
      playerObserver.disconnect();
      if (!videoId) {
        style.remove();
        return;
      }
      if (!settings.hoverHeader) hideHeader();

      if (!settings.alwaysTheater || handledVideo) {
        observeMode();
      } else if (!enterTheater()) {
        playerObserver.observe(root, {
          childList: true, subtree: true, attributes: true,
          attributeFilter: ['video-id', 'theater', 'fullscreen', 'hidden', 'disabled', 'aria-disabled'],
        });
      }

      style.textContent = `
        ${theater} #player-full-bleed-container.ytd-watch-flexy {
          height: ${settings.playerHeight}vh;
          max-height: ${settings.playerHeight}vh;
        }
        ytd-watch-flexy[full-bleed-player] #columns.ytd-watch-flexy {
          margin-top: ${settings.columnsOffset}px;
        }
        ytd-player#ytd-player,
        #movie_player.html5-video-player.ytp-autonav-endscreen-cancelled-state.ended-mode,
        #movie_player.html5-video-player.ytp-fullscreen {
          background-color: #000;
        }
        ${settings.hoverHeader ? `
          @media (any-hover: hover) {
            :root:has(${theater}) ${header} {
              translate: 0 -100%;
              transition: translate 250ms ease;
              background: #0f0f0f;
            }
            :root[${revealed}]:has(${theater}) ${header},
            :root:has(${theater}) ${header}:focus-within {
              translate: none;
            }
            :root:has(${theater}) #page-manager.ytd-app {
              margin-top: -6px;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            :root:has(${theater}) ${header} {
              transition: none;
            }
          }
        ` : ''}
      `;
      if (!style.isConnected) (document.head ?? document.documentElement).append(style);
    }

    update();
    return {
      onNavigate: update,
      onSettingsChange(next) {
        if (next.alwaysTheater !== settings.alwaysTheater) resetTheaterAttempt();
        settings = next;
        update();
      },
    };
  },
};

export default plugin;
