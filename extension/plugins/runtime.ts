import type { Plugin, PluginHooks } from './index';

export function createPluginRuntime() {
  const active = new Map<Plugin, { cleanup: () => void; hooks?: PluginHooks | void }>();
  let currentUrl = location.href;

  return {
    setEnabled(plugin: Plugin, enabled: boolean) {
      const existing = active.get(plugin);
      if (!enabled) {
        active.delete(plugin);
        existing?.cleanup();
        return;
      }
      if (existing) return;

      const cleanups: (() => void)[] = [];
      const activation: { cleanup: () => void; hooks?: PluginHooks | void } = {
        cleanup() {
          for (const cleanup of cleanups.splice(0).reverse()) {
            try {
              cleanup();
            } catch (error) {
              console.error(`Could not clean up plugin ${plugin.id}`, error);
            }
          }
        },
      };
      active.set(plugin, activation);
      try {
        activation.hooks = plugin.activate({ onCleanup: (cleanup) => { cleanups.push(cleanup); } });
      } catch (error) {
        console.error(`Could not activate plugin ${plugin.id}`, error);
        activation.cleanup();
      }
    },
    navigate() {
      if (currentUrl === location.href) return;
      currentUrl = location.href;
      for (const [plugin, activation] of active) {
        try {
          activation.hooks?.onNavigate?.(new URL(currentUrl));
        } catch (error) {
          console.error(`Could not notify plugin ${plugin.id} of navigation`, error);
        }
      }
    },
    dispose() {
      for (const activation of active.values()) activation.cleanup();
      active.clear();
    },
  };
}
