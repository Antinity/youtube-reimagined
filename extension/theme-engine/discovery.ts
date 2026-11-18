const bundledThemes = import.meta.glob<string>('../themes/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const folderCss = import.meta.glob<string>('../themes/*/theme.css', { query: '?raw', import: 'default', eager: true });
const folderMetadata = import.meta.glob<string>('../themes/*/metadata.js', { query: '?raw', import: 'default', eager: true });

export function discoverThemeFolders() {
  return Object.entries(folderCss).map(([path, css]) => {
    const directory = path.slice(0, path.lastIndexOf('/'));
    return { folder: directory.slice(directory.lastIndexOf('/') + 1), css, metadata: folderMetadata[`${directory}/metadata.js`] };
  });
}

export function discoverThemeSources(): { filename: string; source: string }[] {
  return Object.entries(bundledThemes).map(([path, source]) => ({
    filename: path.slice(path.lastIndexOf('/') + 1),
    source,
  }));
}
