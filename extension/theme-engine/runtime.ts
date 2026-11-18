import type { Theme } from './schema';
import type { PluginSettings } from '../plugin-engine/schema';

export function createThemeRuntime(doc: Document) {
  let active: HTMLStyleElement | undefined;

  return {
    apply(theme: Theme | undefined, settings: PluginSettings = {}) {
      if (!theme) {
        active?.remove();
        active = undefined;
        return;
      }
      const declarations = Object.entries(settings).map(([key, value]) =>
        `--yr-theme-${key}: ${typeof value === 'boolean' ? Number(value) : value};`);
      const css = declarations.length ? `${theme.css}\n:root { ${declarations.join(' ')} }` : theme.css;
      if (active?.isConnected && active.dataset.yrTheme === theme.metadata.id && active.textContent === css) return;

      const next = doc.createElement('style');
      next.dataset.yrTheme = theme.metadata.id;
      next.media = 'not all';
      next.textContent = css;
      (doc.head ?? doc.documentElement).append(next);
      if (!next.sheet) {
        next.remove();
        throw new Error(`The page blocked the stylesheet for "${theme.metadata.name}".`);
      }
      active?.remove();
      next.media = '';
      active = next;
    },
    dispose() {
      active?.remove();
      active = undefined;
    },
  };
}
