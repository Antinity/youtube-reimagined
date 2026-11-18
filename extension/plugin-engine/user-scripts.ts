import { browser, type Browser } from 'wxt/browser';
import { youtubeMatches } from '@/youtube';
import { installedKey, isInstalledKey, type InstalledPlugin } from './installed';
import { enabledKey, readPluginSettings } from './storage';

const prefix = 'yr-plugin:';
const adapter = '/user-plugin.js';

export function userScriptAccess(): string | undefined {
  if (import.meta.env.BROWSER === 'firefox' || import.meta.env.BROWSER === 'safari') {
    return 'Third-party plugins require Chromium with the User Scripts API.';
  }
  try {
    if (typeof browser.userScripts?.execute === 'function') return;
  } catch {
    // Chromium can throw when the per-extension setting is disabled.
  }
  return 'Third-party plugins require Chromium 135 or newer. Enable Allow User Scripts in this extension’s details (Developer mode in Chromium 135–137).';
}

function registration(plugin: InstalledPlugin): Browser.userScripts.RegisteredUserScript {
  const { metadata, revision } = plugin;
  const code = `globalThis.__yrAttachPlugin(${JSON.stringify(metadata.id)}, ${JSON.stringify(revision)}, ${plugin.factory});`;
  return {
    id: `${prefix}${revision}`,
    matches: youtubeMatches,
    world: 'USER_SCRIPT',
    worldId: `yr-${metadata.id}`,
    js: [{ file: adapter }, { code }],
  };
}

export function startUserScripts() {
  let sync = Promise.resolve();

  async function reconcile() {
    if (userScriptAccess()) return;
    const values = await browser.storage.local.get(null);
    const scripts = Object.entries(values)
      .filter(([key, plugin]) => isInstalledKey(key) && values[enabledKey((plugin as InstalledPlugin).metadata.id)] === true)
      .map(([, plugin]) => registration(plugin as InstalledPlugin));
    const present = await browser.userScripts.getScripts();
    const desired = new Set(scripts.map(({ id }) => id));
    const obsolete = present.filter(({ id }) => id.startsWith(prefix) && !desired.has(id)).map(({ id }) => id);
    if (obsolete.length) await browser.userScripts.unregister({ ids: obsolete });

    const existing = new Set(present.map(({ id }) => id));
    for (const script of scripts) {
      if (existing.has(script.id)) continue;
      try {
        await browser.userScripts.configureWorld({ worldId: script.worldId, messaging: true });
        await browser.userScripts.register([script]);
        const tabs = await browser.tabs.query({ url: youtubeMatches });
        await Promise.allSettled(tabs.map(async ({ id }) => {
          if (id === undefined) return;
          try {
            const results = await browser.userScripts.execute({
              target: { tabId: id }, world: 'USER_SCRIPT', worldId: script.worldId,
              js: [{ file: adapter }, script.js![1]!],
            });
            for (const result of results) if (result.error) console.error('Third-party plugin injection failed', result.error);
          } catch (error) {
            console.error('Could not inject a third-party plugin into an open YouTube tab', error);
          }
        }));
      } catch (error) {
        console.error(`Could not register third-party plugin ${script.worldId}`, error);
      }
    }
  }

  const schedule = () => {
    sync = sync.then(reconcile).catch((error) => console.error('Could not synchronize third-party plugins', error));
  };

  browser.runtime.onUserScriptConnect?.addListener((port) => {
    const [namespace, id, revision] = port.name.split(':');
    if (`${namespace}:` !== prefix || !id || !revision || port.sender?.frameId !== 0
      || !/^https?:\/\/(?:www|m)\.youtube\.com\//.test(port.sender.url ?? '')) {
      port.disconnect();
      return;
    }

    void (async () => {
      try {
        const values = await browser.storage.local.get(null);
        const plugin = values[installedKey(id)] as InstalledPlugin | undefined;
        if (plugin?.revision === revision && values[enabledKey(id)] === true) {
          port.postMessage({ settings: readPluginSettings(plugin.metadata, values) });
        } else {
          port.disconnect();
        }
      } catch (error) {
        console.error(`Could not initialize third-party plugin ${id}`, error);
      }
    })();
  });

  browser.storage.local.onChanged.addListener((changes) => {
    if (Object.keys(changes).some((key) => isInstalledKey(key) || /^plugin:[^:]+:enabled$/.test(key))) schedule();
  });
  schedule();
}
