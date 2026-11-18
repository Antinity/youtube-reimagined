import { browser } from 'wxt/browser';
import { discoverThemes } from './index';
import type { Theme } from './schema';

export const installedThemesKey = 'theme:installed';
export const themeLock = 'youtube-reimagined:themes';

export interface InstalledTheme extends Theme {
  revision: string;
}

export function installedThemes(values: Readonly<Record<string, unknown>>): InstalledTheme[] {
  const stored = values[installedThemesKey];
  return Array.isArray(stored) ? stored : [];
}

export class DuplicateThemeError extends Error {
  constructor(readonly installed: InstalledTheme) {
    super(`A theme with ID "${installed.metadata.id}" is already installed.`);
  }
}

export async function installTheme(theme: Theme, replaceRevision?: string): Promise<void> {
  const id = theme.metadata.id;
  if (discoverThemes().some(({ metadata }) => metadata.id === id)) {
    throw new Error(`"${id}" belongs to a bundled theme. Choose a different ID.`);
  }
  await navigator.locks.request(themeLock, async () => {
    const saved = installedThemes(await browser.storage.local.get(installedThemesKey));
    const current = saved.find(({ metadata }) => metadata.id === id);
    if (current && current.revision !== replaceRevision) throw new DuplicateThemeError(current);
    if (!current && replaceRevision) throw new Error(`"${id}" was removed. Select the file again to install it.`);
    await browser.storage.local.set({
      [installedThemesKey]: [...saved.filter(({ metadata }) => metadata.id !== id), { ...theme, revision: crypto.randomUUID() }],
    });
  });
}
