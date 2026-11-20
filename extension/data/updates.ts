import { browser } from 'wxt/browser';

const repository = 'Antinity/youtube-reimagined';
export const repositoryUrl = `https://github.com/${repository}`;
export const latestReleaseUrl = `${repositoryUrl}/releases/latest`;
export const checkForUpdateMessage = 'updates:check';
export const dismissedUpdateKey = 'updates:dismissed';

const releaseCacheKey = 'updates:latest';
const checkInterval = 6 * 60 * 60 * 1000;
const retryInterval = 15 * 60 * 1000;

type ReleaseCheck = { version: string | null; expiresAt: number };
let pendingCheck: Promise<ReleaseCheck> | undefined;

async function checkLatestRelease(): Promise<ReleaseCheck> {
  let version = null;
  try {
    const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
      credentials: 'omit',
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const { tag_name: tag } = await response.json();
      if (typeof tag === 'string') version = /^v?(\d{1,5}\.\d{1,5}\.\d{1,5})$/.exec(tag)?.[1] ?? null;
    }
  } catch {
    // An unavailable release check should not interrupt the popup.
  }

  const check = { version, expiresAt: Date.now() + (version ? checkInterval : retryInterval) };
  await browser.storage.local.set({ [releaseCacheKey]: check });
  return check;
}

export async function getAvailableUpdate(): Promise<string | null> {
  const values = await browser.storage.local.get([releaseCacheKey, dismissedUpdateKey]);
  let release = values[releaseCacheKey] as ReleaseCheck | undefined;
  if (!release || release.expiresAt <= Date.now()) {
    pendingCheck ??= checkLatestRelease().finally(() => { pendingCheck = undefined; });
    release = await pendingCheck;
  }

  const { version } = release;
  if (!version || version === values[dismissedUpdateKey]) return null;

  const installed = browser.runtime.getManifest().version.split('.').map(Number);
  for (const [index, part] of version.split('.').map(Number).entries()) {
    const installedPart = installed[index] ?? 0;
    if (part !== installedPart) return part > installedPart ? version : null;
  }
  return null;
}
