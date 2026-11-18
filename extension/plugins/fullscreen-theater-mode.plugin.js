// @ts-check

/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'fullscreen-theater-mode',
  name: 'Fullscreen Theater Mode',
  description: 'Make YouTube theater mode fill the viewport. Move to the top edge to slide the search bar into view.',
  version: '1.1.0',
  authors: ['Antinity'],
  options: {
    appearance: {
      type: 'group',
      label: 'Watch page appearance',
      options: {
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
          tooltip: 'Move the pointer to the top edge or tab into the header to slide it into view.',
        },
      },
    },
  },
  activate({ settings, onCleanup }) {
    const style = document.createElement('style');
    onCleanup(() => style.remove());

    function update(url = new URL(location.href)) {
      if (url.hostname !== 'www.youtube.com' || url.pathname !== '/watch' || !url.searchParams.has('v')) {
        style.remove();
        return;
      }

      style.textContent = `
        ytd-watch-flexy[theater]:not([fullscreen]) #player-full-bleed-container.ytd-watch-flexy {
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
            #masthead-container.ytd-app {
              translate: 0 -100%;
              transition: translate 250ms ease;
              background: #0f0f0f;
            }
            /* The transparent strip extends the hover target below the sliding header. */
            #masthead-container.ytd-app::after {
              content: '';
              position: absolute;
              inset: 100% 0 auto;
              height: 12px;
              background: transparent;
              pointer-events: auto;
            }
            #masthead-container.ytd-app:is(:hover, :focus-within) {
              translate: none;
            }
            #page-manager.ytd-app {
              margin-top: -6px;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            #masthead-container.ytd-app {
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
        settings = next;
        update();
      },
    };
  },
};

export default plugin;
