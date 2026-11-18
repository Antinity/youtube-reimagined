import { syncActiveTheme } from '@/theme-engine/sync';
import { discoverPlugins } from '@/plugin-engine';
import { createPluginRuntime, listenForPluginNavigation } from '@/plugin-engine/runtime';
import { enabledKey, pluginStorageKeys, readPluginSettings, watchPluginStorage } from '@/plugin-engine/storage';
import { youtubeMatches } from '@/youtube';

export default defineContentScript({
  matches: youtubeMatches,
  async main(ctx) {
    ctx.onInvalidated(syncActiveTheme(document, () => ctx.isValid));

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
