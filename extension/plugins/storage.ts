import { browser } from 'wxt/browser';

export function enabledKey(id: string): string {
  return `plugin:${id}:enabled`;
}

export function setPluginEnabled(id: string, enabled: boolean): Promise<void> {
  return browser.storage.local.set({ [enabledKey(id)]: enabled });
}

export function watchPluginStorage(
  keys: string[],
  onUpdate: (values: Readonly<Record<string, unknown>>) => void,
  onError: (error: unknown) => void,
): () => void {
  const watched = new Set(keys);
  let values: Record<string, unknown> = {};
  let pending: Record<string, unknown> | undefined = {};
  let stopped = false;

  const onChange: Parameters<typeof browser.storage.local.onChanged.addListener>[0] = (changes) => {
    if (stopped) return;
    const updates = Object.fromEntries(Object.entries(changes)
      .filter(([key]) => watched.has(key))
      .map(([key, change]) => [key, change.newValue]));
    if (Object.keys(updates).length === 0) return;

    if (pending) {
      Object.assign(pending, updates);
    } else {
      values = { ...values, ...updates };
      onUpdate(values);
    }
  };

  browser.storage.local.onChanged.addListener(onChange);
  void (async () => {
    try {
      values = keys.length ? await browser.storage.local.get(keys) : {};
    } catch (error) {
      if (!stopped) onError(error);
    }
    if (stopped) return;
    values = { ...values, ...pending };
    pending = undefined;
    onUpdate(values);
  })();

  return () => {
    stopped = true;
    browser.storage.local.onChanged.removeListener(onChange);
  };
}
