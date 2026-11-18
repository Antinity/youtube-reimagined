import { dirname, resolve } from 'node:path';
import { defineConfig } from 'wxt';
import { youtubeMatches } from './youtube';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // Chrome rejects literal Unicode noncharacters in extension scripts.
  vite: () => ({ build: { rolldownOptions: { output: { charset: 'ascii' } } } }),
  hooks: {
    'server:started'({ config }, server) {
      const pluginsDir = resolve(config.root, 'plugins');
      const registry = resolve(config.root, 'plugin-engine/index.ts');
      const themesDir = resolve(config.root, 'themes');
      const themeRegistry = resolve(config.root, 'theme-engine/discovery.ts');

      server.watcher.on('all', (event, file) => {
        if (event !== 'add' && event !== 'change' && event !== 'unlink') return;
        if (dirname(resolve(file)) === themesDir && file.endsWith('.css')) {
          server.watcher.emit('all', 'change', themeRegistry);
          server.reloadPage('popup.html');
          return;
        }
        if (dirname(resolve(file)) !== pluginsDir || !file.endsWith('.js')) return;
        // A partial rebuild can leave a glob match in only some entrypoints' dependency lists.
        // Rebuild every consumer of the registry even when WXT sees this as an ordinary edit.
        server.watcher.emit('all', 'change', registry);
        server.reloadPage('popup.html');
      });
    },
  },
  manifest: ({ browser, manifestVersion }) => ({
    name: 'YouTube Reimagined',
    description: 'Customize YouTube with plugins.',
    permissions: ['storage', 'scripting', ...(manifestVersion === 3 && browser !== 'firefox' && browser !== 'safari' ? ['userScripts'] : [])],
    host_permissions: youtubeMatches,
  }),
});
