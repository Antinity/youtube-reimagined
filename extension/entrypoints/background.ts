import { youtubePlayerMatches } from '@/youtube';
import { startUserScripts } from '@/plugin-engine/user-scripts';

export default defineBackground(() => {
  startUserScripts();
  // Manifest content scripts are injected on future page loads.
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason !== 'install' && reason !== 'update') return;

    try {
      const tabs = await browser.tabs.query({ url: youtubePlayerMatches });
      await Promise.allSettled(tabs.flatMap(({ id }) => id === undefined ? [] : [
        browser.scripting.executeScript({ target: { tabId: id }, world: 'MAIN', files: ['/content-scripts/player-bridge.js'] }),
        browser.scripting.executeScript({ target: { tabId: id }, files: ['/content-scripts/content.js'] }),
      ]));
    } catch (error) {
      console.error('Could not initialize plugins in open YouTube tabs', error);
    }
  });
});
