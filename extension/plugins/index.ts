export interface Plugin {
  id: string;
  activate(context: PluginContext): PluginHooks | void;
}

export interface PluginContext {
  onCleanup(cleanup: () => void): void;
}

export interface PluginHooks {
  onNavigate?(url: URL): void;
}

const modules = import.meta.glob<{ default: Plugin }>('./*.plugin.js');
let discovery: Promise<Plugin[]> | undefined;

export function discoverPlugins(): Promise<Plugin[]> {
  return discovery ??= loadPlugins();
}

async function loadPlugins(): Promise<Plugin[]> {
  const entries = Object.entries(modules).sort(([a], [b]) => a.localeCompare(b));
  const results = await Promise.allSettled(entries.map(([, load]) => load()));
  const plugins = new Map<string, Plugin>();

  for (const [index, result] of results.entries()) {
    const [path] = entries[index]!;
    if (result.status === 'rejected') {
      console.error(`Could not load plugin ${path}`, result.reason);
      continue;
    }

    const plugin = result.value.default;
    if (typeof plugin?.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(plugin.id)
      || typeof plugin.activate !== 'function') {
      console.error(`Plugin ${path} must export a plugin with a valid ID and activate function`);
      continue;
    }
    if (plugins.has(plugin.id)) {
      console.error(`Plugin ${path} duplicates ID ${plugin.id}`);
      continue;
    }
    plugins.set(plugin.id, plugin);
  }

  return [...plugins.values()];
}
