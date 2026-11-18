import { browser } from 'wxt/browser';
import { defaultThemeId, discoverThemes } from './index';
import { watchPluginStorage } from '../plugin-engine/storage';
import { installedThemes, installedThemesKey, themeLock, type InstalledTheme } from './installed';
import { optionEntries, type PluginOptionValue } from '../plugin-engine/schema';
import type { Theme } from './schema';
import { isValidThemeValue, themeSettingsKey } from './settings';

export const selectedThemeKey = 'theme:selected';
export const themeApplicationErrorKey = 'theme:application-error';

export function selectedThemeId(values: Readonly<Record<string, unknown>>): string | null {
  const value = values[selectedThemeKey];
  if (value === null || typeof value === 'string') return value;
  return defaultThemeId;
}

export function selectTheme(id: string | null): Promise<void> {
  return browser.storage.local.set({ [selectedThemeKey]: id, [themeApplicationErrorKey]: null });
}

export async function setThemeSetting(theme: Theme | InstalledTheme, key: string, value: PluginOptionValue): Promise<void> {
  await navigator.locks.request(themeLock, async () => {
    const values = await browser.storage.local.get([installedThemesKey, themeSettingsKey, selectedThemeKey]);
    const id = theme.metadata.id;
    const current = discoverThemes().find(({ metadata }) => metadata.id === id)
      ?? installedThemes(values).find(({ metadata }) => metadata.id === id);
    if (!current || ('revision' in theme && (!('revision' in current) || theme.revision !== current.revision))) {
      throw new Error(`"${theme.metadata.name}" changed. Try again with the current version.`);
    }
    const option = optionEntries(current.metadata.options).find(([name]) => name === key)?.[1];
    if (!option || !isValidThemeValue(option, value)) throw new RangeError(`Invalid value for "${option?.label ?? key}".`);

    const settings = (values[themeSettingsKey] ?? {}) as Record<string, Record<string, unknown>>;
    const previous = Object.hasOwn(settings, id) ? settings[id] : undefined;
    await browser.storage.local.set({
      [themeSettingsKey]: { ...settings, [id]: { ...previous, [key]: value } },
      ...(selectedThemeId(values) === id ? { [themeApplicationErrorKey]: null } : {}),
    });
  });
}

export async function reportThemeApplicationError(id: string, error: unknown): Promise<void> {
  const values = await browser.storage.local.get(selectedThemeKey);
  if (id !== selectedThemeId(values)) return;
  await browser.storage.local.set({
    [themeApplicationErrorKey]: { id, message: error instanceof Error ? error.message : String(error) },
  });
}

export function watchThemeStorage(onUpdate: (values: Readonly<Record<string, unknown>>) => void, onError: (error: unknown) => void,
  includeDiagnostics = false) {
  const keys = [selectedThemeKey, themeSettingsKey, installedThemesKey];
  if (includeDiagnostics) keys.push(themeApplicationErrorKey);
  return watchPluginStorage(keys, onUpdate, onError);
}
