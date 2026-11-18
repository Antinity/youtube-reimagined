import { discoverPlugins } from '@/plugins';
import { createPluginRuntime } from '@/plugins/runtime';

export default defineContentScript({
  matches: ['*://www.youtube.com/*', '*://m.youtube.com/*'],
  async main(ctx) {
    const plugins = await discoverPlugins();
    if (ctx.isInvalid) return;

    const runtime = createPluginRuntime();
    ctx.addEventListener(document, 'yt-navigate-finish', runtime.navigate);
    ctx.addEventListener(window, 'popstate', runtime.navigate);
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      queueMicrotask(() => { if (ctx.isValid) runtime.navigate(); });
    });
    ctx.onInvalidated(runtime.dispose);
    for (const plugin of plugins) runtime.setEnabled(plugin, true);
  },
});
