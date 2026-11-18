import { browser } from 'wxt/browser';
import type { PluginImportCandidate } from './import';
import { enabledKey } from './storage.ts';

export interface InstalledPlugin extends PluginImportCandidate {
  revision: string;
}

const prefix = 'installed-plugin:';
const lock = 'youtube-reimagined:installed-plugins';

export function installedKey(id: string): string {
  return `${prefix}${id}`;
}

export function isInstalledKey(key: string): boolean {
  return key.startsWith(prefix);
}

export async function listInstalledPlugins(): Promise<InstalledPlugin[]> {
  const values = await browser.storage.local.get(null);
  return Object.entries(values).filter(([key]) => isInstalledKey(key)).map(([, value]) => value as InstalledPlugin);
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
    const changes: Record<string, unknown> = { [key]: plugin };
    if (!current) changes[enabledKey(id)] = false;
    await browser.storage.local.set(changes);
    return plugin;
  });
}

export async function removePlugin(plugin: InstalledPlugin): Promise<void> {
  const { id } = plugin.metadata;
  const key = installedKey(id);
  await navigator.locks.request(lock, async () => {
    const values = await browser.storage.local.get(null);
    const current = values[key] as InstalledPlugin | undefined;
    if (!current) return;
    if (current.revision !== plugin.revision) throw new Error(`"${id}" was replaced. Reopen the popup before removing it.`);
    const settings = Object.keys(values).filter((storedKey) => storedKey.startsWith(`plugin:${id}:setting:`));
    await browser.storage.local.remove([key, enabledKey(id), ...settings]);
  });
}
