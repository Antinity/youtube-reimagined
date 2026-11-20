// @ts-check

const commentsSelector = 'ytd-watch-flexy:not([hidden]) ytd-comments:not([hidden])';
const headerSelector = 'ytd-comments-header-renderer:not([screen-reader-only])';
const hidden = 'data-yr-comment-search-hidden';
const searching = 'data-yr-comment-searching';

/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'comment-plus',
  name: 'Comment Plus',
  description: 'Search loaded desktop comments and optionally sort by newest when a video opens.',
  version: '1.0.0',
  authors: ['Antinity'],
  options: {
    search: { type: 'boolean', label: 'Show comment search', default: true },
    newest: { type: 'boolean', label: 'Automatically sort by newest', default: true },
  },
  activate({ settings, onCleanup }) {
    if (location.hostname !== 'www.youtube.com') return;
    const listeners = new AbortController();
    const style = document.createElement('style');
    style.textContent = `
      ytd-comments [${hidden}],
      ytd-comments[${searching}] ytd-item-section-renderer > #contents > ytd-continuation-item-renderer {
        display: none !important;
      }
      .yr-comment-search {
        display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 12px 0 16px;
        color: var(--yt-spec-text-primary, inherit); font: inherit;
      }
      .yr-comment-search input {
        width: min(280px, 100%); box-sizing: border-box; padding: 8px 12px;
        color: inherit; background: var(--yt-spec-base-background, transparent);
        border: 1px solid var(--yt-spec-10-percent-layer, #888); border-radius: 18px; font: inherit;
      }
      .yr-comment-search output { color: var(--yt-spec-text-secondary, inherit); }
    `;
    (document.head ?? document.documentElement).append(style);
    const form = document.createElement('div');
    form.className = 'yr-comment-search';
    form.setAttribute('role', 'search');
    form.setAttribute('aria-label', 'Video comments');
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Search loaded comments';
    input.setAttribute('aria-label', input.placeholder);
    const result = document.createElement('output');
    result.setAttribute('aria-live', 'polite');
    form.append(input, result);

    /** @type {Element | null} */
    let comments = null;
    let videoId = '';
    let sorted = false;
    let frame = 0;
    let sortTimer = 0;
    let sortAttempts = 0;
    /** @type {{ trigger: HTMLElement, menu: Element, openedAt: number } | undefined} */
    let pending;

    const pageObserver = new MutationObserver((changes) => {
      if (changes.some(({ target, addedNodes, removedNodes }) => (comments?.contains(target) && !form.contains(target))
        || (target instanceof Element && (target.matches('ytd-comments, ytd-watch-flexy')
          || (!comments && target.closest('ytd-comments'))))
        || [...addedNodes, ...removedNodes].some((node) => node instanceof Element
          && (node.matches('ytd-comments, ytd-watch-flexy') || node.querySelector('ytd-comments'))))) schedule();
    });
    input.addEventListener('input', schedule, { signal: listeners.signal });
    document.addEventListener('yt-navigate-finish', schedule, { signal: listeners.signal });
    pageObserver.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ['video-id', 'hidden', 'screen-reader-only'],
    });
    onCleanup(() => {
      listeners.abort();
      pageObserver.disconnect();
      cancelAnimationFrame(frame);
      stopSorting(true);
      clearFilter(comments);
      form.remove();
      style.remove();
    });

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    function update() {
      frame = 0;
      const url = new URL(location.href);
      const id = url.pathname === '/watch' ? url.searchParams.get('v') ?? '' : '';
      const candidate = id ? document.querySelector(commentsSelector) : null;
      const loadedId = candidate?.closest('ytd-watch-flexy')?.getAttribute('video-id');
      const next = loadedId && loadedId !== id ? null : candidate;
      if (id !== videoId || next !== comments) {
        stopSorting(true);
        clearFilter(comments);
        if (id !== videoId) {
          input.value = '';
          sorted = false;
          sortAttempts = 0;
        }
        videoId = id;
        comments = next;
        form.remove();
      }
      if (!comments) return;
      if (settings.search) {
        const header = comments.querySelector(headerSelector);
        if (header && header.nextElementSibling !== form) header.after(form);
        filterComments(comments);
      } else {
        form.remove();
        clearFilter(comments);
      }
      if (settings.newest && !sorted && sortAttempts < 2) sortNewest(comments);
    }

    /** @param {Element} root */
    function filterComments(root) {
      const query = input.value.trim().toLocaleLowerCase();
      if (!query) {
        if (root.hasAttribute(searching)) clearFilter(root);
        if (result.textContent) result.textContent = '';
        return;
      }
      root.setAttribute(searching, '');
      let matches = 0;
      for (const thread of root.querySelectorAll('ytd-comment-thread-renderer')) {
        const match = Array.from(thread.querySelectorAll('#content-text, #author-text'))
          .some((part) => part.textContent?.toLocaleLowerCase().includes(query));
        thread.toggleAttribute(hidden, !match);
        if (match) matches++;
      }
      const message = matches === 1 ? '1 matching thread' : `${matches} matching threads`;
      if (result.textContent !== message) result.textContent = message;
    }

    /** @param {boolean} close */
    function stopSorting(close) {
      const previous = pending;
      pending = undefined;
      window.clearTimeout(sortTimer);
      if (close && previous && isOpen(previous.trigger, previous.menu)) previous.trigger.click();
    }

    /** @param {Element} root */
    function sortNewest(root) {
      if (!pending) {
        const menu = root.querySelector(`${headerSelector} :is(yt-sort-filter-sub-menu-renderer, #sort-menu)`);
        const trigger = menu?.querySelector('button, #label, [role="button"]');
        if (!menu || !(trigger instanceof HTMLElement) || !trigger.getClientRects().length
          || trigger.matches('[disabled], [aria-disabled="true"]') || isOpen(trigger, menu)) return;
        pending = { trigger, menu, openedAt: performance.now() };
        sortAttempts++;
        trigger.click();
      }

      const items = sortItems(pending.trigger, pending.menu);
      // YouTube's native comment sorter lists Top comments followed by Newest first in every locale.
      const newest = items[1];
      if (items.length === 2 && newest) {
        sorted = true;
        if (newest.matches('[aria-selected="true"], [aria-checked="true"], .iron-selected')) stopSorting(true);
        else {
          stopSorting(false);
          newest.click();
        }
        return;
      }
      window.clearTimeout(sortTimer);
      if (performance.now() - pending.openedAt > 1200) {
        stopSorting(true);
        sortTimer = window.setTimeout(schedule, 300);
      } else sortTimer = window.setTimeout(schedule, 50);
    }

    schedule();
    return {
      onNavigate: schedule,
      onSettingsChange(next) {
        if (settings.newest !== next.newest) {
          stopSorting(true);
          sorted = false;
          sortAttempts = 0;
        }
        settings = next;
        schedule();
      },
    };
  },
};

/** @param {Element | null} root */
function clearFilter(root) {
  root?.removeAttribute(searching);
  root?.querySelectorAll(`[${hidden}]`).forEach((thread) => thread.removeAttribute(hidden));
}

/** @param {HTMLElement} trigger @param {Element} menu */
function sortItems(trigger, menu) {
  const id = trigger.getAttribute('aria-controls') || trigger.getAttribute('aria-owns');
  const list = (id && document.getElementById(id)) || menu;
  const items = [...list.querySelectorAll('tp-yt-paper-listbox > a[aria-selected], tp-yt-paper-item, [role="menuitemradio"], [role="option"]')];
  return /** @type {HTMLElement[]} */ (items.filter((item) => item instanceof HTMLElement
    && item.getClientRects().length && getComputedStyle(item).visibility === 'visible'
    && !items.some((other) => other !== item && other.contains(item))));
}

/** @param {HTMLElement} trigger @param {Element} menu */
function isOpen(trigger, menu) {
  return trigger.getAttribute('aria-expanded') === 'true' || sortItems(trigger, menu).length > 0;
}

export default plugin;
