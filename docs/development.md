# Development workflow

The browser extension lives in [`extension/`](../extension/). Run the commands below there. See the [project README](../README.md#get-started) for the unpacked install workflow.

```sh
npm ci
npm run dev
```

WXT launches a development browser with the extension loaded. Add bundled plugins directly under `extension/plugins/` and put each bundled theme in a folder under `extension/themes/`. The build discovers them automatically.

If the popup shows a stale module list after an edit, close and reopen it. If an existing YouTube tab still runs old content-script code, refresh the tab. For an unpacked production build, rebuild and click **Reload** on the browser’s Extensions page before refreshing YouTube.

## Build and check

| Command | Purpose |
| --- | --- |
| `npm run compile` | Check TypeScript. |
| `npm run build` | Build for Chrome into `.output/chrome-mv3`. |
| `npm run zip` | Package the Chrome extension. |
| `npm run dev:firefox` | Run WXT in Firefox development mode. |
| `npm run build:firefox` | Build for Firefox into `.output/firefox-mv2`. |
| `npm run zip:firefox` | Package the Firefox extension. |

Each local build overwrites the unpacked build folders. To install or verify a specific release, use its versioned ZIP and check that ZIP’s `manifest.json`.

When changing a module, test it in an already-open YouTube tab. Change its settings, navigate within YouTube, and disable the plugin or switch away from the theme to check cleanup. For an imported module, run the same checks after installing it through the popup so you exercise validation and the imported runtime. Imported JavaScript execution requires Chromium’s User Scripts API.

Keep changes focused and commit each verified change using Conventional Commits, for example `docs(themes): clarify preview requirements`.
