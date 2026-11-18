# Build a plugin

A plugin is a JavaScript module with one default export. Use the same self-contained `.js` file for local import or to start a bundled plugin.

## Your first plugin

Save this as `channel-focus.plugin.js`. It dims YouTube’s sidebar and restores it when disabled.

```js
export default {
  id: 'channel-focus',
  name: 'Channel Focus',
  description: 'Dim the sidebar while browsing YouTube.',
  version: '1.0.0',
  authors: ['Your Name'],
  apiVersion: 1,
  options: {
    sidebarOpacity: {
      type: 'range',
      label: 'Sidebar opacity',
      default: 0.5,
      min: 0.1,
      max: 1,
      step: 0.1,
    },
  },

  activate({ settings, onCleanup }) {
    const style = document.createElement('style');
    (document.head ?? document.documentElement).append(style);
    onCleanup(() => style.remove());

    function apply({ sidebarOpacity }) {
      style.textContent = `ytd-guide-renderer { opacity: ${sidebarOpacity}; }`;
    }

    apply(settings);
    return { onSettingsChange: apply };
  },
};
```

Import the file from the popup, click **Install**, then enable **Channel Focus**. On desktop YouTube, open the full sidebar and change **Sidebar opacity**. Disable the plugin and check that the original opacity returns. See the [user guide](user-guide.md#plugins-and-themes) for user-script permissions.

## Metadata reference

| Field | Requirement |
| --- | --- |
| `id` | Required stable ID. Use lowercase letters and digits separated by single hyphens. Keep it unchanged across releases to preserve stored settings. |
| `name`, `description`, `version` | Required non-empty strings. Use a version such as `1.0.0`. |
| `authors` | Required array of strings. |
| `contributors` | Optional array of strings. |
| `apiVersion` | Optional API version. The supported value is the number `1`. |
| `options` | Optional object of [setting definitions](module-settings.md). |
| `activate` | Required synchronous function. |

The importer reads the source without running it. Use a default-exported object literal or a top-level `const` that points to one. Metadata, options, and their values must be literals or resolvable top-level constants. Imports, named exports, computed metadata keys, spreads in metadata, and top-level `await` are unsupported. Ordinary helper functions can live in the same file.

## Lifecycle reference

| API | When and how to use it |
| --- | --- |
| `activate({ settings, onCleanup })` | Runs in a matching tab when the module becomes active. Apply the current settings here. Return a hooks object or return nothing. |
| `settings` | Read-only snapshot keyed by setting ID. Nested groups still produce flat setting keys. |
| `onCleanup(fn)` | Register teardown for every stylesheet, listener, observer, or timer you create. Callbacks run in reverse registration order on deactivation or when activation throws. |
| `onNavigate(url)` | Optional returned hook. Receives a `URL` when the tab’s URL changes, including YouTube’s in-page navigation. Use it for route-sensitive behavior. If you need elements that load later, wait for them with an observer and register its cleanup. |
| `onSettingsChange(settings)` | Optional returned hook. Receives the new full settings snapshot. Update the existing styles or listeners in place. |

Keep side effects inside `activate`. Bundled modules can be loaded outside the page during discovery. Imported plugins run in Chromium’s user-script world and can work with the page DOM. Use the context and hooks above for runtime integration.

To bundle a plugin, place it in [`extension/plugins/`](../extension/plugins/) and [run the extension in dev mode](development.md). Use the bundled [Hide Shorts plugin](../extension/plugins/hide-shorts.plugin.js) as another reference.
