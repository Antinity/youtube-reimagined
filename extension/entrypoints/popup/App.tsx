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
import PluginImport from './PluginImport';
import ThemeManagement from './ThemeManagement';
import DataManagement from './DataManagement';
import ResetModuleSettings from './ResetModuleSettings';
import { Checkbox, OptionFields } from './Options';

export default function App() {
  const [plugins, setPlugins] = useState<Plugin[]>();
  const [installed, setInstalled] = useState<InstalledPluginInfo[]>();
  const [values, setValues] = useState<Readonly<Record<string, unknown>>>();
  const [error, setError] = useState('');
  const [accessError, setAccessError] = useState(userScriptAccess);

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

  return (
    <main style={{ width: 360 }}>
      <h1>Plugins</h1>
      <PluginImport bundledIds={plugins?.map(({ id }) => id)} />
      <ThemeManagement />
      <DataManagement />
      {error && <p role="alert">{error}</p>}
      {(!entries || !values) && !error && <p>Loading plugins…</p>}
      {hasInstalled && accessError && <p>{accessError}{' '}
        <button onClick={checkAccess}>Check access</button>
      </p>}
      {entries?.length === 0 && <p>No plugins found.</p>}
      {entries && values && entries.map(({ plugin, thirdParty }) => {
        const importedCopy = thirdParty ?? installed?.find(({ metadata }) => metadata.id === plugin.id);
        const enabled = values[enabledKey(plugin.id)] === true;
        const executionError = thirdParty ? values[pluginErrorKey(plugin.id)] as InstalledPluginError | undefined : undefined;
        const settings = readPluginSettings(plugin, values);
        return (
          <section key={plugin.id}>
            <h2>{plugin.name}</h2>
            <p>{plugin.description}</p>
            {thirdParty && <p>Third-party · Version {plugin.version}{plugin.authors.length ? ` · ${plugin.authors.join(', ')}` : ''}
              {plugin.contributors?.length ? ` · Contributors: ${plugin.contributors.join(', ')}` : ''}
            </p>}
            {executionError && executionError.revision === thirdParty?.revision &&
              <p role="alert" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{executionError.message}</p>}
            <label>
              <Checkbox label={`Enable ${plugin.name}`}
                checked={enabled} disabled={Boolean(thirdParty && accessError && !enabled)}
                onSave={(next) => saveEnabled(plugin, thirdParty, next)} />
              Enabled
            </label>
            {importedCopy && <> <button aria-label={thirdParty ? `Remove ${plugin.name}` : `Remove imported copy of ${plugin.name}`} onClick={async () => {
              setError('');
              try {
                await removePlugin(importedCopy);
              } catch (cause) {
                setError(String(cause));
              }
            }}>{thirdParty ? 'Remove' : 'Remove imported copy'}</button></>}
            {plugin.options && Object.keys(plugin.options).length > 0 && <details>
              <summary>{plugin.name} settings</summary>
              <ResetModuleSettings kind="plugin" id={plugin.id} name={plugin.name} />
              <OptionFields options={plugin.options} settings={settings}
                onSave={(key, option, next) => saveSetting(plugin, thirdParty, key, option, next)} />
            </details>}
          </section>
        );
      })}
    </main>
  );
}
