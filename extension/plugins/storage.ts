import { browser } from 'wxt/browser';
import type { Plugin, PluginOptionValue, PluginSettings } from './index';
import { isValidOptionValue } from './options.ts';

export function enabledKey(id: string): string {
  return `plugin:${id}:enabled`;
}

export function setPluginEnabled(id: string, enabled: boolean): Promise<void> {
  return browser.storage.local.set({ [enabledKey(id)]: enabled });
}

function settingKey(id: string, key: string): string {
  return `plugin:${id}:setting:${key}`;
}

export function pluginStorageKeys(plugin: Plugin): string[] {
  return [enabledKey(plugin.id), ...Object.keys(plugin.options ?? {}).map((key) => settingKey(plugin.id, key))];
}

export function readPluginSettings(plugin: Plugin, values: Readonly<Record<string, unknown>>): PluginSettings {
  return Object.freeze(Object.fromEntries(Object.entries(plugin.options ?? {}).map(([key, option]) => {
    const value = values[settingKey(plugin.id, key)];
    return [key, isValidOptionValue(option, value) ? value : option.default];
  })));
}

export async function setPluginSetting(plugin: Plugin, key: string, value: PluginOptionValue): Promise<void> {
  const options = plugin.options;
  const option = options && Object.hasOwn(options, key) ? options[key] : undefined;
  if (!option || !isValidOptionValue(option, value)) throw new RangeError(`Invalid value for option ${key}`);
  await browser.storage.local.set({ [settingKey(plugin.id, key)]: value });
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
