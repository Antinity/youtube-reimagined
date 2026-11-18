import { browser } from 'wxt/browser';
import { installedKey, isInstalledKey, pluginErrorKey, pluginLock } from '@/plugin-engine/installed';
import { enabledKey, settingKey } from '@/plugin-engine/storage';
import { installedThemes, installedThemesKey, themeLock } from '@/theme-engine/installed';
import { selectedThemeKey } from '@/theme-engine/storage';
import { themeSettingsKey } from '@/theme-engine/settings';
import { themeApplicationErrorKey } from '@/theme-engine/diagnostics';
import type { ValidatedBackup } from './validate';
import { refreshUserScriptsMessage, userScriptAccess } from '@/plugin-engine/user-scripts';

export type RestoreMode = 'merge' | 'replace';

export async function restoreBackup(backup: ValidatedBackup, mode: RestoreMode, enableImported: boolean): Promise<string | undefined> {
  await withModuleLocks(async () => {
    const previous = await browser.storage.local.get(null);
    await browser.storage.local.set(restoreChanges(previous, backup, mode, enableImported));
  });
  if (enableImported && backup.plugins.some(({ module, enabled }) => enabled && module)) {
    const unavailable = userScriptAccess();
    if (unavailable) return unavailable;
  }
  try {
    await browser.runtime.sendMessage(refreshUserScriptsMessage);
  } catch (cause) {
    return `Saved configuration. Could not confirm synchronization of user scripts: ${String(cause)}`;
  }
}

export async function withModuleLocks(action: () => Promise<void>): Promise<void> {
  await navigator.locks.request(pluginLock, () => navigator.locks.request(themeLock, action));
}

function restoreChanges(previous: Readonly<Record<string, unknown>>, backup: ValidatedBackup, mode: RestoreMode, enableImported: boolean) {
  const replace = mode === 'replace';
  const next: Record<string, unknown> = {
    [selectedThemeKey]: backup.preferences.selectedTheme,
    [themeApplicationErrorKey]: null,
  };
  // Tombstones let Chrome publish replacement and deletion in a single storage transaction.
  if (replace) {
    for (const key of Object.keys(previous)) {
      if (isInstalledKey(key) || key.startsWith('plugin:') || key.startsWith('user-plugin-error:')) next[key] = null;
    }
  }
  for (const item of backup.plugins) {
    const source = backup.pluginSources.get(item.id);
    next[enabledKey(item.id)] = item.enabled && (!item.module || enableImported);
    if (source) {
      next[installedKey(item.id)] = { ...source, revision: crypto.randomUUID() };
      next[pluginErrorKey(item.id)] = null;
      for (const key of Object.keys(previous)) {
        if (item.module && key.startsWith(`plugin:${item.id}:setting:`)) next[key] = null;
      }
    }
    for (const [key, value] of Object.entries(item.settings)) next[settingKey(item.id, key)] = value;
  }

  const themes = new Map((replace ? [] : installedThemes(previous)).map((theme) => [theme.metadata.id, theme]));
  const settings = replace ? {} : { ...(previous[themeSettingsKey] as Record<string, unknown> | undefined) };
  for (const item of backup.themes) {
    const module = item.module ?? item.retained;
    if (module) themes.set(item.id, { ...module, revision: crypto.randomUUID() });
    const existing = Object.hasOwn(settings, item.id) && !item.module ? settings[item.id] : undefined;
    settings[item.id] = { ...(existing as Record<string, unknown> | undefined), ...item.settings };
  }
  next[installedThemesKey] = [...themes.values()];
  next[themeSettingsKey] = settings;
  return next;
}
