import { discoverPlugins } from '@/plugins';
import { createPluginRuntime } from '@/plugins/runtime';
import { enabledKey, pluginStorageKeys, readPluginSettings, watchPluginStorage } from '@/plugins/storage';
import { youtubeMatches } from '@/youtube';

export default defineContentScript({
  matches: youtubeMatches,
  async main(ctx) {
    const plugins = await discoverPlugins();
    if (ctx.isInvalid) return;

    const runtime = createPluginRuntime();
    ctx.addEventListener(document, 'yt-navigate-finish', runtime.navigate);
    ctx.addEventListener(window, 'popstate', runtime.navigate);
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
