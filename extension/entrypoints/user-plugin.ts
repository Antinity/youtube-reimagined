import type { Plugin, PluginSettings } from '@/plugin-engine';
import { createPluginRuntime } from '@/plugin-engine/runtime';

type Attach = (id: string, revision: string, factory: () => Plugin) => void;

export default defineUnlistedScript(() => {
  const world = globalThis as typeof globalThis & { __yrAttachPlugin?: Attach };
  if (world.__yrAttachPlugin) return;

  const runtime = createPluginRuntime();
  const seen = new Set<string>();
  world.__yrAttachPlugin = (id, revision, factory) => {
    if (seen.has(revision)) return;
    seen.add(revision);
    const port = browser.runtime.connect({ name: `yr-plugin:${id}:${revision}` });
    port.onMessage.addListener(({ settings }: { settings: PluginSettings }) => {
      try {
        const definition = factory();
        runtime.update({ id, activate: (context) => definition.activate(context) }, true, Object.freeze(settings));
      } catch (error) {
        console.error(`Could not initialize third-party plugin ${id}`, error);
      }
    });
  };
});
