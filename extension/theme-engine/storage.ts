import { browser } from 'wxt/browser';
import { defaultThemeId, discoverThemes } from './index';
import { watchPluginStorage } from '../plugin-engine/storage';
import { installedThemes, installedThemesKey, themeLock, type InstalledTheme } from './installed';
import { optionEntries, type PluginOptionValue } from '../plugin-engine/schema';
import type { Theme } from './schema';
import { isValidThemeValue, themeSettingsKey } from './settings';
import { themeApplicationErrorKey } from './diagnostics';
import { pauseModsKey } from '@/data/preferences';

export const selectedThemeKey = 'theme:selected';

export function selectedThemeId(values: Readonly<Record<string, unknown>>): string | null {
  const value = values[selectedThemeKey];
  if (value === null || typeof value === 'string') return value;
  return defaultThemeId;
}

export async function selectTheme(id: string | null): Promise<void> {
  await navigator.locks.request(themeLock, async () => {
    if (id && !discoverThemes().some(({ metadata }) => metadata.id === id)) {
      const values = await browser.storage.local.get(installedThemesKey);
      if (!installedThemes(values).some(({ metadata }) => metadata.id === id)) throw new Error('This theme is no longer installed.');
    }
    await browser.storage.local.set({ [selectedThemeKey]: id, [themeApplicationErrorKey]: null });
  });
}

export async function removeTheme(theme: InstalledTheme): Promise<void> {
  await navigator.locks.request(themeLock, async () => {
    const values = await browser.storage.local.get([installedThemesKey, selectedThemeKey, themeSettingsKey]);
    const id = theme.metadata.id;
    const saved = installedThemes(values);
    const current = saved.find(({ metadata }) => metadata.id === id);
    if (!current) return;
    if (current.revision !== theme.revision) throw new Error('This theme was replaced. Try again with the current version.');
    const settings = { ...(values[themeSettingsKey] as Record<string, unknown> | undefined) };
    delete settings[id];
    await browser.storage.local.set({
      [installedThemesKey]: saved.filter(({ metadata }) => metadata.id !== id),
      [themeSettingsKey]: settings,
      ...(selectedThemeId(values) === id ? { [selectedThemeKey]: null, [themeApplicationErrorKey]: null } : {}),
    });
  });
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
  const keys = [selectedThemeKey, themeSettingsKey, installedThemesKey, pauseModsKey];
  if (includeDiagnostics) keys.push(themeApplicationErrorKey);
  return watchPluginStorage(keys, onUpdate, onError);
}
