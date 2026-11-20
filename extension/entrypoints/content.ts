import { syncActiveTheme } from '@/theme-engine/sync';
import { discoverPlugins } from '@/plugin-engine';
import { createPluginRuntime, listenForPluginNavigation } from '@/plugin-engine/runtime';
import { enabledKey, pluginStorageKeys, readPluginSettings, watchPluginStorage } from '@/plugin-engine/storage';
import { youtubePlayerMatches } from '@/youtube';
import { pauseModsKey } from '@/data/preferences';

const embedPlugins = new Set(['default-video-quality', 'default-volume', 'scroll-to-change-speed', 'scroll-to-change-volume']);

export default defineContentScript({
  matches: youtubePlayerMatches,
  allFrames: true,
  async main(ctx) {
    const embedded = location.pathname.startsWith('/embed/');
    if ((window !== window.top && !embedded) || ctx.isInvalid) return;
    if (!embedded) ctx.onInvalidated(syncActiveTheme(document, () => ctx.isValid));

    const bundled = await discoverPlugins();
    if (ctx.isInvalid) return;
    const plugins = embedded ? bundled.filter(({ id }) => embedPlugins.has(id)) : bundled;

    const runtime = createPluginRuntime();
    listenForPluginNavigation(runtime.navigate, ctx.signal);
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      queueMicrotask(() => { if (ctx.isValid) runtime.navigate(); });
    });
    const unwatch = watchPluginStorage([pauseModsKey, ...plugins.flatMap(pluginStorageKeys)], (values) => {
      if (ctx.isInvalid) return;
      for (const plugin of plugins) {
        runtime.update(plugin, values[pauseModsKey] !== true && values[enabledKey(plugin.id)] === true, readPluginSettings(plugin, values));
      }
    }, (error) => {
      if (ctx.isValid) console.error('Could not read plugin storage', error);
    });
    ctx.onInvalidated(() => {
      try {
        unwatch();
      } finally {
        runtime.dispose();
      }
    });
  },
});
