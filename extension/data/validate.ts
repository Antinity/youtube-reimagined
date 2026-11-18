import { discoverPlugins, type PluginOptionValue } from '@/plugin-engine';
import { validatePluginImport, type PluginImportCandidate } from '@/plugin-engine/import';
import { isValidOptionValue } from '@/plugin-engine/options';
import { isPluginId, optionEntries, type PluginOptions } from '@/plugin-engine/schema';
import { discoverThemes } from '@/theme-engine';
import { validateThemeFiles } from '@/theme-engine/archive';
import { assertInstallableTheme } from '@/theme-engine/installed';
import { validateThemeImport } from '@/theme-engine/import';
import { isValidThemeValue } from '@/theme-engine/settings';
import type { ThemePreview } from '@/theme-engine/preview';
import type { Backup } from './backup';

export type ValidatedBackup = Backup & { pluginSources: Map<string, PluginImportCandidate> };

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: expected an object.`);
  return value as Record<string, unknown>;
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path}: expected an array.`);
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new Error(`${path}: expected a string.`);
  return value;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

function settings(value: unknown, options: PluginOptions | undefined, path: string, theme = false) {
  const definitions = new Map(optionEntries(options));
  const validate = theme ? isValidThemeValue : isValidOptionValue;
  return Object.fromEntries(Object.entries(record(value, path)).map(([key, item]): [string, PluginOptionValue] => {
    const option = definitions.get(key);
    if (!option || !validate(option, item)) throw new Error(`${path}.${key}: expected a valid value for an existing option${option ? ` of type ${option.type}` : ''}.`);
    return [key, item];
  }));
}

function entry(value: unknown, path: string, seen: Set<string>): Record<string, unknown> & { id: string } {
  const item = record(value, path);
  if (!isPluginId(item.id) || seen.has(item.id)) throw new Error(`${path}.id: expected a unique lowercase module ID.`);
  seen.add(item.id);
  return { ...item, id: item.id };
}

export async function validateBackup(source: string): Promise<ValidatedBackup> {
  if (source.length > 32_000_000) throw new Error('Expected a configuration backup up to 32 MB.');
  let json: unknown;
  try {
    json = JSON.parse(source);
  } catch (cause) {
    throw new Error(`Invalid backup JSON: ${String(cause)}`);
  }
  const backup = record(json, 'Backup');
  if (backup.version !== 1) throw new Error('version: expected backup schema version 1.');
  const preferences = record(backup.preferences, 'preferences');
  const selected = preferences.selectedTheme;
  if (selected !== null && !isPluginId(selected)) throw new Error('preferences.selectedTheme: expected a theme ID or null.');
  const [bundledPlugins, bundledThemes] = await Promise.all([discoverPlugins(), discoverThemes()]);
  const pluginSources = new Map<string, PluginImportCandidate>();
  const plugIds = new Set<string>();
  const themeIds = new Set<string>();
  const plugins = list(backup.plugins, 'plugins').map((value, index) => {
    const path = `plugins[${index}]`;
    const item = entry(value, path, plugIds);
    if (typeof item.enabled !== 'boolean') throw new Error(`${path}.enabled: expected true or false.`);
    const metadata = bundledPlugins.find(({ id }) => id === item.id);
    if (item.module !== undefined) {
      if (metadata) throw new Error(`${path}.module: cannot overwrite bundled plugin "${item.id}".`);
      const module = record(item.module, `${path}.module`);
      const name = string(module.name, `${path}.module.name`);
      if (!/^[^/\\\x00-\x1f]+\.js$/i.test(name)) throw new Error(`${path}.module.name: expected a standalone .js filename.`);
      let validated;
      try {
        validated = validatePluginImport(name, string(module.source, 'source'));
      } catch (cause) {
        throw new Error(`${path}.module (${name}): ${String(cause)}`);
      }
      if (validated.metadata.id !== item.id || canonical(validated.metadata) !== canonical(module.metadata)) {
        throw new Error(`${path}.module.metadata: expected metadata and ID matching the plugin source.`);
      }
      pluginSources.set(item.id, validated);
    }
    const installed = pluginSources.get(item.id);
    const schema = installed?.metadata ?? metadata;
    if (!schema) throw new Error(`${path}.id: bundled plugin "${item.id}" is unavailable in this version.`);
    return {
      id: item.id, enabled: item.enabled, settings: settings(item.settings, schema.options, `${path}.settings`),
      ...(installed ? { module: { name: installed.name, source: installed.source, metadata: installed.metadata } } : {}),
    };
  });
  const themes = await Promise.all(list(backup.themes, 'themes').map(async (value, index) => {
    const path = `themes[${index}]`;
    const item = entry(value, path, themeIds);
    const bundled = bundledThemes.find(({ metadata }) => metadata.id === item.id);
    let theme;
    if (item.module !== undefined) {
      try {
        assertInstallableTheme(item.id);
        const module = record(item.module, 'module');
        const header = module.metadataSource === undefined
          ? `export default ${JSON.stringify(record(module.metadata, 'metadata'))};`
          : string(module.metadataSource, 'metadataSource');
        let preview: ThemePreview | undefined;
        if (module.preview !== undefined) {
          const image = record(module.preview, 'preview');
          preview = { name: string(image.name, 'preview.name'), dataUrl: string(image.dataUrl, 'preview.dataUrl') };
        }
        theme = await validateThemeFiles(string(module.css, 'theme.css'), header, preview);
        if (theme.metadata.id !== item.id || canonical(theme.metadata) !== canonical(module.metadata)) {
          throw new Error('metadata: expected metadata and ID matching metadata.js.');
        }
        if (module.folder !== undefined) {
          const folder = string(module.folder, 'folder');
          if (!/^[a-z0-9][a-z0-9._-]*$/i.test(folder)) throw new Error('folder: expected a safe single folder name.');
          theme.folder = folder;
        }
        if (module.legacySource !== undefined) {
          const legacy = record(module.legacySource, 'legacySource');
          const name = string(legacy.name, 'legacySource.name');
          const source = string(legacy.source, 'legacySource.source');
          const original = validateThemeImport(name, source);
          if (original.css !== theme.css || canonical(original.metadata) !== canonical(theme.metadata)) {
            throw new Error('legacySource: expected original CSS and metadata matching the theme.');
          }
          theme.legacySource = { name, source };
        }
      } catch (cause) {
        throw new Error(`${path}.module: ${String(cause)}`);
      }
    }
    const schema = theme?.metadata ?? bundled?.metadata;
    if (!schema) throw new Error(`${path}.id: bundled theme "${item.id}" is unavailable in this version.`);
    return { id: item.id, settings: settings(item.settings, schema.options, `${path}.settings`, true), ...(theme ? { module: theme } : {}) };
  }));
  if (selected !== null && !themeIds.has(selected) && !bundledThemes.some(({ metadata }) => metadata.id === selected)) {
    throw new Error('preferences.selectedTheme: the selected theme is missing from the backup and bundled themes.');
  }
  return { version: 1, preferences: { selectedTheme: selected }, plugins, themes, pluginSources };
}
