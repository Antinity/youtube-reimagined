import { isValidOptionValue } from './options.ts';

export const pluginApiVersion = 1;

export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  authors: readonly string[];
  contributors?: readonly string[];
  options?: PluginOptions;
  apiVersion?: typeof pluginApiVersion;
}

export interface Plugin extends PluginMetadata {
  activate(context: PluginContext): PluginHooks | void;
}

export interface PluginOptions {
  readonly [key: string]: PluginOption | PluginOptionGroup;
}

interface OptionLabel {
  label: string;
  tooltip?: string;
}

export interface PluginOptionGroup extends OptionLabel {
  type: 'group';
  options: PluginOptions;
}

export type PluginOption = OptionLabel & { group?: string } & (
  | { type: 'boolean'; default: boolean }
  | { type: 'string'; default: string }
  | { type: 'color'; default: string }
  | { type: 'select'; default: string; choices: Readonly<Record<string, string>> }
  | ({ default: number; step?: number; integer?: boolean } & (
    | { type: 'number'; min?: number; max?: number }
    | { type: 'range'; min: number; max: number }
  ))
);

export type PluginOptionValue = PluginOption['default'];
export type PluginSettings = Readonly<Record<string, PluginOptionValue>>;

export interface PluginContext {
  settings: PluginSettings;
  onCleanup(cleanup: () => void): void;
}

export interface PluginHooks {
  onNavigate?(url: URL): void;
  onSettingsChange?(settings: PluginSettings): void;
}

export function isPluginId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

export function optionEntries(options: PluginOptions | undefined): [string, PluginOption][] {
  return Object.entries(options ?? {}).flatMap(([key, option]): [string, PluginOption][] =>
    option.type === 'group' ? optionEntries(option.options) : [[key, option]]);
}

function hasValidOptions(options: PluginOptions, keys = new Set<string>(), ancestors = new Set<PluginOptions>()): boolean {
  if (!options || typeof options !== 'object' || Array.isArray(options) || ancestors.has(options)) return false;
  const parents = new Set(ancestors).add(options);
  return Object.entries(options).every(([key, option]) => {
    if (!isNonEmptyText(key) || key === '__proto__' || !option || !isNonEmptyText(option.label)
      || (option.tooltip !== undefined && !isNonEmptyText(option.tooltip))) return false;
    if (option.type === 'group') return !('default' in option) && hasValidOptions(option.options, keys, parents);
    if (keys.has(key) || 'options' in option) return false;
    keys.add(key);
    return (option.group === undefined || isNonEmptyText(option.group))
      && isValidOptionValue(option, option.default)
      && (option.type !== 'select' || Object.values(option.choices).every(isNonEmptyText));
  });
}

export function hasValidMetadata(plugin: PluginMetadata): boolean {
  const { id, name, description, version, authors, contributors, options, apiVersion } = plugin;
  return isPluginId(id)
    && [name, description, version].every(isNonEmptyText)
    && Array.isArray(authors) && authors.every((author) => typeof author === 'string')
    && (contributors === undefined
      || (Array.isArray(contributors) && contributors.every((name) => typeof name === 'string')))
    && (apiVersion === undefined || apiVersion === pluginApiVersion)
    && (options === undefined || hasValidOptions(options));
}
