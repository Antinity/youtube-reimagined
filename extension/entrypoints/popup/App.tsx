import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { browser } from 'wxt/browser';
import { discoverPlugins, type Plugin, type PluginMetadata, type PluginOption, type PluginOptions, type PluginOptionValue, type PluginSettings } from '@/plugin-engine';
import {
  pluginErrorKey, removePlugin, setInstalledEnabled, setInstalledSetting, watchInstalledPlugins,
  type InstalledPluginError, type InstalledPluginInfo,
} from '@/plugin-engine/installed';
import {
  enabledKey, pluginStorageKeys, readPluginSettings, setPluginEnabled, setPluginSetting, watchPluginStorage,
} from '@/plugin-engine/storage';
import { refreshUserScriptsMessage, userScriptAccess } from '@/plugin-engine/user-scripts';
import PluginImport from './PluginImport';
import ThemeImport from './ThemeImport';
import './option-help.css';

function Checkbox({ id, checked, label, disabled, onSave }: {
  id?: string;
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

  return <input id={id} ref={input} type="checkbox" aria-label={label} defaultChecked={checked} disabled={disabled}
    onChange={async ({ currentTarget }) => {
      const write = ++latestWrite.current;
      if (!await onSave(currentTarget.checked) && write === latestWrite.current) {
        currentTarget.checked = currentTarget.defaultChecked;
      }
    }} />;
}

function OptionInput({ id, option, value, onSave }: {
  id: string;
  option: PluginOption;
  value: PluginOptionValue;
  onSave: (value: PluginOptionValue) => Promise<boolean>;
}) {
  const select = useRef<HTMLSelectElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const color = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (select.current) select.current.value = String(value);
    if (range.current) range.current.value = String(value);
    if (color.current) color.current.value = String(value);
  }, [value]);

  if (option.type === 'boolean') {
    return <Checkbox id={id} checked={value === true} onSave={onSave} />;
  }
  if (option.type === 'color') {
    return <input id={id} ref={color} type="color" defaultValue={String(value)} onChange={async ({ currentTarget }) => {
      const next = currentTarget.value;
      if (!await onSave(next) && currentTarget.value === next) currentTarget.value = String(value);
    }} />;
  }
  if (option.type === 'select') {
    return <select id={id} ref={select} defaultValue={String(value)} onChange={async ({ currentTarget }) => {
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
      <input id={id} ref={range} type="range" defaultValue={String(value)} min={min} max={max} step={step}
        onPointerUp={(event) => { void saveInput(event.currentTarget); }}
        onKeyUp={(event) => { void saveInput(event.currentTarget); }}
        onBlur={(event) => { void saveInput(event.currentTarget); }} /> {value}
    </>;
  }

  return <input id={id} type={numeric ? 'number' : 'text'} defaultValue={String(value)}
    min={min} max={max} step={step}
    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
    onBlur={(event) => { void saveInput(event.currentTarget); }} />;
}

function OptionHelp({ label, tooltip }: { label: string; tooltip?: string }) {
  const tooltipId = useId();
  if (!tooltip) return null;
  return <span className="option-help">
    <button type="button" aria-label={`Help for ${label}`} aria-describedby={tooltipId}>?</button>
    <span id={tooltipId} role="tooltip">{tooltip}</span>
  </span>;
}

function OptionRow({ option, value, onSave }: {
  option: PluginOption;
  value: PluginOptionValue;
  onSave: (value: PluginOptionValue) => Promise<boolean>;
}) {
  const id = useId();
  return <div className="option-row">
    <label htmlFor={id}>{option.label}</label>{' '}
    <OptionHelp label={option.label} tooltip={option.tooltip} />{' '}
    <OptionInput id={id} key={option.type === 'number' || option.type === 'string' ? String(value) : undefined}
      option={option} value={value} onSave={onSave} />
  </div>;
}

function OptionFields({ options, settings, onSave }: {
  options: PluginOptions;
  settings: PluginSettings;
  onSave: (key: string, option: PluginOption, value: PluginOptionValue) => Promise<boolean>;
}) {
  const legacy = new Map<string, ReactNode[]>();
  const nodes: ReactNode[] = [];
  for (const [key, option] of Object.entries(options)) {
    if (option.type === 'group') {
      nodes.push(<fieldset key={`group:${key}`} className="option-group">
        <legend>{option.label}{' '}<OptionHelp label={option.label} tooltip={option.tooltip} /></legend>
        <OptionFields options={option.options} settings={settings} onSave={onSave} />
      </fieldset>);
      continue;
    }

    const input = <OptionRow key={`setting:${key}`} option={option} value={settings[key] ?? option.default}
      onSave={(next) => onSave(key, option, next)} />;
    if (option.group) {
      let fields = legacy.get(option.group);
      if (!fields) {
        fields = [];
        legacy.set(option.group, fields);
        nodes.push(<fieldset key={`legacy:${option.group}`}><legend>{option.group}</legend>{fields}</fieldset>);
      }
      fields.push(input);
    } else {
      nodes.push(input);
    }
  }
  return nodes;
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
      <ThemeImport />
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
              <OptionFields options={plugin.options} settings={settings}
                onSave={(key, option, next) => saveSetting(plugin, thirdParty, key, option, next)} />
            </details>}
          </section>
        );
      })}
    </main>
  );
}
