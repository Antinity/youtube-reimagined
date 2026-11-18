import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { discoverPlugins, type Plugin, type PluginMetadata, type PluginOption, type PluginOptionValue } from '@/plugin-engine';
import {
  pluginErrorKey, removePlugin, setInstalledEnabled, setInstalledSetting, watchInstalledPlugins,
  type InstalledPluginError, type InstalledPluginInfo,
} from '@/plugin-engine/installed';
import {
  enabledKey, pluginStorageKeys, readPluginSettings, setPluginEnabled, setPluginSetting, watchPluginStorage,
} from '@/plugin-engine/storage';
import { refreshUserScriptsMessage, userScriptAccess } from '@/plugin-engine/user-scripts';
import { AddPage } from './AddPage';
import { AboutPage } from './AboutPage';
import { BrowsePage } from './BrowsePage';
import { appearanceKey, pauseModsKey, readAppearance } from '@/data/preferences';
import ThemeManagement from './ThemeManagement';
import { Settings } from './Settings';
import { AppIcon } from './Icon';
import { Badge, Search, Shell, type Page } from './Shell';
import { useConfirm } from './Confirm';
import { ModuleDetails } from './ModuleDetails';
import { Checkbox } from './Options';

export default function App() {
  const [page, setPage] = useState<Page>('plugins');
  const [detail, setDetail] = useState<string>();
  const [transfer, setTransfer] = useState<'mods' | 'settings'>();
  const [preferences, setPreferences] = useState<Readonly<Record<string, unknown>>>({});
  const [query, setQuery] = useState('');
  const confirm = useConfirm();
  const [plugins, setPlugins] = useState<Plugin[]>();
  const [installed, setInstalled] = useState<InstalledPluginInfo[]>();
  const [values, setValues] = useState<Readonly<Record<string, unknown>>>();
  const [error, setError] = useState('');
  const [accessError, setAccessError] = useState(userScriptAccess);
  const appearance = readAppearance(preferences);

  useEffect(() => watchPluginStorage([appearanceKey, pauseModsKey], setPreferences,
    (cause) => setError(`Could not read preferences. ${String(cause)}`)), []);

  useEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    function updateAppearance() {
      document.documentElement.dataset.appearance = appearance === 'system'
        ? system.matches ? 'dark' : 'light' : appearance;
    }
    updateAppearance();
    system.addEventListener('change', updateAppearance);
    return () => system.removeEventListener('change', updateAppearance);
  }, [appearance]);

  useEffect(() => {
    let cancelled = false;
    void discoverPlugins().then((found) => {
      if (!cancelled) setPlugins(found);
    }).catch((cause) => {
      if (cancelled) return;
      console.error(cause);
      setError('Could not load plugins.');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => watchInstalledPlugins(setInstalled, (cause) => {
    setError(`Could not read installed plugins. ${String(cause)}`);
  }), []);

  useEffect(() => {
    if (!plugins || !installed) return;
    return watchPluginStorage([
      ...plugins.flatMap(pluginStorageKeys),
      ...installed.flatMap(({ metadata }) => [...pluginStorageKeys(metadata), pluginErrorKey(metadata.id)]),
    ], setValues, (cause) => setError(`Could not read plugin storage. ${String(cause)}`));
  }, [plugins, installed]);

  function checkAccess() {
    setAccessError(userScriptAccess());
    void browser.runtime.sendMessage(refreshUserScriptsMessage).catch((cause) => setError(String(cause)));
  }

  const bundledIds = new Set(plugins?.map(({ id }) => id));
  const thirdPartyPlugins = installed?.filter(({ metadata }) => !bundledIds.has(metadata.id));
  const hasInstalled = Boolean(thirdPartyPlugins?.length);
  useEffect(() => {
    if (!hasInstalled) return;
    checkAccess();
    window.addEventListener('focus', checkAccess);
    return () => window.removeEventListener('focus', checkAccess);
  }, [hasInstalled]);

  async function saveSetting(plugin: PluginMetadata, thirdParty: InstalledPluginInfo | undefined,
    key: string, option: PluginOption, value: PluginOptionValue) {
    setError('');
    try {
      if (thirdParty) await setInstalledSetting(thirdParty, key, value);
      else await setPluginSetting(plugin, key, value);
      return true;
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof RangeError ? `Invalid value for ${option.label}.` : `Could not save ${option.label}. ${String(cause)}`);
      return false;
    }
  }

  async function saveEnabled(plugin: PluginMetadata, thirdParty: InstalledPluginInfo | undefined, enabled: boolean) {
    setError('');
    try {
      if (thirdParty) await setInstalledEnabled(thirdParty, enabled);
      else await setPluginEnabled(plugin.id, enabled);
      return true;
    } catch (cause) {
      console.error(cause);
      setError(`Could not update ${plugin.name}. ${String(cause)}`);
      return false;
    }
  }

  const entries: { plugin: PluginMetadata; thirdParty?: InstalledPluginInfo }[] | undefined = plugins && thirdPartyPlugins && [
    ...plugins.map((plugin) => ({ plugin })),
    ...thirdPartyPlugins.map((thirdParty) => ({ plugin: thirdParty.metadata, thirdParty })),
  ];

  const pluginMatches = entries?.filter(({ plugin }) =>
    `${plugin.name} ${plugin.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const detailPlugin = entries?.find(({ plugin }) => plugin.id === detail);

  function navigate(next: Page) {
    setDetail(undefined);
    setTransfer(undefined);
    setPage(next);
  }

  function openTransfer(kind: 'mods' | 'settings') {
    navigate(kind === 'mods' ? 'add' : 'settings');
    setTransfer(kind);
  }

  function renderPlugin({ plugin, thirdParty }: NonNullable<typeof entries>[number]) {
    if (!values) return null;
    const importedCopy = thirdParty ?? installed?.find(({ metadata }) => metadata.id === plugin.id);
    const enabled = values[enabledKey(plugin.id)] === true;
    const executionError = thirdParty ? values[pluginErrorKey(plugin.id)] as InstalledPluginError | undefined : undefined;
    const control = <Checkbox label={`Enable ${plugin.name}`} checked={enabled}
      disabled={Boolean(thirdParty && accessError && !enabled)} onSave={(next) => saveEnabled(plugin, thirdParty, next)} />;
    const runtimeError = executionError && executionError.revision === thirdParty?.revision &&
      <p className="notice error runtime-error" role="alert">{executionError.message}</p>;
    if (detail) return <>
      <ModuleDetails kind="plugin" metadata={plugin} settings={readPluginSettings(plugin, values)}
        thirdParty={Boolean(thirdParty)} control={control}
        onSave={(key, option, next) => saveSetting(plugin, thirdParty, key, option, next)}
        remove={importedCopy && (async () => {
          if (!await confirm({ title: 'Remove plugin?', message: `Remove the imported copy of ${plugin.name}.`,
            action: 'Remove plugin', destructive: true })) return;
          try {
            await removePlugin(importedCopy);
            setDetail(undefined);
          } catch (cause) {
            setError(String(cause));
          }
        })} />
      {runtimeError}
    </>;
    return <article className="plugin-card" key={plugin.id}>
      <div className="card-top">
        <h2>{plugin.name} <Badge thirdParty={Boolean(thirdParty)} badgeNew={plugin.badgeNew} /></h2>
        <button className="icon-button" title={`${plugin.name} settings`} aria-label={`${plugin.name} settings`}
          onClick={() => setDetail(plugin.id)}><AppIcon name="cog" size={20} /></button>
        {control}
      </div>
      <p>{plugin.description}</p>
      {runtimeError}
    </article>;
  }

  const back = detail ? () => setDetail(undefined) : transfer
    ? () => navigate(transfer === 'mods' ? 'settings' : 'add') : undefined;

  return <Shell page={page} panel={detail ?? transfer} navigate={navigate} back={back}>
    {error && <p className="notice error" role="alert">{error}</p>}
    {page === 'plugins' && <section className="page">
      <h1 className="visually-hidden">Plugins</h1>
      {hasInstalled && accessError && <div className="notice" role="status"><p>{accessError}</p>
        <button onClick={checkAccess}>Check access</button></div>}
      {!entries || !values ? <p role="status">Loading plugins…</p> : detail
        ? detailPlugin ? renderPlugin(detailPlugin) : <p>This plugin is no longer installed.</p>
        : <>
          <Search label="Search plugins" value={query} setValue={setQuery} />
          {pluginMatches?.length === 0 && <p className="empty">{entries.length ? 'No plugins match your search.' : 'No plugins installed.'}</p>}
          <div className="cards">{pluginMatches?.map(renderPlugin)}</div>
        </>}
    </section>}
    {page === 'themes' && <ThemeManagement detail={detail} openDetail={setDetail} closeDetail={() => setDetail(undefined)} />}
    {page === 'browse' && <BrowsePage />}
    {page === 'add' && <AddPage key={transfer ?? 'add'} modsOnly={transfer === 'mods'} openSettings={() => openTransfer('settings')} />}
    {page === 'settings' && <Settings values={preferences} focusImport={transfer === 'settings'} openMods={() => openTransfer('mods')} />}
    {page === 'about' && <AboutPage />}
  </Shell>;
}
