// @ts-check

// Based on the supplied UserStyle by amkitakk.
/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'watched-overlay',
  name: 'Watched Overlay',
  description: 'Darken thumbnails and label them when YouTube shows watch progress.',
  version: '1.0.0',
  authors: ['Antinity'],
  activate({ onCleanup }) {
    const overlay = 'yt-thumbnail-bottom-overlay-view-model:has(yt-thumbnail-overlay-progress-bar-view-model)';
    const style = document.createElement('style');
    style.textContent = `
      ${overlay} {
        background: rgb(0 0 0 / 80%) !important;
        height: 100%;
      }
      ${overlay}::before {
        content: "WATCHED";
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        color: white;
        font-size: clamp(1.1rem, 2.5em, 3rem);
        font-weight: 700;
        pointer-events: none;
      }
    `;
    (document.head ?? document.documentElement).append(style);
    onCleanup(() => style.remove());
  },
};

export default plugin;
