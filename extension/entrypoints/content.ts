import { discoverPlugins } from '@/plugin-engine';
import { createPluginRuntime, listenForPluginNavigation } from '@/plugin-engine/runtime';
import { enabledKey, pluginStorageKeys, readPluginSettings, watchPluginStorage } from '@/plugin-engine/storage';
import { youtubeMatches } from '@/youtube';
import { discoverThemes } from '@/theme-engine';
import { createThemeRuntime } from '@/theme-engine/runtime';
import { reportThemeApplicationError, selectedThemeId, watchThemeStorage } from '@/theme-engine/storage';
import { installedThemes } from '@/theme-engine/installed';
import { readThemeSettings } from '@/theme-engine/settings';

export default defineContentScript({
  matches: youtubeMatches,
  async main(ctx) {
    const themes = discoverThemes();
    const themeRuntime = createThemeRuntime(document);
    const stopThemes = watchThemeStorage((values) => {
      if (ctx.isInvalid) return;
      const id = selectedThemeId(values);
      try {
        const theme = themes.find((theme) => theme.metadata.id === id)
          ?? installedThemes(values).find((theme) => theme.metadata.id === id);
        themeRuntime.apply(theme, theme ? readThemeSettings(theme, values) : undefined);
      } catch (error) {
        console.error('Could not apply theme', error);
        if (id) void reportThemeApplicationError(id, error).catch(console.error);
      }
    }, (error) => console.error('Could not read theme settings', error));
    ctx.onInvalidated(() => {
      stopThemes();
      themeRuntime.dispose();
    });

    const plugins = await discoverPlugins();
    if (ctx.isInvalid) return;

    const runtime = createPluginRuntime();
    listenForPluginNavigation(runtime.navigate, ctx.signal);
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      queueMicrotask(() => { if (ctx.isValid) runtime.navigate(); });
    });
    const unwatch = watchPluginStorage(plugins.flatMap(pluginStorageKeys), (values) => {
      if (ctx.isInvalid) return;
      for (const plugin of plugins) {
        runtime.update(plugin, values[enabledKey(plugin.id)] === true, readPluginSettings(plugin, values));
      }
    }, (error) => console.error('Could not read plugin storage', error));
    ctx.onInvalidated(() => {
      unwatch();
      runtime.dispose();
    });
  },
});
