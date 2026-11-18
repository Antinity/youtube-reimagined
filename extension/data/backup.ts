import { browser } from 'wxt/browser';
import { discoverPlugins } from '@/plugin-engine';
import { isInstalledKey, type InstalledPlugin } from '@/plugin-engine/installed';
import { enabledKey, readPluginSettings } from '@/plugin-engine/storage';
import { discoverThemes } from '@/theme-engine';
import { installedThemes } from '@/theme-engine/installed';
import type { Theme } from '@/theme-engine/schema';
import { readThemeSettings } from '@/theme-engine/settings';
import { selectedThemeId } from '@/theme-engine/storage';

export interface Backup {
  version: 1;
  preferences: { selectedTheme: string | null };
  plugins: {
    id: string;
    enabled: boolean;
    settings: ReturnType<typeof readPluginSettings>;
    module?: Pick<InstalledPlugin, 'name' | 'source' | 'metadata'>;
  }[];
  themes: {
    id: string;
    settings: ReturnType<typeof readThemeSettings>;
    module?: Theme;
  }[];
}

export async function createBackup(): Promise<Backup> {
  const [values, plugins] = await Promise.all([browser.storage.local.get(null), discoverPlugins()]);
  const themes = discoverThemes();
  const userPlugins = Object.entries(values).filter(([key, value]) => isInstalledKey(key) && value)
    .map(([, value]) => value as InstalledPlugin);
  const userThemes = installedThemes(values);
  const pluginEntry = (metadata: InstalledPlugin['metadata']) => ({
    id: metadata.id, enabled: values[enabledKey(metadata.id)] === true, settings: readPluginSettings(metadata, values),
  });
  const themeEntry = (theme: Theme) => ({ id: theme.metadata.id, settings: readThemeSettings(theme, values) });
  return {
    version: 1,
    preferences: { selectedTheme: selectedThemeId(values) },
    plugins: [...plugins.map(pluginEntry), ...userPlugins.filter(({ metadata }) => !plugins.some(({ id }) => id === metadata.id))
      .map(({ name, source, metadata }) => ({ ...pluginEntry(metadata), module: { name, source, metadata } }))],
    themes: [...themes.map(themeEntry), ...userThemes.filter(({ metadata }) => !themes.some((theme) => theme.metadata.id === metadata.id))
      .map(({ revision: _revision, ...theme }) => ({ ...themeEntry(theme), module: theme }))],
  };
}

export function downloadFile(file: Blob, name: string): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
