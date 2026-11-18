const bundledThemes = import.meta.glob<string>('../themes/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export function discoverThemeSources(): { filename: string; source: string }[] {
  return Object.entries(bundledThemes).map(([path, source]) => ({
    filename: path.slice(path.lastIndexOf('/') + 1),
    source,
  }));
}
