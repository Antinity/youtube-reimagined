import { defineConfig } from 'wxt';
import { youtubeMatches } from './youtube';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage', 'scripting'],
    host_permissions: youtubeMatches,
  },
});
