const channelRows = 'ytd-channel-renderer, ytd-grid-channel-renderer, yt-lockup-view-model';
const subscriptionControls = 'ytd-subscribe-button-renderer, ytd-subscription-notification-toggle-button-renderer-next, yt-subscribe-button-view-model, yt-subscription-notification-toggle-button-view-model';
const continuationRows = 'ytd-continuation-item-renderer, yt-continuation-item-view-model';

export interface SubscriptionChannel {
  id: string;
  href: string;
  name: string;
  handle: string;
  avatar: string;
  subscribers: string;
  row: HTMLElement;
}

export function findSubscriptionsFeed() {
  return Array.from(document.querySelectorAll<HTMLElement>('ytd-page-manager ytd-browse, ytd-browse[page-subtype="channels"]'))
    .find((feed) => !feed.closest('[hidden]'));
}

export function readSubscriptions(feed: HTMLElement) {
  const channels = new Map<string, SubscriptionChannel>();
  for (const row of feed.querySelectorAll<HTMLElement>(channelRows)) {
    if (row.parentElement?.closest(channelRows) || !row.querySelector(subscriptionControls) || isUnsubscribed(row)) continue;
    const link = Array.from(row.querySelectorAll<HTMLAnchorElement>('a[href]:not(.yr-sub-channel-link)'))
      .find(({ hostname, pathname }) => hostname === location.hostname && /^\/(?:@[^/]+|(?:channel|c|user)\/[^/]+)/.test(pathname));
    if (!link) continue;
    const id = /^\/(?:@[^/]+|(?:channel|c|user)\/[^/]+)/.exec(link.pathname)?.[0];
    if (!id || channels.has(id)) continue;
    const name = row.querySelector('ytd-channel-name #text, #channel-title, .yt-lockup-metadata-view-model__title')?.textContent?.trim()
      || link.title || link.textContent?.trim();
    if (!name) continue;
    const image = row.querySelector<HTMLImageElement>('#avatar img, #image-container img, yt-avatar-shape img, img:not(.yr-sub-item img)');
    const count = row.querySelector('#subscriber-count, #subscribers')?.textContent?.trim()
      || Array.from(row.querySelectorAll('span, yt-formatted-string'), ({ textContent }) => textContent?.trim() ?? '')
        .find((text) => /^\d[^·•]{0,25}\s+subscribers?$/i.test(text)) || '';
    const handle = row.querySelector('#metadata #channel-handle, #metadata #channel-id')?.textContent?.trim()
      || (id.startsWith('/@') ? id.slice(1) : '');
    channels.set(id, { id, href: link.origin + id, name, handle, avatar: image?.currentSrc || image?.src || '', subscribers: count, row });
  }
  return channels;
}

function subscriptionButton(row: HTMLElement) {
  return row.querySelector<HTMLElement>(`:is(${subscriptionControls}) :is(button, tp-yt-paper-button, [role="button"])`);
}

function actionLabel(element: Element) {
  return (element.getAttribute('aria-label') || element.textContent || '').trim().replace(/\s+/g, ' ');
}

function isUnsubscribed(row: HTMLElement) {
  const button = subscriptionButton(row);
  return button !== null && (/^subscribe(?: to\b.*)?$/i.test(actionLabel(button))
    || /^subscribe$/i.test(button.textContent?.trim() ?? ''));
}

function visible(element: HTMLElement) {
  return element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible';
}

const unsubscribeLabel = /^unsubscribe(?: from\b.*)?$/i;
const confirmationDialogs = ':is(yt-confirm-dialog-renderer, ytd-confirm-dialog-renderer, yt-confirm-dialog-view-model, tp-yt-paper-dialog, [role="dialog"])';

function nativeConfirmation() {
  return Array.from(document.querySelectorAll<HTMLElement>(`${confirmationDialogs} :is(button, #confirm-button[role="button"])`))
    .find((element) => unsubscribeLabel.test(actionLabel(element)) && visible(element));
}

function nativeUnsubscribeMenuItem() {
  const menu = ':is(ytd-menu-popup-renderer, yt-list-view-model, yt-sheet-view-model, [role="menu"])';
  const item = ':is(ytd-menu-service-item-renderer, yt-list-item-view-model, [role="menuitem"], button)';
  const entry = Array.from(document.querySelectorAll<HTMLElement>(`${menu} ${item}`))
    .find((element) => unsubscribeLabel.test(actionLabel(element)) && visible(element));
  return entry?.querySelector<HTMLElement>('button, tp-yt-paper-item, [role="menuitem"], [role="button"]') ?? entry;
}

function unsubscribeNotice() {
  return Array.from(document.querySelectorAll<HTMLElement>('yt-notification-action-renderer, tp-yt-paper-toast'))
    .find((element) => /^(?:unsubscribed(?: from .+)?|subscription removed)[.!]?$/i.test(actionLabel(element))
      && visible(element));
}

async function waitFor<T>(read: () => T | undefined, signal?: AbortSignal) {
  const deadline = Date.now() + 8000;
  do {
    signal?.throwIfAborted();
    const result = read();
    if (result !== undefined) return result;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  } while (Date.now() < deadline);
  signal?.throwIfAborted();
}

export async function loadAllSubscriptions(feed: HTMLElement, signal: AbortSignal) {
  while (true) {
    signal.throwIfAborted();
    const next = Array.from(feed.querySelectorAll<HTMLElement>(continuationRows))
      .find((row) => !row.closest('[hidden]'));
    if (!next) break;
    const count = feed.querySelectorAll(channelRows).length;
    const button = next.querySelector<HTMLButtonElement>('button');
    next.scrollIntoView({ block: 'end' });
    if (button && visible(button)) button.click();
    const loaded = await waitFor(() => (!next.isConnected || next.closest('[hidden]') ||
      feed.querySelectorAll(channelRows).length > count) ? true : undefined, signal);
    if (!loaded) throw new Error('YouTube stopped loading channels. Try again to include the rest of the list.');
  }

  const knownRows = new Set(Array.from(readSubscriptions(feed).values(), ({ row }) => row));
  for (const control of feed.querySelectorAll(subscriptionControls)) {
    if (control.closest('[hidden], [data-yr-sub-removed]')) continue;
    const row = control.closest<HTMLElement>(channelRows);
    if (!row || (!knownRows.has(row) && !isUnsubscribed(row))) {
      throw new Error('Some channels could not be read. Review the list before unsubscribing.');
    }
  }
}

export async function unsubscribeChannel(feed: HTMLElement, channel: SubscriptionChannel, signal: AbortSignal) {
  signal.throwIfAborted();
  const { row, name } = channel;
  const trigger = subscriptionButton(row);
  if (!trigger || !row.isConnected || isUnsubscribed(row)) throw new Error(`Review ${name} in the updated channel list.`);
  if (nativeConfirmation() || nativeUnsubscribeMenuItem()) throw new Error('Close the open YouTube menu or dialog and retry.');

  const subscribed = row.querySelector('[subscribed]');
  trigger.click();
  const action = await waitFor(() => {
    const confirmation = nativeConfirmation();
    if (confirmation) return { confirmation };
    const menuItem = nativeUnsubscribeMenuItem();
    if (menuItem) return { menuItem };
  }, signal);
  if (action?.menuItem) action.menuItem.click();
  const confirmation = action?.confirmation ?? (action && await waitFor(nativeConfirmation, signal));
  if (!confirmation) throw new Error(`YouTube’s unsubscribe confirmation for ${name} was unavailable.`);
  const prompt = confirmation.closest(confirmationDialogs)?.textContent?.replace(/\s+/g, ' ') ?? '';
  if (/unsubscribe from\s+.+\?/i.test(prompt) && !prompt.toLocaleLowerCase().includes(name.toLocaleLowerCase().replace(/\s+/g, ' '))) {
    throw new Error(`YouTube opened a confirmation for a different channel. Close it and retry ${name}.`);
  }
  signal.throwIfAborted();
  const priorNotice = unsubscribeNotice();
  confirmation.click();

  // Verify the result before opening another channel's menu.
  const completed = await waitFor(() => {
    if (visible(confirmation) || !feed.isConnected) return;
    const current = row.isConnected ? row : readSubscriptions(feed).get(channel.id)?.row;
    if (!current || isUnsubscribed(current) || (subscribed && row === current && subscribed.isConnected
      && !subscribed.hasAttribute('subscribed'))) return true;
    const notice = unsubscribeNotice();
    if (notice && notice !== priorNotice) return true;
  });
  if (!completed) throw new Error(`YouTube did not confirm the change for ${name}. Refresh the page to check its status.`);
}
