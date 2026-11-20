import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { checkForUpdateMessage, dismissedUpdateKey, latestReleaseUrl } from '@/data/updates';
import { AppIcon } from './Icon';

export function UpdateToast() {
  const [version, setVersion] = useState<string>();

  useEffect(() => {
    let active = true;
    void browser.runtime.sendMessage(checkForUpdateMessage).then((update) => {
      if (active && typeof update === 'string') setVersion(update);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  function dismiss() {
    setVersion(undefined);
    void browser.storage.local.set({ [dismissedUpdateKey]: version }).catch(() => {});
  }

  return <>
    <p className="visually-hidden" role="status">{version && `Update available. Version ${version}.`}</p>
    {version && <div className="update-toast">
      <p><strong>Update available</strong><small>Version {version}</small></p>
      <a href={latestReleaseUrl} target="_blank" rel="noreferrer">View release</a>
      <button className="icon-button" aria-label="Dismiss update" title="Dismiss update" onClick={dismiss}>
        <AppIcon name="close" size={16} />
      </button>
    </div>}
  </>;
}
