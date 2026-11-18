export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  authors: readonly string[];
  contributors?: readonly string[];
  options?: Readonly<Record<string, PluginOption>>;
  activate(context: PluginContext): PluginHooks | void;
}

export type PluginOption = { label: string } & (
  | { type: 'boolean'; default: boolean }
  | { type: 'string'; default: string }
  | { type: 'number'; default: number; min?: number; max?: number; integer?: boolean }
);

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
      || typeof plugin.activate !== 'function' || !hasValidMetadata(plugin)) {
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

function hasValidMetadata(plugin: Plugin): boolean {
  const { name, description, version, authors, contributors, options } = plugin;
  return [name, description, version].every((value) => typeof value === 'string' && value.trim())
    && Array.isArray(authors) && authors.every((author) => typeof author === 'string')
    && (contributors === undefined
      || (Array.isArray(contributors) && contributors.every((name) => typeof name === 'string')))
    && (options === undefined || (options !== null && typeof options === 'object' && !Array.isArray(options)
      && Object.values(options).every((option) => option && typeof option.label === 'string'
        && ['boolean', 'string', 'number'].includes(option.type) && typeof option.default === option.type)));
}
