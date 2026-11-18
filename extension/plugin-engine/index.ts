import { hasValidMetadata, type Plugin } from './schema';

export type { Plugin, PluginContext, PluginHooks, PluginMetadata, PluginOption, PluginOptions, PluginOptionValue, PluginSettings } from './schema';

const modules = import.meta.glob<{ default: Plugin }>('../plugins/*.js');
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
    if (!plugin || typeof plugin.activate !== 'function' || !hasValidMetadata(plugin)) {
      console.error(`Plugin ${path} has an invalid definition`);
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
