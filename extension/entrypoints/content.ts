import { discoverPlugins } from '@/plugins';

export default defineContentScript({
  matches: ['*://www.youtube.com/*', '*://m.youtube.com/*'],
  async main() {
    await discoverPlugins();
  },
});
