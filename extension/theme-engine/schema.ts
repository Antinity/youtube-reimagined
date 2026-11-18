import { readNativeTheme } from './native.ts';
import { findNodeAtLocation, parseTree, printParseErrorCode, type ParseError } from 'jsonc-parser';
import { isNonEmptyText, isPluginId, type PluginMetadata, type PluginOption } from '../plugin-engine/schema.ts';
import { isValidOptionValue } from '../plugin-engine/options.ts';
import { ThemeValidationError } from './diagnostics.ts';
import { isValidThemeValue } from './settings.ts';

export interface ThemeMetadata extends Omit<PluginMetadata, 'apiVersion'> {
  schemaVersion?: 1;
}

export interface Theme {
  metadata: ThemeMetadata;
  css: string;
}

const opening = '/* ==Theme==';
const closing = '==/Theme== */';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function readTheme(source: string): Theme {
  const text = source.trimStart();
  const start = source.length - text.length;
  if (!text.startsWith(opening)) {
    const native = readNativeTheme(source, validateMetadata);
    return { ...native, metadata: native.metadata as unknown as ThemeMetadata };
  }
  const jsonStart = start + opening.length;
  const end = text.indexOf(closing, opening.length);
  if (end === -1 || text.indexOf('*/', opening.length) !== end + closing.length - 2) {
    throw new ThemeValidationError(source, jsonStart, 'Expected ==/Theme== */ to close the metadata comment. Escape any embedded comment terminators.');
  }

  const json = text.slice(opening.length, end);
  const errors: ParseError[] = [];
  const tree = parseTree(json, errors, { disallowComments: true, allowTrailingComma: false });
  const problem = errors[0];
  if (problem) throw new ThemeValidationError(source, jsonStart + problem.offset, `Invalid JSON metadata: ${printParseErrorCode(problem.error)}.`);
  const metadata: unknown = JSON.parse(json);

  function invalid(path: (string | number)[], expected: string): never {
    const node = tree && (findNodeAtLocation(tree, path) ?? findNodeAtLocation(tree, path.slice(0, -1)) ?? tree);
    throw new ThemeValidationError(source, jsonStart + (node?.offset ?? 0), `${path.join('.') || 'Metadata'}: expected ${expected}.`);
  }

  validateMetadata(metadata, invalid);

  const css = text.slice(end + closing.length);
  if (!css.trim()) throw new ThemeValidationError(source, start + end + closing.length, 'Expected CSS after the theme metadata.');
  return { metadata, css };
}

function validateMetadata(metadata: unknown, invalid: (path: (string | number)[], expected: string) => never): asserts metadata is ThemeMetadata {
  if (!isObject(metadata)) invalid([], 'an object with id, name, description, version and authors');
  if (!isPluginId(metadata.id)) invalid(['id'], 'lowercase letters and digits separated by single hyphens');
  for (const field of ['name', 'description', 'version']) {
    if (!isNonEmptyText(metadata[field])) invalid([field], 'a non-empty string');
  }
  for (const field of ['authors', 'contributors']) {
    const value = metadata[field];
    if (field === 'contributors' && value === undefined) continue;
    if (!Array.isArray(value)) invalid([field], 'an array of names, for example ["Ada"]');
    value.forEach((name, index) => { if (typeof name !== 'string') invalid([field, index], 'a name as a string'); });
  }
  if (metadata.schemaVersion !== undefined && metadata.schemaVersion !== 1) {
    invalid(['schemaVersion'], '1 or an omitted property');
  }

  const settingIds = new Set<string>();
  function checkOptions(options: unknown, path: string[]) {
    if (!isObject(options)) invalid(path, 'an object containing option definitions');
    for (const [key, option] of Object.entries(options)) {
      const at = [...path, key];
      if (!isNonEmptyText(key) || !isObject(option)) invalid(at, 'a named option object');
      if (!isNonEmptyText(option.label)) invalid([...at, 'label'], 'a non-empty string');
      if (option.tooltip !== undefined && !isNonEmptyText(option.tooltip)) invalid([...at, 'tooltip'], 'a non-empty string');
      if (option.type === 'group') {
        if ('default' in option) invalid([...at, 'default'], 'defaults on settings inside the group');
        checkOptions(option.options, [...at, 'options']);
        continue;
      }
      if (option.type !== 'number' && option.type !== 'range' && option.type !== 'boolean'
        && option.type !== 'string' && option.type !== 'select' && option.type !== 'color') {
        invalid([...at, 'type'], 'group, boolean, string, select, number, range, or color');
      }
      if ('options' in option) invalid([...at, 'options'], 'type "group" to contain nested options');
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key) || settingIds.has(key)) invalid(at, 'a unique CSS variable identifier starting with a letter');
      settingIds.add(key);
      if (option.group !== undefined && !isNonEmptyText(option.group)) invalid([...at, 'group'], 'a non-empty string');
      if (option.type === 'select' && (!isObject(option.choices) || !Object.values(option.choices).every(isNonEmptyText))) {
        invalid([...at, 'choices'], 'an object mapping stored values to non-empty labels');
      }
      if (option.type === 'number' || option.type === 'range') {
        for (const bound of ['min', 'max', 'step']) {
          const value = option[bound];
          if (value === undefined && (option.type === 'number' || bound === 'step')) continue;
          if (typeof value !== 'number' || !Number.isFinite(value) || (bound === 'step' && value <= 0)) {
            invalid([...at, bound], bound === 'step' ? 'a finite positive number' : 'a finite number');
          }
        }
        if (typeof option.min === 'number' && typeof option.max === 'number' && option.max < option.min) {
          invalid([...at, 'max'], 'a number greater than or equal to min');
        }
        if (option.integer !== undefined && typeof option.integer !== 'boolean') invalid([...at, 'integer'], 'true or false');
      }
      if (!isValidOptionValue(option as unknown as PluginOption, option.default)) {
        invalid([...at, 'default'], option.type === 'select' ? 'one of the declared choice keys'
          : option.type === 'range' || option.type === 'number' ? 'a number within the declared bounds and step'
            : option.type === 'color' ? 'a six-digit hex color such as "#112233"' : `a ${option.type} value`);
      }
      const definition = option as unknown as PluginOption;
      if (!isValidThemeValue(definition, option.default)) invalid([...at, 'default'], 'a plain CSS keyword, number, unit, or color');
      if (definition.type === 'select') {
        for (const choice of Object.keys(definition.choices)) {
          if (!isValidThemeValue(definition, choice)) invalid([...at, 'choices', choice], 'a plain CSS keyword, number, unit, or color as the choice key');
        }
      }
    }
  }
  if (metadata.options !== undefined) checkOptions(metadata.options, ['options']);

}
