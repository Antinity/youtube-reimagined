const bundledThemes = import.meta.glob<string>('../themes/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const folderCss = import.meta.glob<string>('../themes/*/theme.css', { query: '?raw', import: 'default', eager: true });
const folderMetadata = import.meta.glob<string>('../themes/*/metadata.js', { query: '?raw', import: 'default', eager: true });
const previews = import.meta.glob<string>('../themes/*/preview.{png,jpg,jpeg,webp}', { query: '?inline', import: 'default', eager: true });

export function discoverThemeFolders() {
  return Object.entries(folderCss).map(([path, css]) => {
    const directory = path.slice(0, path.lastIndexOf('/'));
    const image = Object.entries(previews).find(([file]) => file.slice(0, file.lastIndexOf('/')) === directory);
    return {
      folder: directory.slice(directory.lastIndexOf('/') + 1), css, metadata: folderMetadata[`${directory}/metadata.js`],
      preview: image ? { name: image[0].slice(image[0].lastIndexOf('/') + 1), dataUrl: image[1] } : undefined,
    };
  });
}

export function discoverThemeSources(): { filename: string; source: string }[] {
  return Object.entries(bundledThemes).map(([path, source]) => ({
    filename: path.slice(path.lastIndexOf('/') + 1),
    source,
  }));
}
