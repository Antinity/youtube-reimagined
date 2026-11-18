import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

function Checkbox({ checked, label, disabled, onSave }: {
  checked: boolean;
  label?: string;
  disabled?: boolean;
  onSave: (checked: boolean) => Promise<boolean>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const latestWrite = useRef(0);

  useLayoutEffect(() => {
    if (input.current) input.current.checked = checked;
  }, [checked]);

  return <input ref={input} type="checkbox" aria-label={label} defaultChecked={checked} disabled={disabled}
    onChange={async ({ currentTarget }) => {
      const write = ++latestWrite.current;
      if (!await onSave(currentTarget.checked) && write === latestWrite.current) {
        currentTarget.checked = currentTarget.defaultChecked;
      }
    }} />;
}

function OptionInput({ option, value, onSave }: {
  option: PluginOption;
  value: PluginOptionValue;
  onSave: (value: PluginOptionValue) => Promise<boolean>;
}) {
  const select = useRef<HTMLSelectElement>(null);
  const range = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (select.current) select.current.value = String(value);
    if (range.current) range.current.value = String(value);
  }, [value]);

  if (option.type === 'boolean') {
    return <Checkbox checked={value === true} onSave={onSave} />;
  }
  if (option.type === 'select') {
    return <select ref={select} defaultValue={String(value)} onChange={async ({ currentTarget }) => {
      const next = currentTarget.value;
      if (!await onSave(next) && currentTarget.value === next) currentTarget.value = String(value);
    }}>
      {Object.entries(option.choices).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>;
  }

  const numeric = option.type === 'number' || option.type === 'range';
  const min = numeric && option.min !== undefined ? (option.integer ? Math.ceil(option.min) : option.min) : undefined;
  const max = numeric && option.max !== undefined ? (option.integer ? Math.floor(option.max) : option.max) : undefined;
  const step = numeric ? option.step ?? (option.integer || option.type === 'range' ? 1 : 'any') : undefined;

  async function saveInput(input: HTMLInputElement) {
    const draft = input.value;
    const next = numeric ? input.valueAsNumber : draft;
    if (Object.is(next, value)) return;
    if (!await onSave(next) && input.value === draft) input.value = String(value);
  }

  if (option.type === 'range') {
    return <>
      <input ref={range} type="range" defaultValue={String(value)} min={min} max={max} step={step}
        onPointerUp={(event) => { void saveInput(event.currentTarget); }}
        onKeyUp={(event) => { void saveInput(event.currentTarget); }}
        onBlur={(event) => { void saveInput(event.currentTarget); }} /> {value}
    </>;
  }

  return <input type={numeric ? 'number' : 'text'} defaultValue={String(value)}
    min={min} max={max} step={step}
    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
    onBlur={(event) => { void saveInput(event.currentTarget); }} />;
}

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

  const hasInstalled = Boolean(installed?.length);
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

  const entries: { plugin: PluginMetadata; thirdParty?: InstalledPluginInfo }[] | undefined = plugins && installed && [
    ...plugins.map((plugin) => ({ plugin })),
    ...installed.map((thirdParty) => ({ plugin: thirdParty.metadata, thirdParty })),
  ];

  return (
    <main style={{ width: 360 }}>
      <h1>Plugins</h1>
      <PluginImport bundledIds={plugins?.map(({ id }) => id)} />
      {error && <p role="alert">{error}</p>}
      {(!entries || !values) && !error && <p>Loading plugins…</p>}
      {hasInstalled && accessError && <p>{accessError}{' '}
        <button onClick={checkAccess}>Check access</button>
      </p>}
      {entries?.length === 0 && <p>No plugins found.</p>}
      {entries && values && entries.map(({ plugin, thirdParty }) => {
        const enabled = values[enabledKey(plugin.id)] === true;
        const executionError = thirdParty ? values[pluginErrorKey(plugin.id)] as InstalledPluginError | undefined : undefined;
        const settings = readPluginSettings(plugin, values);
        const groups = new Map<string, [string, PluginOption][]>();
        for (const entry of Object.entries(plugin.options ?? {})) {
          const group = entry[1].group ?? '';
          if (!groups.has(group)) groups.set(group, []);
          groups.get(group)!.push(entry);
        }
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
            {thirdParty && <> <button aria-label={`Remove ${plugin.name}`} onClick={async () => {
              setError('');
              try {
                await removePlugin(thirdParty);
              } catch (cause) {
                setError(String(cause));
              }
            }}>Remove</button></>}
            {groups.size > 0 && <details>
              <summary>{plugin.name} settings</summary>
              {[...groups].map(([group, options]) => {
                const inputs = options.map(([key, option]) => {
                  const value = settings[key] ?? option.default;
                  return (
                    <div key={key}>
                      <label>{option.label} <OptionInput
                        key={option.type === 'number' || option.type === 'string' ? String(value) : undefined}
                        option={option} value={value}
                        onSave={(next) => saveSetting(plugin, thirdParty, key, option, next)} /></label>
                    </div>
                  );
                });
                return group ? <fieldset key={group}><legend>{group}</legend>{inputs}</fieldset>
                  : <div key={group}>{inputs}</div>;
              })}
            </details>}
          </section>
        );
      })}
    </main>
  );
}
