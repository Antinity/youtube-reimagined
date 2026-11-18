import { BlobReader, ZipReader, type Entry } from '@zip.js/zip.js';
import { browser } from 'wxt/browser';
import { discoverPlugins } from '@/plugin-engine';
import { validatePluginImport, type PluginImportCandidate } from '@/plugin-engine/import';
import { installedKey, pluginErrorKey, type InstalledPluginInfo } from '@/plugin-engine/installed';
import { enabledKey } from '@/plugin-engine/storage';
import { readThemeEntries, readZipFile } from '@/theme-engine/archive';
import { validateThemeImport } from '@/theme-engine/import';
import { assertInstallableTheme, installedThemes, installedThemesKey } from '@/theme-engine/installed';
import type { Theme } from '@/theme-engine/schema';
import { themeApplicationErrorKey } from '@/theme-engine/diagnostics';
import { withModuleLocks } from './restore';

type Module = { kind: 'plugin'; plugin: PluginImportCandidate } | { kind: 'theme'; theme: Theme };
type Candidate = Module & { replaces?: { revision: string; version: string } };

export interface ModuleImport {
  modules: Candidate[];
  errors: string[];
}

function moduleMetadata(module: Module) {
  return module.kind === 'plugin' ? module.plugin.metadata : module.theme.metadata;
}

function safePath(entry: Entry) {
  const name = entry.filename.replace(/\/$/, '');
  return !entry.encrypted && name.split('/').every((part) =>
    part && part !== '.' && part !== '..' && !/[\\:<>"|?*\x00-\x1f]/.test(part));
}

export async function inspectModuleImport(file: File, modsOnly = false): Promise<ModuleImport> {
  const maxBytes = 32_000_000;
  if (file.size > maxBytes) throw new Error('Choose a file up to 32 MB.');
  const modules: Module[] = [];
  const errors: string[] = [];
  async function inspect(name: string, read: () => Module | Promise<Module>) {
    try {
      modules.push(await read());
    } catch (cause) {
      errors.push(`${name}: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }

  if (/\.zip$/i.test(file.name)) {
    const zip = new ZipReader(new BlobReader(file), { useWebWorkers: false });
    try {
      const entries = await zip.getEntries();
      if (entries.reduce((sum, entry) => sum + entry.uncompressedSize, 0) > maxBytes) {
        throw new Error('Expected a ZIP with up to 32 MB of extracted files.');
      }
      const singleTheme = entries.some(({ filename }) => /^plugins\/theme\.css$/i.test(filename));
      const bundle = modsOnly || !singleTheme && entries.some(({ filename }) => /^themes\/[^/]+\/|^plugins\/[^/]+\.js$/i.test(filename));
      if (!bundle) {
        if (file.size > 4_000_000) throw new Error('Expected a theme ZIP up to 4 MB.');
        await inspect(file.name, async () => ({ kind: 'theme', theme: await readThemeEntries(entries) }));
      } else {
        const seen = new Set<string>();
        const themes = new Map<string, Entry[]>();
        for (const entry of entries) {
          const path = entry.filename;
          if (!safePath(entry) || seen.has(path.toLowerCase())) {
            errors.push(`${path}: expected a unique, safe, unencrypted ZIP path.`);
            continue;
          }
          seen.add(path.toLowerCase());
          if (entry.directory && (path === 'plugins/' || path === 'themes/')) continue;
          if (!entry.directory && /^plugins\/[^/]+\.js$/i.test(path)) {
            const name = path.slice('plugins/'.length);
            await inspect(path, async () => ({ kind: 'plugin', plugin: validatePluginImport(name,
              new TextDecoder('utf-8', { fatal: true }).decode(await readZipFile(entry, maxBytes))) }));
          } else {
            const folder = /^themes\/([a-z0-9][a-z0-9._-]*)\//i.exec(path)?.[1];
            if (!folder) {
              errors.push(`${path}: expected plugins/<file>.js or themes/<folder>/<file>.`);
              continue;
            }
            const files = themes.get(folder) ?? [];
            files.push(entry);
            themes.set(folder, files);
          }
        }
        for (const [folder, entries] of themes) {
          await inspect(`themes/${folder}`, async () => ({ kind: 'theme', theme: await readThemeEntries(entries, 'themes/') }));
        }
      }
    } finally {
      await zip.close().catch(() => {});
    }
  } else if (!modsOnly && /\.js$/i.test(file.name)) {
    await inspect(file.name, async () => ({ kind: 'plugin', plugin: validatePluginImport(file.name, await file.text()) }));
  } else if (!modsOnly && /\.css$/i.test(file.name)) {
    await inspect(file.name, async () => ({ kind: 'theme', theme: validateThemeImport(file.name, await file.text()) }));
  } else {
    throw new Error(modsOnly ? 'Choose a mods ZIP.' : 'Choose a .js, .css, or .zip file.');
  }

  const [values, bundled] = await Promise.all([browser.storage.local.get(null), discoverPlugins()]);
  const themes = installedThemes(values);
  const seen = new Set<string>();
  const candidates = modules.map((module): Candidate => {
    const { id } = moduleMetadata(module);
    const key = `${module.kind}:${id}`;
    if (seen.has(key)) errors.push(`Duplicate ${module.kind} ID "${id}" in the selected file.`);
    seen.add(key);
    try {
      if (module.kind === 'theme') assertInstallableTheme(id);
      else if (bundled.some((plugin) => plugin.id === id)) throw new Error(`"${id}" belongs to a bundled plugin.`);
    } catch (cause) {
      errors.push(cause instanceof Error ? cause.message : String(cause));
    }
    const current = module.kind === 'plugin' ? values[installedKey(id)] as InstalledPluginInfo | undefined
      : themes.find(({ metadata }) => metadata.id === id);
    return { ...module, replaces: current ? { revision: current.revision, version: current.metadata.version } : undefined };
  });
  if (!candidates.length && !errors.length) errors.push('No plugins or themes were found in the selected file.');
  return { modules: candidates, errors };
}

export async function installModuleImport(preview: ModuleImport): Promise<void> {
  if (preview.errors.length || !preview.modules.length) throw new Error('Resolve import errors before installing.');
  await withModuleLocks(async () => {
    const values = await browser.storage.local.get(null);
    const themes = new Map(installedThemes(values).map((theme) => [theme.metadata.id, theme]));
    const changes: Record<string, unknown> = {};
    for (const module of preview.modules) {
      const { id } = moduleMetadata(module);
      const current = module.kind === 'plugin' ? values[installedKey(id)] as InstalledPluginInfo | null | undefined : themes.get(id);
      if (current?.revision !== module.replaces?.revision || Boolean(current) !== Boolean(module.replaces)) {
        throw new Error(`"${id}" changed while reviewing the import. Choose the file again.`);
      }
      const revision = crypto.randomUUID();
      if (module.kind === 'plugin') {
        changes[installedKey(id)] = { ...module.plugin, revision };
        changes[enabledKey(id)] = false;
        changes[pluginErrorKey(id)] = null;
      } else {
        themes.set(id, { ...module.theme, revision });
        changes[installedThemesKey] = [...themes.values()];
        changes[themeApplicationErrorKey] = null;
      }
    }
    await browser.storage.local.set(changes);
  });
}
