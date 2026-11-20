import styles from './subscriptions-manager.css?inline';
import { findSubscriptionsFeed, loadAllSubscriptions, readSubscriptions, unsubscribeChannel,
  type SubscriptionChannel } from './youtube-subscriptions';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function action(text: string, className?: string) {
  const button = element('button', className, text);
  button.type = 'button';
  return button;
}

function channelView(select: (id: string, value: boolean) => void) {
  const content = element('div', 'yr-sub-item');
  const check = element('input', 'yr-sub-check');
  check.type = 'checkbox';
  const pick = element('label', 'yr-sub-pick');
  pick.append(check);
  let channelId = '';
  check.addEventListener('change', () => select(channelId, check.checked));

  const link = element('a', 'yr-sub-channel-link');
  const avatar = element('span', 'yr-sub-avatar');
  const image = element('img');
  image.alt = '';
  image.loading = 'lazy';
  const name = element('span', 'yr-sub-name');
  const count = element('span', 'yr-sub-count');
  avatar.append(image);
  link.append(avatar, name, count);
  content.append(pick, link);

  return {
    content,
    update(channel: SubscriptionChannel, selected: boolean, busy: boolean) {
      channelId = channel.id;
      check.setAttribute('aria-label', `Select ${channel.name}`);
      check.checked = selected;
      check.disabled = busy;
      link.href = channel.href;
      name.textContent = channel.name;
      name.title = channel.name;
      if (channel.avatar && image.getAttribute('src') !== channel.avatar) image.src = channel.avatar;
      image.hidden = !channel.avatar;
      count.textContent = channel.subscribers.replace(/\s+subscribers?$/i, '');
      count.title = channel.subscribers;
      count.setAttribute('aria-label', channel.subscribers);
      count.hidden = !channel.subscribers;
      if (content.parentElement !== channel.row) channel.row.prepend(content);
    },
  };
}

export function mountSubscriptionsManager(startCompact: boolean) {
  const style = element('style', undefined, styles);
  document.head.append(style);
  const panel = element('section', 'yr-sub-manager');
  panel.setAttribute('aria-label', 'Subscriptions manager');
  const title = element('h2', undefined, 'Subscriptions manager');
  const compactLabel = element('label', 'yr-sub-toggle');
  const compact = element('input');
  compact.type = 'checkbox';
  compact.checked = startCompact;
  compactLabel.append(compact, 'Compact view');
  const heading = element('div', 'yr-sub-heading');
  heading.append(title, compactLabel);

  const search = element('input', 'yr-sub-search');
  search.type = 'search';
  search.placeholder = 'Search channels';
  search.setAttribute('aria-label', 'Search channels');
  const selection = element('label', 'yr-sub-toggle');
  const selectVisible = element('input');
  selectVisible.type = 'checkbox';
  selection.append(selectVisible, 'Select visible');
  const tally = element('span', 'yr-sub-tally');
  const clear = action('Clear selection');
  const removeSelected = action('Unsubscribe selected');
  const removeAll = action('Unsubscribe all');
  const stop = action('Stop');
  const actions = element('div', 'yr-sub-actions');
  actions.append(selection, tally, clear, removeSelected, removeAll, stop);
  const status = element('p', 'yr-sub-status');
  status.setAttribute('role', 'status');
  panel.append(heading, search, actions, status);

  const dialog = element('dialog', 'yr-sub-confirm');
  const form = element('form');
  form.method = 'dialog';
  const question = element('h2');
  question.id = 'yr-sub-confirm-title';
  dialog.setAttribute('aria-labelledby', question.id);
  const detail = element('p');
  detail.id = 'yr-sub-confirm-detail';
  dialog.setAttribute('aria-describedby', detail.id);
  const cancel = element('button', undefined, 'Cancel');
  cancel.value = 'cancel';
  cancel.autofocus = true;
  const proceed = element('button', 'yr-sub-danger', 'Unsubscribe');
  proceed.value = 'unsubscribe';
  const confirmActions = element('div', 'yr-sub-actions');
  confirmActions.append(cancel, proceed);
  form.append(question, detail, confirmActions);
  dialog.append(form);
  panel.append(dialog);

  const selected = new Set<string>();
  const removed = new Map<string, HTMLElement>();
  const views = new Map<HTMLElement, ReturnType<typeof channelView>>();
  let feed: HTMLElement | undefined;
  let channels = new Map<string, SubscriptionChannel>();
  let visible: SubscriptionChannel[] = [];
  let job: AbortController | undefined;
  let message = '';
  let frame = 0;

  function select(id: string, value: boolean) {
    if (value) selected.add(id);
    else selected.delete(id);
    render();
  }

  function render() {
    const busy = Boolean(job);
    const query = search.value.trim().toLocaleLowerCase();
    visible = [];
    let selectedCount = 0;
    let visibleSelected = 0;
    feed?.toggleAttribute('data-yr-sub-compact', compact.checked);
    for (const channel of channels.values()) {
      const matches = `${channel.name} ${channel.handle}`.toLocaleLowerCase().includes(query);
      const checked = selected.has(channel.id);
      channel.row.setAttribute('data-yr-sub-row', '');
      channel.row.toggleAttribute('data-yr-sub-filtered', !matches);
      channel.row.toggleAttribute('data-yr-sub-selected', checked);
      if (matches) {
        visible.push(channel);
        if (checked) visibleSelected++;
      }
      if (checked) selectedCount++;
      let view = views.get(channel.row);
      if (!view) {
        view = channelView(select);
        views.set(channel.row, view);
      }
      view.update(channel, checked, busy);
    }
    selectVisible.checked = visible.length > 0 && visible.length === visibleSelected;
    selectVisible.indeterminate = visibleSelected > 0 && visibleSelected < visible.length;
    selectVisible.disabled = busy || !visible.length;
    clear.disabled = removeSelected.disabled = busy || !selectedCount;
    removeAll.disabled = busy || !channels.size;
    compact.disabled = search.disabled = busy;
    stop.hidden = !busy;
    const count = `${selectedCount} selected`;
    if (tally.textContent !== count) tally.textContent = count;
    const text = message || (!channels.size ? 'No channels to manage.'
      : query && !visible.length ? 'No channels match your search.' : '');
    if (status.textContent !== text) status.textContent = text;
  }

  function removeView(row: HTMLElement) {
    views.get(row)?.content.remove();
    views.delete(row);
    for (const attribute of ['data-yr-sub-row', 'data-yr-sub-filtered', 'data-yr-sub-selected', 'data-yr-sub-active']) {
      row.removeAttribute(attribute);
    }
  }

  function sync() {
    const current = findSubscriptionsFeed();
    if (current !== feed) {
      job?.abort();
      feed?.removeAttribute('data-yr-sub-compact');
      for (const row of views.keys()) removeView(row);
      selected.clear();
      for (const row of removed.values()) row.removeAttribute('data-yr-sub-removed');
      removed.clear();
      message = '';
      feed = current;
    }
    if (!feed) {
      panel.remove();
      return;
    }
    if (panel.parentElement !== feed) feed.prepend(panel);
    channels = readSubscriptions(feed);
    for (const id of removed.keys()) channels.delete(id);
    for (const { row } of channels.values()) row.removeAttribute('data-yr-sub-removed');
    const attached = new Set(Array.from(channels.values(), ({ row }) => row));
    for (const row of views.keys()) if (!attached.has(row)) removeView(row);
    render();
  }

  async function confirm(count: number, all: boolean, signal: AbortSignal) {
    signal.throwIfAborted();
    question.textContent = all ? 'Unsubscribe from all channels?' : `Unsubscribe from ${count} ${count === 1 ? 'channel' : 'channels'}?`;
    detail.textContent = all ? `This will remove all ${count} subscriptions from your YouTube account.`
      : 'You can subscribe again from each channel’s page.';
    dialog.returnValue = '';
    return new Promise<boolean>((resolve) => {
      const abort = () => dialog.close();
      signal.addEventListener('abort', abort, { once: true });
      dialog.addEventListener('close', () => {
        signal.removeEventListener('abort', abort);
        resolve(dialog.returnValue === 'unsubscribe' && !signal.aborted);
      }, { once: true });
      dialog.showModal();
    });
  }

  async function unsubscribe(all: boolean) {
    const targetFeed = feed;
    if (job || !targetFeed) return;
    const controller = new AbortController();
    const { signal } = controller;
    job = controller;
    message = all ? 'Loading all subscribed channels…' : '';
    let total = 0;
    let done = 0;
    const startScroll = window.scrollY;
    render();

    try {
      if (all) await loadAllSubscriptions(targetFeed, signal);
      sync();
      signal.throwIfAborted();
      const queue = [...channels.values()].filter(({ id }) => all || selected.has(id));
      total = queue.length;
      if (!total) {
        message = 'There are no channels to unsubscribe from.';
        return;
      }
      message = '';
      render();
      if (!await confirm(total, all, signal)) return;

      for (const { id, name } of queue) {
        signal.throwIfAborted();
        if (feed !== targetFeed) break;
        const channel = channels.get(id);
        if (!channel) throw new Error(`Review ${name} in the updated channel list.`);
        message = `Unsubscribing ${done + 1} of ${total}…`;
        channel.row.setAttribute('data-yr-sub-active', '');
        channel.row.scrollIntoView({ block: 'nearest' });
        render();
        try {
          await unsubscribeChannel(targetFeed, channel, signal);
          removed.set(id, channel.row);
          channel.row.setAttribute('data-yr-sub-removed', '');
          selected.delete(id);
          done++;
        } finally {
          channel.row.removeAttribute('data-yr-sub-active');
        }
        sync();
      }
      message = `Unsubscribed from ${done} ${done === 1 ? 'channel' : 'channels'}.`;
    } catch (error) {
      message = signal.aborted ? `Stopped after ${done} of ${total} channels.`
        : `${done ? `Unsubscribed from ${done} of ${total}. ` : ''}${error instanceof Error ? error.message : String(error)}`;
    } finally {
      job = undefined;
      if (feed === targetFeed && targetFeed.isConnected) window.scrollTo({ top: startScroll, behavior: 'instant' });
      render();
    }
  }

  search.addEventListener('input', render);
  compact.addEventListener('change', render);
  selectVisible.addEventListener('change', () => {
    for (const { id } of visible) {
      if (selectVisible.checked) selected.add(id);
      else selected.delete(id);
    }
    render();
  });
  clear.addEventListener('click', () => { selected.clear(); render(); });
  removeSelected.addEventListener('click', () => { void unsubscribe(false); });
  removeAll.addEventListener('click', () => { void unsubscribe(true); });
  stop.addEventListener('click', () => job?.abort());

  const observer = new MutationObserver((changes) => {
    if (frame || changes.every(({ target }) => panel.contains(target)
      || target instanceof Element && target.closest('.yr-sub-item'))) return;
    frame = requestAnimationFrame(() => { frame = 0; sync(); });
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true,
    attributeFilter: ['hidden', 'subscribed', 'aria-label', 'href', 'src'] });
  sync();

  return {
    setCompact(next: boolean) { compact.checked = next; render(); },
    dispose() {
      job?.abort();
      observer.disconnect();
      cancelAnimationFrame(frame);
      feed?.removeAttribute('data-yr-sub-compact');
      for (const row of views.keys()) removeView(row);
      for (const row of removed.values()) row.removeAttribute('data-yr-sub-removed');
      channels.clear();
      feed = undefined;
      panel.remove();
      style.remove();
    },
  };
}
