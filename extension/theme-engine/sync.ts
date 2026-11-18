import { discoverThemes } from './index';
import { installedThemes } from './installed';
import { createThemeRuntime } from './runtime';
import { readThemeSettings } from './settings';
import { reportThemeApplicationError, selectedThemeId, watchThemeStorage } from './storage';

export function syncActiveTheme(doc: Document, isValid: () => boolean) {
  const bundled = discoverThemes();
  const runtime = createThemeRuntime(doc);
  const unwatch = watchThemeStorage((values) => {
    if (!isValid()) return;
    const id = selectedThemeId(values);
    const theme = bundled.find(({ metadata }) => metadata.id === id)
      ?? installedThemes(values).find(({ metadata }) => metadata.id === id);
    try {
      runtime.apply(theme, theme && readThemeSettings(theme, values));
    } catch (error) {
      console.error('Could not apply theme', error);
      if (id) void reportThemeApplicationError(id, error).catch(console.error);
    }
  }, (error) => console.error('Could not read theme settings', error));
  return () => {
    unwatch();
    runtime.dispose();
  };
}
