import { discoverPlugins } from '@/plugins';
import { createPluginRuntime } from '@/plugins/runtime';
import { enabledKey, watchPluginStorage } from '@/plugins/storage';
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
    const unwatch = watchPluginStorage(plugins.map((plugin) => enabledKey(plugin.id)), (values) => {
      if (ctx.isInvalid) return;
      for (const plugin of plugins) runtime.setEnabled(plugin, values[enabledKey(plugin.id)] === true);
    }, (error) => console.error('Could not read plugin states', error));
    ctx.onInvalidated(() => {
      unwatch();
      runtime.dispose();
    });
  },
});
