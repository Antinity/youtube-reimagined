import { browser, type Browser } from 'wxt/browser';
import { youtubeMatches } from '@/youtube';
import { installedKey, isInstalledKey, reportInstalledError, type InstalledPlugin } from './installed';
import { enabledKey, readPluginSettings } from './storage';
import type { PluginSettings } from './index';

const prefix = 'yr-plugin:';
const adapter = '/user-plugin.js';
const sessionKey = 'user-plugin-world-session';
export const refreshUserScriptsMessage = 'refresh-user-scripts';

export type UserPluginMessage = { settings: PluginSettings } | { stop: true };

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

function registration(plugin: InstalledPlugin, session: string): Browser.userScripts.RegisteredUserScript {
  const { metadata, revision } = plugin;
  const name = `${prefix}${metadata.id}:${revision}:${session}`;
  const code = `globalThis.__yrAttachPlugin(${JSON.stringify(metadata.id)}, ${JSON.stringify(name)}, ${plugin.factory});\n//# sourceURL=yt-reimagined-plugin-${metadata.id}.js`;
  return {
    id: `${prefix}${session}:${revision}`,
    matches: youtubeMatches,
    world: 'USER_SCRIPT',
    worldId: `yr-${session}-${metadata.id}`,
    js: [{ file: adapter }, { code }],
  };
}

export function startUserScripts() {
  let sync = Promise.resolve();
  let worldSession: string | undefined;
  const sessions = new Map<Browser.runtime.Port, { id: string; revision: string; session: string }>();

  function updateSessions(values: Readonly<Record<string, unknown>>, allowed: boolean) {
    for (const [port, { id, revision, session }] of sessions) {
      const plugin = values[installedKey(id)] as InstalledPlugin | undefined;
      const enabled = allowed && session === worldSession && plugin?.revision === revision && values[enabledKey(id)] === true;
      const message: UserPluginMessage = enabled ? { settings: readPluginSettings(plugin.metadata, values) } : { stop: true };
      if (!enabled) sessions.delete(port);
      try {
        port.postMessage(message);
      } catch {
        sessions.delete(port);
      }
    }
  }

  async function reconcile(updateRegistry: boolean) {
    const values = await browser.storage.local.get(null);
    const access = userScriptAccess();
    if (!access && !worldSession) {
      // Chromium restores registered scripts across restarts, but their renderer messaging may be stale.
      const cached = (await browser.storage.session.get(sessionKey))[sessionKey];
      worldSession = typeof cached === 'string' ? cached : crypto.randomUUID();
      if (worldSession !== cached) await browser.storage.session.set({ [sessionKey]: worldSession });
    }
    updateSessions(values, !access);
    if (!updateRegistry || access || !worldSession) return;
    const session = worldSession;
    const plugins = Object.entries(values)
      .filter(([key, plugin]) => isInstalledKey(key) && values[enabledKey((plugin as InstalledPlugin).metadata.id)] === true)
      .map(([, plugin]) => plugin as InstalledPlugin);
    const scripts = plugins.map((plugin) => registration(plugin, session));
    const present = await browser.userScripts.getScripts();
    const desired = new Set(scripts.map(({ id }) => id));
    const obsolete = present.filter(({ id }) => id.startsWith(prefix) && !desired.has(id));
    if (obsolete.length) {
      await browser.userScripts.unregister({ ids: obsolete.map(({ id }) => id) });
      const worlds = new Set(scripts.map(({ worldId }) => worldId));
      for (const { worldId } of obsolete) {
        if (worldId && !worlds.has(worldId)) await browser.userScripts.resetWorldConfiguration(worldId);
      }
    }

    const existing = new Set(present.map(({ id }) => id));
    for (const [index, script] of scripts.entries()) {
      if (existing.has(script.id)) continue;
      const { metadata, revision } = plugins[index]!;
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
            for (const result of results) if (result.error) throw new Error(result.error);
          } catch (error) {
            // A tab may close or leave YouTube between the query and injection.
            const current = await browser.tabs.get(id).catch(() => undefined);
            if (current?.url && /^https?:\/\/(?:www|m)\.youtube\.com\//.test(current.url)) {
              await reportInstalledError(metadata.id, revision, `Could not run in an open YouTube tab: ${String(error)}`);
            }
          }
        }));
      } catch (error) {
        console.error(`Could not register third-party plugin ${script.worldId}`, error);
        await reportInstalledError(metadata.id, revision, `Could not register user script: ${String(error)}`).catch(console.error);
      }
    }
  }

  const schedule = (updateRegistry: boolean) => {
    sync = sync.then(() => reconcile(updateRegistry)).catch((error) => console.error('Could not synchronize third-party plugins', error));
    return sync;
  };

  browser.runtime.onUserScriptConnect?.addListener((port) => {
    const [namespace, id, revision, session] = port.name.split(':');
    if (`${namespace}:` !== prefix || !id || !revision || !session || port.sender?.frameId !== 0
      || !/^https?:\/\/(?:www|m)\.youtube\.com\//.test(port.sender.url ?? '')) {
      port.disconnect();
      return;
    }

    sessions.set(port, { id, revision, session });
    port.onDisconnect.addListener(() => sessions.delete(port));
    port.onMessage.addListener((message: unknown) => {
      if (session === worldSession && message && typeof message === 'object' && 'error' in message && typeof message.error === 'string') {
        void reportInstalledError(id, revision, message.error).catch(console.error);
      }
    });
    schedule(false);
  });

  browser.storage.local.onChanged.addListener((changes) => {
    const keys = Object.keys(changes);
    if (keys.some((key) => isInstalledKey(key) || /^plugin:[^:]+:enabled$/.test(key))) schedule(true);
    else if (sessions.size && keys.some((key) => /^plugin:[^:]+:setting:/.test(key))) schedule(false);
  });
  browser.runtime.onStartup.addListener(() => schedule(true));
  browser.runtime.onInstalled.addListener(() => schedule(true));
  browser.permissions.onAdded.addListener(() => schedule(true));
  browser.permissions.onRemoved.addListener(() => schedule(true));
  browser.runtime.onMessage.addListener((message, sender, reply) => {
    if (message !== refreshUserScriptsMessage || sender.url !== browser.runtime.getURL('/popup.html')) return;
    void schedule(true).then(() => reply(userScriptAccess() ?? null));
    return true;
  });
  schedule(true);
}
