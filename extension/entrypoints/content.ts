import { discoverPlugins } from '@/plugin-engine';
import { createPluginRuntime, listenForPluginNavigation } from '@/plugin-engine/runtime';
import { enabledKey, pluginStorageKeys, readPluginSettings, watchPluginStorage } from '@/plugin-engine/storage';
import { youtubeMatches } from '@/youtube';
import { discoverThemes } from '@/theme-engine';
import { createThemeRuntime } from '@/theme-engine/runtime';
import { selectedThemeId, watchThemeStorage } from '@/theme-engine/storage';

export default defineContentScript({
  matches: youtubeMatches,
  async main(ctx) {
    const themes = discoverThemes();
    const themeRuntime = createThemeRuntime(document);
    const stopThemes = watchThemeStorage((values) => {
      if (ctx.isInvalid) return;
      try {
        themeRuntime.apply(themes.find((theme) => theme.metadata.id === selectedThemeId(values)));
      } catch (error) {
        console.error('Could not apply theme', error);
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
