# Build a theme

Themes use CSS to change YouTube’s appearance. A theme folder contains `theme.css`, declarative `metadata.js`, and an optional preview. For import, put that one folder inside a ZIP.

## Your first theme

Create these files.

```text
soft-accents/
  metadata.js
  theme.css
```

In `metadata.js`, describe the theme and its setting.

```js
export default {
  id: 'soft-accents',
  name: 'Soft Accents',
  description: 'Add a color accent to the YouTube masthead.',
  version: '1.0.0',
  authors: ['Your Name'],
  schemaVersion: 1,
  options: {
    accent: {
      type: 'color',
      label: 'Accent color',
      default: '#794f9e',
    },
  },
};
```

In `theme.css`, read the setting through its custom property.

```css
#masthead-container {
  border-bottom: 3px solid var(--yr-theme-accent, #794f9e);
}
```

ZIP the `soft-accents` folder itself so it is the archive’s only top-level entry. In the popup, choose **Import a theme**, select the ZIP, click **Install theme**, and select **Soft Accents**. Change the accent color, then choose **No theme** to check that the border disappears.

## Metadata and archive reference

| Field | Requirement |
| --- | --- |
| `id` | Required stable ID. Use lowercase letters and digits separated by single hyphens. |
| `name`, `description`, `version` | Required non-empty strings. |
| `authors` | Required array of strings. |
| `contributors` | Optional array of strings. |
| `schemaVersion` | Optional format version. Use the number `1`. |
| `homepage`, `license` | Optional absolute HTTPS URL and license name, respectively. |
| `options` | Optional object of [setting definitions](module-settings.md). |

`metadata.js` must contain a single `export default { ... }` with literal values. Arrays and nested objects are supported. Imports, functions, computed keys, and spreads are unsupported. The extension parses this file as data.

- Use one folder whose name starts with a letter or digit and contains only letters, digits, dots, underscores, or hyphens. Keep the two required filenames exactly as shown. Extra files, nested folders, and encrypted ZIP entries are rejected.
- The optional image must be called `preview.png`, `preview.jpg`, `preview.jpeg`, or `preview.webp`. Use a 4:3 image, such as 800×600, up to 2 MB and 4096 px per side. The popup generates a gray preview when the file is omitted.
- The ZIP can be up to 4 MB. Inside it, `theme.css` can be up to 500 KB and `metadata.js` up to 100 KB. Save both text files as UTF-8.
- Keep CSS self-contained. Imported CSS rejects `@import`, `@font-face`, `url()` (including data URLs), and unsupported resource-loading functions. For conditional rules, use supported at-rules such as `@media`, `@supports`, `@container`, and `@layer`.
- The remaining supported at-rules are `@keyframes`, `@-webkit-keyframes`, `@scope`, `@starting-style`, and `@property`.

To bundle a theme, add its folder to [`extension/themes/`](../extension/themes/) and [run the extension in dev mode](development.md). See [Custom Colors](../extension/themes/custom-colors/) for a bundled example.

## Existing standalone themes

The importer also accepts `.css` or `.theme.css` with a leading `@layer yr-theme` metadata block or a legacy `/* ==Theme== … ==/Theme== */` JSON header. If you are converting an existing theme to a folder, put its metadata in `metadata.js` and the remaining style rules in `theme.css`. Keep the same ID and setting keys to preserve preferences when replacing it.
