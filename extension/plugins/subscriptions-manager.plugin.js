// @ts-check

import { youtubeSubscriptionsUrl } from '@/youtube';
import { mountSubscriptionsManager } from './shared/subscriptions-manager';

/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'subscriptions-manager',
  name: 'Subscriptions Manager',
  description: 'Search, select, and unsubscribe from channels in batches on the YouTube subscriptions page.',
  version: '1.0.0',
  authors: ['Antinity'],
  options: {
    compact: { type: 'boolean', label: 'Start in compact view', default: true },
  },
  activate({ settings, onCleanup }) {
    /** @type {ReturnType<typeof mountSubscriptionsManager> | undefined} */
    let manager;
    function route(url = new URL(location.href)) {
      if (url.origin + url.pathname === youtubeSubscriptionsUrl) {
        manager ??= mountSubscriptionsManager(settings.compact === true);
      } else {
        manager?.dispose();
        manager = undefined;
      }
    }
    route();
    onCleanup(() => manager?.dispose());
    return {
      onNavigate: route,
      onSettingsChange(next) {
        if (settings.compact !== next.compact) manager?.setCompact(next.compact === true);
        settings = next;
      },
    };
  },
};

export default plugin;
