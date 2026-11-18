import type { Browser } from 'wxt/browser';
import type { Plugin } from '@/plugin-engine';
import { createPluginRuntime, listenForPluginNavigation, type RuntimePlugin } from '@/plugin-engine/runtime';
import type { UserPluginMessage } from '@/plugin-engine/user-scripts';

type Attach = (id: string, portName: string, factory: () => Plugin) => void;

export default defineUnlistedScript(() => {
  const world = globalThis as typeof globalThis & { __yrAttachPlugin?: Attach };
  if (world.__yrAttachPlugin) return;

  const attached = new Map<string, () => void>();

  world.__yrAttachPlugin = (id, portName, factory) => {
    if (attached.has(portName)) return;
    let port: Browser.runtime.Port | undefined;
    let stopped = false;
    let retry = 0;
    const plugin: RuntimePlugin = {
      id,
      activate(context) {
        return factory().activate(context);
      },
    };
    const lifetime = new AbortController();
    const runtime = createPluginRuntime((message, error) => {
      console.error(message, error);
      try {
        const detail = error instanceof Error ? error.stack ?? error.message : String(error);
        port?.postMessage({ error: `${message}\n${detail}`.slice(0, 4000) });
      } catch {
        // The extension may have disconnected while handling an error.
      }
    });
    listenForPluginNavigation(runtime.navigate, lifetime.signal);

    function stop() {
      stopped = true;
      attached.delete(portName);
      lifetime.abort();
      runtime.dispose();
      port?.disconnect();
    }

    function connect() {
      if (stopped) return;
      try {
        port = browser.runtime.connect({ name: portName });
        port.onMessage.addListener((message: UserPluginMessage) => {
          if (stopped) return;
          if ('stop' in message) {
            stop();
            return;
          }
          retry = 0;
          for (const [other, dispose] of attached) if (other !== portName) dispose();
          runtime.update(plugin, true, Object.freeze(message.settings));
        });
        port.onDisconnect.addListener(() => {
          // An idle MV3 worker may close the port. Keep the existing activation while reconnecting.
          port = undefined;
          if (stopped) return;
          if (retry >= 5) stop();
          else setTimeout(connect, 250 * 2 ** retry++);
        });
      } catch (error) {
        console.error(`Could not connect third-party plugin ${id}`, error);
        stop();
      }
    }

    attached.set(portName, stop);
    connect();
  };
});
