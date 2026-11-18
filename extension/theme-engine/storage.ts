import { browser } from 'wxt/browser';
import { defaultThemeId } from './index';
import { watchPluginStorage } from '../plugin-engine/storage';

export const selectedThemeKey = 'theme:selected';
export const themeSettingsKey = 'theme:settings';

export function selectedThemeId(values: Readonly<Record<string, unknown>>): string | null {
  const value = values[selectedThemeKey];
  if (value === null || typeof value === 'string') return value;
  return defaultThemeId;
}

export function selectTheme(id: string | null): Promise<void> {
  return browser.storage.local.set({ [selectedThemeKey]: id });
}

export function watchThemeStorage(onUpdate: (values: Readonly<Record<string, unknown>>) => void, onError: (error: unknown) => void) {
  return watchPluginStorage([selectedThemeKey, themeSettingsKey], onUpdate, onError);
}
