# YouTube Reimagined

Customize YouTube with plugins that change how it works and themes that change how it looks. Enable several plugins together and choose one theme at a time. Settings are stored in your browser.

## Get started

1. Clone or download this repository.
2. With Node.js 22.12 or newer and npm installed, run these commands from the repository root.

```sh
cd extension
npm ci
npm run build
```

3. In Chrome, open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and choose `extension/.output/chrome-mv3`.
4. Open YouTube and click **YouTube Reimagined** in the Extensions menu. If YouTube was already open when you installed the extension, refresh the tab once.

## Documentation

- [User guide](docs/user-guide.md) covers settings, module imports, backups, and resets.
- [Plugin development](docs/plugin-development.md) walks through a working JavaScript plugin and its lifecycle.
- [Theme development](docs/theme-development.md) walks through a CSS theme, its ZIP layout, and the metadata format.
- [Module settings reference](docs/module-settings.md) lists the settings available to both plugins and themes.
- [Development workflow](docs/development.md) covers dev mode, browser builds, and testing bundled modules.
