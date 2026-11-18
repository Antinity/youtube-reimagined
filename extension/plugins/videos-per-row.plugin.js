// @ts-check

/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'videos-per-row',
  name: 'Videos Per Row',
  description: 'Customize desktop YouTube grids, thumbnails, text, and filters.',
  version: '1.1.0',
  authors: ['YouTube Reimagined'],
  contributors: ['Antinity'],
  options: {
    layout: {
      type: 'group',
      label: 'Home and video grids',
      options: {
        enableHomeTweaks: { type: 'boolean', label: 'Customize video grids', default: true },
        columns: { type: 'number', label: 'Videos per row', tooltip: 'Applies to desktop video grids such as Home and channel videos.', default: 4, min: 1, max: 12, integer: true },
        spacing: {
          type: 'group',
          label: 'Spacing',
          options: {
            horizontalGap: { type: 'number', label: 'Column gap (px)', default: 8, min: 0, max: 200, integer: true },
            verticalGap: { type: 'number', label: 'Row gap (px)', default: 10, min: 0, max: 200, integer: true },
          },
        },
        homeWidth: { type: 'range', label: 'Home width (%)', default: 100, min: 0, max: 100 },
        hideGameShelf: { type: 'boolean', label: 'Hide game shelf', default: false },
      },
    },
    typography: {
      type: 'group',
      label: 'Typography',
      options: {
        enableTypography: { type: 'boolean', label: 'Customize typography', default: true },
        titleSize: { type: 'number', label: 'Title size (rem)', default: 1.4, min: 1, max: 6, step: 0.1 },
        titleWeight: { type: 'number', label: 'Title weight', default: 500, min: 100, max: 900, step: 100 },
        metadataSize: { type: 'number', label: 'Metadata size (rem)', default: 1.3, min: 1, max: 6, step: 0.1 },
        metadataWeight: { type: 'number', label: 'Metadata weight', default: 400, min: 100, max: 900, step: 100 },
      },
    },
    search: {
      type: 'group',
      label: 'Search results',
      options: {
        enableSearch: { type: 'boolean', label: 'Customize search', default: true },
        searchWidth: { type: 'select', label: 'Results width', default: 'default',
          choices: { default: 'Default', full: 'Full' } },
        searchAlignment: { type: 'select', label: 'Header alignment', tooltip: 'Applies when Results width is set to Full.', default: 'default',
          choices: { default: 'Default', center: 'Center', left: 'Left', right: 'Right' } },
        searchGrid: { type: 'boolean', label: 'Use a search grid', default: false },
        searchColumns: { type: 'number', label: 'Search columns', default: 6, min: 1, max: 12, integer: true },
        searchThumbnailWidth: { type: 'number', label: 'List thumbnail width (px)', tooltip: 'Applies when the search grid is off.', default: 240, min: 50, max: 900, integer: true },
        hideSearchShorts: { type: 'boolean', label: 'Hide Shorts in search', default: false },
        hideExpandableMetadata: { type: 'boolean', label: 'Hide expandable metadata', default: false },
        hideSearchRecommendations: { type: 'boolean', label: 'Hide recommended shelves', default: false },
      },
    },
    watch: {
      type: 'group',
      label: 'Watch page',
      options: {
        enableWatch: { type: 'boolean', label: 'Customize watch page', default: true },
        watchGrid: { type: 'boolean', label: 'Stack related thumbnails above titles', default: false },
        customWatchThumbnailWidth: { type: 'boolean', label: 'Set related thumbnail width', default: false },
        watchThumbnailWidth: { type: 'number', label: 'Related thumbnail width (rem)', tooltip: 'Enable custom width and turn off thumbnail stacking to use this value.', default: 20, min: 0, max: 100, integer: true },
        hideHoverPreview: { type: 'boolean', label: 'Hide video preview on hover', default: false },
      },
    },
    filters: {
      type: 'group',
      label: 'Filters and visibility',
      options: {
        enableFilters: { type: 'boolean', label: 'Apply visibility filters', default: true },
        viewedMode: { type: 'select', label: 'Viewed videos', default: 'none',
          choices: { none: 'Keep', grayscale: 'Grayscale', remove: 'Hide' } },
        viewedStyle: { type: 'select', label: 'Grayscale target', tooltip: 'Selects which part of a viewed video is desaturated in Grayscale mode.', default: 'all',
          choices: { all: 'Entire card', thumbnail: 'Thumbnail', progress: 'Progress bar', both: 'Thumbnail and progress bar' } },
        grayscale: { type: 'range', label: 'Grayscale intensity (%)', default: 80, min: 0, max: 100 },
        hideBanners: { type: 'boolean', label: 'Hide banners and surveys', default: false },
        hideShorts: { type: 'boolean', label: 'Hide Shorts across YouTube', default: false },
        hideAutoDubbed: { type: 'boolean', label: 'Hide auto-dubbed videos', default: false },
        hideMixes: { type: 'boolean', label: 'Hide YouTube Mixes', default: false },
        hideMembersOnly: { type: 'boolean', label: 'Hide members-only videos', default: false },
      },
    },
  },
  activate({ settings, onCleanup }) {
    if (location.hostname !== 'www.youtube.com') return;

    const style = document.createElement('style');
    onCleanup(() => style.remove());

    /** @param {import('../plugin-engine').PluginSettings} values */
    function update(values) {
      const rules = [];

      if (values.enableHomeTweaks) {
        rules.push(`
          ${richGrid} {
            display: grid !important;
            grid-template-columns: repeat(${values.columns}, minmax(0, 1fr));
            gap: ${values.verticalGap}px ${values.horizontalGap}px;
          }
          ${richRows}, ${richRows} > #contents {
            display: contents !important;
          }
          ${richGrid} > ytd-rich-item-renderer, ${richRows} > #contents > ytd-rich-item-renderer {
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
            margin: 0 !important;
          }
          ${richGrid} > :not(ytd-rich-item-renderer, ytd-rich-grid-row),
          ${richRows} > #contents > :not(ytd-rich-item-renderer) {
            grid-column: 1 / -1;
          }
          ytd-browse[page-subtype="home"] ytd-two-column-browse-results-renderer {
            width: ${values.homeWidth}% !important;
            margin-inline: auto;
          }
          #home-container-media { grid-template-columns: repeat(${values.columns}, minmax(0, 1fr)); }
          .rich-grid-media-skeleton { min-width: 0 !important; }
        `);
        if (values.hideGameShelf) rules.push('ytd-browse[page-subtype="home"] ytd-rich-section-renderer:has([is-mini-game-card-shelf]) ' + hide);
      }

      if (values.enableTypography) rules.push(`
        :is(#video-title.ytd-rich-grid-media, #video-title.ytd-video-renderer, #video-title.ytd-radio-renderer,
            #video-title.ytd-grid-video-renderer, #video-title.ytd-compact-video-renderer,
            #video-title.ytd-playlist-renderer, #video-title.ytd-playlist-panel-video-renderer,
            #channel-title.ytd-channel-renderer, .yt-lockup-metadata-view-model__title,
            .yt-lockup-metadata-view-model-wiz__title, .ytLockupMetadataViewModelTitle) {
          font-size: ${values.titleSize}rem !important;
          font-weight: ${values.titleWeight} !important;
        }
        :is(#metadata-line, #metadata.ytd-channel-renderer, .ytd-channel-renderer#description,
            ytd-video-meta-block #byline-container, .metadata-snippet-container.ytd-video-renderer,
            .metadata-snippet-container-one-line.ytd-video-renderer,
            .yt-content-metadata-view-model__metadata-text, .yt-content-metadata-view-model-wiz__metadata-text,
            .ytContentMetadataViewModelMetadataText) {
          font-size: ${values.metadataSize}rem !important;
          font-weight: ${values.metadataWeight} !important;
        }
      `);

      if (values.enableSearch) {
        if (values.searchWidth === 'full') {
          rules.push(`${searchPage} ytd-two-column-search-results-renderer > #primary { max-width: none !important; }`);
          const margins = { center: 'auto', left: '0 auto', right: 'auto 0' };
          if (values.searchAlignment === 'center' || values.searchAlignment === 'left' || values.searchAlignment === 'right') {
            rules.push(`${searchPage} #header:has(> ytd-search-header-renderer) {
              display: flex;
              width: fit-content;
              margin-inline: ${margins[values.searchAlignment]} !important;
            }`);
          }
        }

        if (values.searchGrid) rules.push(`
          ${searchPage} ytd-section-list-renderer > #contents {
            display: grid !important;
            grid-template-columns: repeat(${values.searchColumns}, minmax(0, 1fr));
            gap: 10px 5px;
          }
          ${searchPage} ytd-section-list-renderer ytd-item-section-renderer,
          ${searchPage} ytd-item-section-renderer > #contents { display: contents !important; }
          ${searchPage} :is(ytd-section-list-renderer, ytd-item-section-renderer) > #contents
            > :not(ytd-item-section-renderer, ytd-video-renderer, yt-lockup-view-model) { grid-column: 1 / -1; }
          ${searchPage} :is(ytd-video-renderer, yt-lockup-view-model) { min-width: 0; margin: 0 !important; }
          ${searchPage} ytd-video-renderer #dismissible,
          ${searchPage} :is(.ytLockupViewModelHorizontal, .yt-lockup-view-model--horizontal) {
            display: flex;
            flex-direction: column;
          }
          ${searchPage} :is(ytd-video-renderer ytd-thumbnail, .ytLockupViewModelContentImage, .yt-lockup-view-model__content-image) {
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
            margin: 0 !important;
          }
        `);
        else rules.push(`
          ${searchPage} :is(ytd-video-renderer ytd-thumbnail, .ytLockupViewModelContentImage, .yt-lockup-view-model__content-image) {
            width: ${values.searchThumbnailWidth}px !important;
            min-width: 0 !important;
            max-width: 100% !important;
            flex-shrink: 0;
          }
        `);

        if (values.hideSearchShorts) rules.push(`${searchPage} :is(ytd-reel-shelf-renderer, ${shortsShelf}, ${shortsCards}) ${hide}`);
        if (values.hideExpandableMetadata) rules.push(`${searchPage} :is(#expandable-metadata, ytd-expandable-metadata-renderer) ${hide}`);
        if (values.hideSearchRecommendations) rules.push(`${searchPage} ytd-item-section-renderer > #contents > ytd-shelf-renderer ${hide}`);
      }

      if (values.enableWatch) {
        if (values.watchGrid) rules.push(`
          ${watchLockup}, ${watchPage} #related ytd-compact-video-renderer #dismissible {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr);
          }
          ${watchPage} #related :is(ytd-thumbnail, .ytLockupViewModelContentImage, .ytLockupViewModelMetadata,
              .yt-lockup-view-model__content-image, .yt-lockup-view-model__metadata) {
            width: 100% !important;
            max-width: none !important;
          }
        `);
        else if (values.customWatchThumbnailWidth) rules.push(`
          ${watchPage} #related :is(ytd-thumbnail, .ytLockupViewModelContentImage, .yt-lockup-view-model__content-image) {
            width: ${values.watchThumbnailWidth}rem !important;
            max-width: 100% !important;
          }
        `);
        if (values.hideHoverPreview) rules.push('#video-preview.ytd-app ' + hide);
      }

      if (values.enableFilters) {
        if (values.viewedMode === 'remove') rules.push(`${watched} ${hide}`);
        if (values.viewedMode === 'grayscale') {
          const thumbnail = `${watched} :is(ytd-thumbnail img, yt-thumbnail-view-model img)`;
          const progressBar = `${watched} .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment`;
          const target = values.viewedStyle === 'both' ? `${thumbnail}, ${progressBar}`
            : values.viewedStyle === 'thumbnail' ? thumbnail
            : values.viewedStyle === 'progress' ? progressBar
            : watched;
          rules.push(`${target} { filter: grayscale(${values.grayscale}%) !important; }`);
        }
        if (values.hideBanners) rules.push(`#big-yoodle, ytd-rich-section-renderer:has(a[title][href="/feed/storefront"], ytd-inline-survey-renderer) ${hide}`);
        if (values.hideShorts) rules.push(`
          ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts], ${shortsShelf}, ${shortsCards},
          ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2,
          ytd-rich-section-renderer:has([is-shorts], .shortsLockupViewModelHost), [tab-title="Shorts"],
          :is(ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer):has(a[title="Shorts"], a[href="/shorts"]) ${hide}
        `);
        if (values.hideAutoDubbed) rules.push(`
          ${entry}:has(:is(yt-badge-view-model, ytd-badge-supported-renderer, badge-shape)
            :is([aria-label*="auto-dubbed" i], [title*="auto-dubbed" i], path[d^="M11.72 11.928A4"]),
            [aria-label="Auto-dubbed" i], [title="Auto-dubbed" i]) ${hide}
        `);
        if (values.hideMixes) rules.push(`
          ytd-radio-renderer, :is(ytd-rich-item-renderer, yt-lockup-view-model):has(a[href*="list=RD"]) ${hide}
        `);
        if (values.hideMembersOnly) rules.push(`
          ${entry}:has(:is([aria-label="Members only" i], [title="Members only" i],
            .badge-style-type-members-only, yt-badge-view-model path[d^="M6 .5a5.5"])) ${hide}
        `);
      }

      style.textContent = rules.join('\n');
    }

    update(settings);
    (document.head ?? document.documentElement).append(style);
    return { onSettingsChange: update };
  },
};

const shortsShelf = 'grid-shelf-view-model:has(.shortsLockupViewModelHost, a[href^="/shorts/"])';
const shortsCards = ':is(ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model):has(a[href^="/shorts/"], [overlay-style="SHORTS"])';
const entry = ':is(ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model)';
const progress = 'yt-thumbnail-overlay-progress-bar-view-model';
const watched = `${entry}:has(${progress}):not(${entry} ${entry})`;
const richGrid = 'ytd-rich-grid-renderer:not([is-shorts-grid]) > #contents';
const richRows = `${richGrid} > ytd-rich-grid-row`;
const searchPage = 'ytd-search';
const watchPage = 'ytd-watch-flexy';
const watchLockup = `${watchPage} #related :is(.ytLockupViewModelHorizontal, .yt-lockup-view-model--horizontal)`;
const hide = '{ display: none !important; }';

export default plugin;
