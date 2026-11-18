import type { Theme } from './schema';

export function createThemeRuntime(doc: Document) {
  let active: HTMLStyleElement | undefined;

  return {
    apply(theme: Theme | undefined) {
      if (!theme) {
        active?.remove();
        active = undefined;
        return;
      }
      if (active?.isConnected && active.dataset.yrTheme === theme.metadata.id && active.textContent === theme.css) return;

      const next = doc.createElement('style');
      next.dataset.yrTheme = theme.metadata.id;
      next.textContent = theme.css;
      (doc.head ?? doc.documentElement).append(next);
      if (!next.sheet) {
        next.remove();
        throw new Error(`The page blocked the stylesheet for "${theme.metadata.name}".`);
      }
      active?.remove();
      active = next;
    },
    dispose() {
      active?.remove();
      active = undefined;
    },
  };
}
