import { isValidOptionValue } from '../plugin-engine/options.ts';
import { optionEntries, type PluginOption, type PluginOptionValue, type PluginSettings } from '../plugin-engine/schema.ts';
import type { Theme } from './schema';

export const themeSettingsKey = 'theme:settings';

export function isValidThemeValue(option: PluginOption, value: unknown): value is PluginOptionValue {
  return isValidOptionValue(option, value)
    && (typeof value !== 'string' || /^[\w#.%+ -]*$/.test(value));
}

export function readThemeSettings(theme: Theme, storage: Readonly<Record<string, unknown>>): PluginSettings {
  const saved = storage[themeSettingsKey];
  const id = theme.metadata.id;
  const settings = saved && typeof saved === 'object' && Object.hasOwn(saved, id)
    ? (saved as Record<string, Record<string, unknown>>)[id] : undefined;
  return Object.fromEntries(optionEntries(theme.metadata.options).map(([key, option]) => {
    const value = settings && Object.hasOwn(settings, key) ? settings[key] : undefined;
    return [key, isValidThemeValue(option, value) ? value : option.default];
  }));
}
