import { discoverThemeFolders, discoverThemeSources } from './discovery';
import { readTheme, type Theme } from './schema';
import { readMetadataJs } from './metadata';

export const defaultThemeId = 'custom-colors';

export function discoverThemes(): Theme[] {
  const themes = new Map<string, Theme>();
  for (const { folder, css, metadata: metadataSource } of discoverThemeFolders()) {
    try {
      if (!metadataSource || !css.trim()) throw new Error('Expected metadata.js and a non-empty theme.css.');
      const metadata = readMetadataJs(metadataSource);
      if (themes.has(metadata.id)) throw new Error(`Duplicate theme ID "${metadata.id}".`);
      themes.set(metadata.id, { metadata, css, metadataSource });
    } catch (error) {
      console.error(`Could not load bundled theme "${folder}".`, error);
    }
  }
  for (const { filename, source } of discoverThemeSources()) {
    try {
      const theme = readTheme(source);
      if (themes.has(theme.metadata.id)) throw new Error(`Duplicate theme ID "${theme.metadata.id}".`);
      themes.set(theme.metadata.id, theme);
    } catch (error) {
      console.error(`Could not load bundled theme "${filename}".`, error);
    }
  }
  const first = themes.get(defaultThemeId);
  if (first) themes.delete(defaultThemeId);
  return first ? [first, ...themes.values()] : [...themes.values()];
}
