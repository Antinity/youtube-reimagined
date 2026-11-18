import { browser } from 'wxt/browser';
import { defaultThemeId } from './index';
import { watchPluginStorage } from '../plugin-engine/storage';
import { installedThemesKey } from './installed';

export const selectedThemeKey = 'theme:selected';
export const themeSettingsKey = 'theme:settings';
export const themeApplicationErrorKey = 'theme:application-error';

export function selectedThemeId(values: Readonly<Record<string, unknown>>): string | null {
  const value = values[selectedThemeKey];
  if (value === null || typeof value === 'string') return value;
  return defaultThemeId;
}

export function selectTheme(id: string | null): Promise<void> {
  return browser.storage.local.set({ [selectedThemeKey]: id, [themeApplicationErrorKey]: null });
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
