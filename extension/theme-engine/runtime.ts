import type { Theme } from './schema';
import type { PluginSettings } from '../plugin-engine/schema';

export function createThemeRuntime(doc: Document) {
  let active: HTMLStyleElement | undefined;
  let variables: CSSStyleDeclaration | undefined;

  return {
    apply(theme: Theme | undefined, settings: PluginSettings = {}) {
      if (!theme) {
        active?.remove();
        active = undefined;
        variables = undefined;
        return;
      }
      const declarations = Object.entries(settings).map(([key, value]) =>
        `--yr-theme-${key}: ${typeof value === 'boolean' ? Number(value) : value};`);
      const values = declarations.join(' ');
      if (active?.isConnected && active.dataset.yrTheme === theme.metadata.id && active.textContent === theme.css && variables) {
        variables.cssText = values;
        return;
      }

      const next = doc.createElement('style');
      next.dataset.yrTheme = theme.metadata.id;
      next.media = 'not all';
      next.textContent = theme.css;
      (doc.head ?? doc.documentElement).append(next);
      if (!next.sheet) {
        next.remove();
        throw new Error(`The page blocked the stylesheet for "${theme.metadata.name}".`);
      }
      let rule: CSSStyleRule;
      try {
        const index = next.sheet.insertRule(':root {}', next.sheet.cssRules.length);
        rule = next.sheet.cssRules[index] as CSSStyleRule;
        rule.style.cssText = values;
      } catch (error) {
        next.remove();
        throw error;
      }
      active?.remove();
      next.media = '';
      active = next;
      variables = rule.style;
    },
    dispose() {
      active?.remove();
      active = undefined;
      variables = undefined;
    },
  };
}
