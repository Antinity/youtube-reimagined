import type { Browser } from 'wxt/browser';
import type { Plugin } from '@/plugin-engine';
import { createPluginRuntime, listenForPluginNavigation, type RuntimePlugin } from '@/plugin-engine/runtime';
import type { UserPluginMessage } from '@/plugin-engine/user-scripts';

type Attach = (id: string, revision: string, factory: () => Plugin) => void;

export default defineUnlistedScript(() => {
  const world = globalThis as typeof globalThis & { __yrAttachPlugin?: Attach };
  if (world.__yrAttachPlugin) return;

  const runtime = createPluginRuntime();
  const attached = new Map<string, () => void>();
  listenForPluginNavigation(runtime.navigate);

  world.__yrAttachPlugin = (id, revision, factory) => {
    if (attached.has(revision)) return;
    let port: Browser.runtime.Port | undefined;
    let stopped = false;
    let retry = 0;
    const plugin: RuntimePlugin = {
      id,
      activate(context) {
        return factory().activate(context);
      },
    };

    function stop() {
      stopped = true;
      attached.delete(revision);
      runtime.update(plugin, false, {});
      port?.disconnect();
    }

    function connect() {
      if (stopped) return;
      try {
        port = browser.runtime.connect({ name: `yr-plugin:${id}:${revision}` });
        port.onMessage.addListener((message: UserPluginMessage) => {
          if (stopped) return;
          if ('stop' in message) {
            stop();
            return;
          }
          retry = 0;
          for (const [other, dispose] of attached) if (other !== revision) dispose();
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

    attached.set(revision, stop);
    connect();
  };
});
