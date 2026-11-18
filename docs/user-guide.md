# User guide

Open **YouTube Reimagined** from your browser’s Extensions menu. The extension runs on `www.youtube.com` and `m.youtube.com`.

## Plugins and themes

Turn plugins on or off independently. Look for a plugin’s settings section to change its behavior. Under **Themes**, select one theme or choose **No theme** to remove its styles. Switching themes keeps each theme’s settings. Changes usually reach open YouTube tabs immediately.

To install a plugin, use **Import a JavaScript plugin**, choose a single `.js` file, and click **Install**. Imported plugins start disabled. Enable only plugins whose JavaScript you trust.

Imported JavaScript requires Chromium 135 or later. On Chromium 138 or later, open the extension’s details and enable **Allow User Scripts**. On versions 135–137, enable **Developer mode** on the Extensions page. Return to the popup and use **Check access** if the permission message is still showing. Firefox builds support bundled plugins and CSS themes.

To install a theme, use **Import a theme**, choose a theme ZIP, and click **Install theme**. Select it once installed. Existing standalone `.css` and `.theme.css` files in the extension’s supported formats still work. See [theme development](theme-development.md) for the accepted formats. When an imported module ID already exists, review the replacement prompt. Bundled IDs are reserved.

## Back up or restore

In **Data management**, choose **Export configuration** to save a JSON backup of the current preferences, module settings, and installed plugin and theme files, including theme previews. **Export user modules** creates a ZIP of the installed modules. Use the ZIP to transfer source files and the JSON when you want to restore your configuration.

1. Under **Choose configuration backup**, select a JSON backup and review its preview.
2. Choose **Merge** to apply the backup while keeping modules absent from it, or **Replace** to remove installed modules absent from the backup and replace the saved preferences. For matching user modules, both modes use the backup’s copy.
3. Leave **Enable third-party plugins marked enabled in this backup** unchecked unless you trust those scripts and want to run them. Click **Restore configuration**.

Validation errors identify the affected field or file and include a source location where available. A backup that fails validation leaves the current configuration intact.

## Reset or remove data

- **Reset [module name] settings** in a module’s settings restores its defaults.
- **Reset preferences** restores default settings and selections while keeping installed modules.
- **Remove user modules** removes imported plugins and themes and their settings.
- **Reset all data** clears the extension’s saved configuration and installed modules.

Each reset asks for confirmation.
