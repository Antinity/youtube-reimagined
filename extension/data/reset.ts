import { browser } from 'wxt/browser';
import { discoverPlugins } from '@/plugin-engine';
import { isInstalledKey, pluginLock, type InstalledPlugin } from '@/plugin-engine/installed';
import { discoverThemes } from '@/theme-engine';
import { installedThemes, installedThemesKey, themeLock } from '@/theme-engine/installed';
import { selectedThemeId, selectedThemeKey } from '@/theme-engine/storage';
import { themeSettingsKey } from '@/theme-engine/settings';
import { themeApplicationErrorKey } from '@/theme-engine/diagnostics';
import { withModuleLocks } from './restore';

export async function resetModuleSettings(kind: 'plugin' | 'theme', id: string): Promise<void> {
  if (kind === 'plugin') {
    await navigator.locks.request(pluginLock, async () => {
      const values = await browser.storage.local.get(null);
      await browser.storage.local.remove(Object.keys(values).filter((key) => key.startsWith(`plugin:${id}:setting:`)));
    });
    return;
  }
  await navigator.locks.request(themeLock, async () => {
    const values = await browser.storage.local.get([themeSettingsKey, selectedThemeKey]);
    const settings = { ...(values[themeSettingsKey] as Record<string, unknown> | undefined) };
    delete settings[id];
    await browser.storage.local.set({
      [themeSettingsKey]: settings,
      ...(selectedThemeId(values) === id ? { [themeApplicationErrorKey]: null } : {}),
    });
  });
}

export async function resetPreferences(): Promise<void> {
  await withModuleLocks(async () => {
    const values = await browser.storage.local.get(null);
    await browser.storage.local.remove(Object.keys(values).filter((key) => key.startsWith('plugin:')
      || key.startsWith('user-plugin-error:') || [selectedThemeKey, themeSettingsKey, themeApplicationErrorKey].includes(key)));
  });
}

export async function removeUserModules(): Promise<void> {
  const bundledPlugins = new Set((await discoverPlugins()).map(({ id }) => id));
  const bundledThemes = new Set(discoverThemes().map(({ metadata }) => metadata.id));
  await withModuleLocks(async () => {
    const values = await browser.storage.local.get(null);
    const next: Record<string, unknown> = { [installedThemesKey]: [] };
    const removedPlugins = new Set<string>();
    for (const [key, value] of Object.entries(values)) {
      if (!isInstalledKey(key)) continue;
      next[key] = null;
      if (value) {
        const id = (value as InstalledPlugin).metadata.id;
        if (!bundledPlugins.has(id)) removedPlugins.add(id);
        next[`user-plugin-error:${id}`] = null;
      }
    }
    for (const key of Object.keys(values)) {
      const id = /^plugin:([^:]+):/.exec(key)?.[1];
      if (id && removedPlugins.has(id)) next[key] = null;
    }
    const removedThemes = new Set(installedThemes(values).map(({ metadata }) => metadata.id).filter((id) => !bundledThemes.has(id)));
    const settings = { ...(values[themeSettingsKey] as Record<string, unknown> | undefined) };
    for (const id of removedThemes) delete settings[id];
    next[themeSettingsKey] = settings;
    const selected = selectedThemeId(values);
    if (selected && removedThemes.has(selected)) {
      next[selectedThemeKey] = null;
      next[themeApplicationErrorKey] = null;
    }
    await browser.storage.local.set(next);
  });
}

export async function resetAllData(): Promise<void> {
  await withModuleLocks(async () => { await browser.storage.local.clear(); });
}
