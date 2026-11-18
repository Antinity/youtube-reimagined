import type { Plugin, PluginHooks, PluginSettings } from './index';

interface Activation {
  cleanup: () => void;
  hooks?: PluginHooks | void;
  settings: PluginSettings;
}

export function createPluginRuntime() {
  const active = new Map<Plugin, Activation>();
  let currentUrl = location.href;

  return {
    update(plugin: Plugin, enabled: boolean, settings: PluginSettings) {
      const existing = active.get(plugin);
      if (!enabled) {
        active.delete(plugin);
        existing?.cleanup();
        return;
      }
      if (existing) {
        if (Object.entries(settings).some(([key, value]) => !Object.is(value, existing.settings[key]))) {
          existing.settings = settings;
          try {
            existing.hooks?.onSettingsChange?.(settings);
          } catch (error) {
            console.error(`Could not notify plugin ${plugin.id} of settings changes`, error);
          }
        }
        return;
      }

      const cleanups: (() => void)[] = [];
      const activation: Activation = {
        settings,
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
        activation.hooks = plugin.activate({ settings, onCleanup: (cleanup) => { cleanups.push(cleanup); } });
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
