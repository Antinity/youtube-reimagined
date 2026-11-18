import { browser } from 'wxt/browser';
import { discoverPlugins } from './index';
import type { PluginImportCandidate } from './import';
import type { PluginOptionValue } from './schema';
import { enabledKey, setPluginSetting } from './storage.ts';

export interface InstalledPlugin extends PluginImportCandidate {
  revision: string;
}

export type InstalledPluginInfo = Pick<InstalledPlugin, 'name' | 'metadata' | 'revision'>;
export interface InstalledPluginError {
  revision: string;
  message: string;
}

const prefix = 'installed-plugin:';
const lock = 'youtube-reimagined:installed-plugins';

export function installedKey(id: string): string {
  return `${prefix}${id}`;
}

export function isInstalledKey(key: string): boolean {
  return key.startsWith(prefix);
}

export function pluginErrorKey(id: string): string {
  return `user-plugin-error:${id}`;
}

async function listInstalledPlugins(): Promise<InstalledPluginInfo[]> {
  const values = await browser.storage.local.get(null);
  return Object.entries(values).filter(([key, value]) => isInstalledKey(key) && value).map(([, value]) => {
    const { name, metadata, revision } = value as InstalledPlugin;
    return { name, metadata, revision };
  });
}

export function watchInstalledPlugins(onUpdate: (plugins: InstalledPluginInfo[]) => void, onError: (cause: unknown) => void) {
  let request = 0;
  function refresh() {
    const current = ++request;
    void listInstalledPlugins().then((plugins) => {
      if (request === current) onUpdate(plugins);
    }).catch((cause) => {
      if (request === current) onError(cause);
    });
  }
  const onChange: Parameters<typeof browser.storage.local.onChanged.addListener>[0] = (changes) => {
    if (Object.keys(changes).some(isInstalledKey)) refresh();
  };
  browser.storage.local.onChanged.addListener(onChange);
  refresh();
  return () => {
    request++;
    browser.storage.local.onChanged.removeListener(onChange);
  };
}

export class DuplicatePluginError extends Error {
  readonly current: InstalledPlugin;

  constructor(current: InstalledPlugin) {
    super(`A third-party plugin with ID "${current.metadata.id}" is already installed.`);
    this.current = current;
  }
}

export async function installPlugin(candidate: PluginImportCandidate, bundledIds: readonly string[], replaceRevision?: string) {
  const { id } = candidate.metadata;
  if (bundledIds.includes(id)) throw new Error(`"${id}" belongs to a bundled plugin. Choose a different ID.`);

  return navigator.locks.request(lock, async () => {
    const key = installedKey(id);
    const current = (await browser.storage.local.get(key))[key] as InstalledPlugin | undefined;
    if (current && current.revision !== replaceRevision) throw new DuplicatePluginError(current);
    if (replaceRevision && !current) throw new Error(`"${id}" was removed. Select the file again to install it.`);

    const plugin: InstalledPlugin = { ...candidate, revision: crypto.randomUUID() };
    const changes: Record<string, unknown> = { [key]: plugin, [pluginErrorKey(id)]: null };
    if (!current) changes[enabledKey(id)] = false;
    await browser.storage.local.set(changes);
    return plugin;
  });
}

export async function removePlugin(plugin: InstalledPluginInfo): Promise<void> {
  const { id } = plugin.metadata;
  const key = installedKey(id);
  const bundled = (await discoverPlugins()).some((candidate) => candidate.id === id);
  await navigator.locks.request(lock, async () => {
    const values = await browser.storage.local.get(null);
    const current = values[key] as InstalledPlugin | undefined;
    if (!current) return;
    if (current.revision !== plugin.revision) throw new Error(`"${id}" was replaced. Reopen the popup before removing it.`);
    const settings = Object.keys(values).filter((storedKey) => storedKey.startsWith(`plugin:${id}:setting:`));
    const keys = [key, pluginErrorKey(id)];
    if (!bundled) keys.push(enabledKey(id), ...settings);
    await browser.storage.local.remove(keys);
  });
}

async function updateInstalledPlugin(plugin: InstalledPluginInfo, update: () => Promise<void>): Promise<void> {
  await navigator.locks.request(lock, async () => {
    const key = installedKey(plugin.metadata.id);
    const current = (await browser.storage.local.get(key))[key] as InstalledPlugin | undefined;
    if (current?.revision !== plugin.revision) throw new Error(`"${plugin.metadata.id}" changed. Try again with the current version.`);
    await update();
  });
}

export function setInstalledEnabled(plugin: InstalledPluginInfo, enabled: boolean) {
  const { id } = plugin.metadata;
  return updateInstalledPlugin(plugin, () => browser.storage.local.set({ [enabledKey(id)]: enabled, [pluginErrorKey(id)]: null }));
}

export function setInstalledSetting(plugin: InstalledPluginInfo, key: string, value: PluginOptionValue) {
  return updateInstalledPlugin(plugin, () => setPluginSetting(plugin.metadata, key, value));
}

export function reportInstalledError(id: string, revision: string, message: string) {
  return navigator.locks.request(lock, async () => {
    const key = installedKey(id);
    const current = (await browser.storage.local.get(key))[key] as InstalledPlugin | undefined;
    if (current?.revision !== revision) return;
    const error: InstalledPluginError = { revision, message: message.slice(0, 4000) };
    await browser.storage.local.set({ [pluginErrorKey(id)]: error });
  });
}
