import { hasValidMetadata, optionEntries, type PluginMetadata } from '../plugin-engine/schema.ts';

export interface ThemeMetadata extends Omit<PluginMetadata, 'apiVersion'> {
  schemaVersion?: 1;
}

export interface Theme {
  metadata: ThemeMetadata;
  css: string;
}

const opening = '/* ==Theme==';
const closing = '==/Theme== */';

export function readTheme(source: string): Theme {
  const text = source.trimStart();
  if (!text.startsWith(opening)) {
    throw new Error('Expected a leading /* ==Theme== comment containing JSON metadata.');
  }
  const end = text.indexOf(closing, opening.length);
  if (end === -1) throw new Error('Expected ==/Theme== */ after the theme metadata.');

  const metadata: ThemeMetadata = JSON.parse(text.slice(opening.length, end));
  if (!metadata || !hasValidMetadata(metadata)) {
    throw new Error('Expected a theme ID, name, description, version, authors and valid option definitions.');
  }
  if (metadata.schemaVersion !== undefined && metadata.schemaVersion !== 1) {
    throw new Error('Unsupported theme schema version. Expected schemaVersion: 1 or omit it.');
  }
  for (const [key] of optionEntries(metadata.options)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)) throw new Error(`Option "${key}" must be a CSS variable identifier.`);
  }
  const css = text.slice(end + closing.length);
  if (!css.trim()) throw new Error('Expected CSS after the theme metadata.');
  return { metadata, css };
}
