// @ts-check

/** @type {import('../plugin-engine').Plugin} */
const plugin = {
  id: 'shorts-as-videos',
  name: 'Open Shorts as Videos',
  description: 'Open Shorts in the standard watch page and video player.',
  version: '1.0.0',
  authors: ['Antinity'],
  activate() {
    /** @param {URL} [url] */
    function redirect(url = new URL(location.href)) {
      const id = /^\/shorts\/([\w-]+)\/?$/.exec(url.pathname)?.[1];
      if (!id) return;
      const watch = new URL(url);
      watch.pathname = '/watch';
      watch.searchParams.set('v', id);
      location.replace(watch.href);
    }

    redirect();
    return { onNavigate: redirect };
  },
};

export default plugin;
