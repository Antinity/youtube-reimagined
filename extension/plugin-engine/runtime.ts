import type { Plugin, PluginHooks, PluginSettings } from './index';

export type RuntimePlugin = Pick<Plugin, 'id' | 'activate'>;

export function listenForPluginNavigation(navigate: () => void, signal?: AbortSignal) {
  const { navigation } = window as Window & { navigation?: EventTarget };
  navigation?.addEventListener('currententrychange', navigate, { signal });
  document.addEventListener('yt-navigate-finish', navigate, { signal });
  window.addEventListener('popstate', navigate, { signal });
  window.addEventListener('hashchange', navigate, { signal });
}

interface Activation {
  cleanup: () => void;
  hooks?: PluginHooks | void;
  settings: PluginSettings;
}

export function createPluginRuntime(reportError: (message: string, error: unknown) => void = console.error) {
  const active = new Map<RuntimePlugin, Activation>();
  let currentUrl = location.href;

  function invoke(message: string, action: () => unknown) {
    try {
      const result = action();
      if (result instanceof Promise) void result.catch((error) => reportError(message, error));
    } catch (error) {
      reportError(message, error);
    }
  }

  return {
    update(plugin: RuntimePlugin, enabled: boolean, settings: PluginSettings) {
      const existing = active.get(plugin);
      if (!enabled) {
        active.delete(plugin);
        existing?.cleanup();
        return;
      }
      if (existing) {
        if (Object.entries(settings).some(([key, value]) => !Object.is(value, existing.settings[key]))) {
          existing.settings = settings;
          invoke(`Could not notify plugin ${plugin.id} of settings changes`, () => existing.hooks?.onSettingsChange?.(settings));
        }
        return;
      }

      const cleanups: (() => void)[] = [];
      const cleanupError = `Could not clean up plugin ${plugin.id}`;
      let disposed = false;
      const activation: Activation = {
        settings,
        cleanup() {
          disposed = true;
          for (const cleanup of cleanups.splice(0).reverse()) invoke(cleanupError, cleanup);
        },
      };
      active.set(plugin, activation);
      try {
        const hooks = plugin.activate({ settings, onCleanup(cleanup) {
          if (typeof cleanup !== 'function') throw new TypeError('onCleanup expects a function.');
          if (disposed) invoke(cleanupError, cleanup);
          else cleanups.push(cleanup);
        } });
        if (hooks instanceof Promise) {
          void hooks.catch((error) => reportError(`Could not activate plugin ${plugin.id}`, error));
          throw new TypeError('activate must return synchronously.');
        }
        if (hooks !== undefined && (hooks === null || typeof hooks !== 'object'
          || (hooks.onNavigate !== undefined && typeof hooks.onNavigate !== 'function')
          || (hooks.onSettingsChange !== undefined && typeof hooks.onSettingsChange !== 'function'))) {
          throw new TypeError('activate must return an object with optional onNavigate and onSettingsChange functions, or return nothing.');
        }
        activation.hooks = hooks;
      } catch (error) {
        reportError(`Could not activate plugin ${plugin.id}`, error);
        activation.cleanup();
      }
    },
    navigate() {
      if (currentUrl === location.href) return;
      currentUrl = location.href;
      for (const [plugin, activation] of active) {
        invoke(`Could not notify plugin ${plugin.id} of navigation`, () => activation.hooks?.onNavigate?.(new URL(currentUrl)));
      }
    },
    dispose() {
      for (const activation of active.values()) activation.cleanup();
      active.clear();
    },
  };
}
