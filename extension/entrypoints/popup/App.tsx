import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { discoverPlugins, type Plugin, type PluginOption, type PluginOptionValue } from '@/plugin-engine';
import {
  enabledKey, pluginStorageKeys, readPluginSettings, setPluginEnabled, setPluginSetting, watchPluginStorage,
} from '@/plugin-engine/storage';
import PluginImport from './PluginImport';

function Checkbox({ checked, label, onSave }: {
  checked: boolean;
  label?: string;
  onSave: (checked: boolean) => Promise<boolean>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const latestWrite = useRef(0);

  useLayoutEffect(() => {
    if (input.current) input.current.checked = checked;
  }, [checked]);

  return <input ref={input} type="checkbox" aria-label={label} defaultChecked={checked}
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
  const [values, setValues] = useState<Readonly<Record<string, unknown>>>();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let unwatch: (() => void) | undefined;

    void discoverPlugins().then((found) => {
      if (cancelled) return;
      setPlugins(found);
      unwatch = watchPluginStorage(found.flatMap(pluginStorageKeys), setValues, (cause) => {
        console.error(cause);
        setError('Could not read plugin storage.');
      });
    }).catch((cause) => {
      if (cancelled) return;
      console.error(cause);
      setError('Could not load plugins.');
    });

    return () => {
      cancelled = true;
      unwatch?.();
    };
  }, []);

  async function saveSetting(plugin: Plugin, key: string, option: PluginOption, value: PluginOptionValue) {
    setError('');
    try {
      await setPluginSetting(plugin, key, value);
      return true;
    } catch (cause) {
      console.error(cause);
      setError(cause instanceof RangeError ? `Invalid value for ${option.label}.` : `Could not save ${option.label}.`);
      return false;
    }
  }

  async function saveEnabled(plugin: Plugin, enabled: boolean) {
    setError('');
    try {
      await setPluginEnabled(plugin.id, enabled);
      return true;
    } catch (cause) {
      console.error(cause);
      setError(`Could not update ${plugin.name}.`);
      return false;
    }
  }

  return (
    <main style={{ width: 360 }}>
      <h1>Plugins</h1>
      <PluginImport />
      {error && <p role="alert">{error}</p>}
      {(!plugins || !values) && !error && <p>Loading plugins…</p>}
      {plugins?.length === 0 && <p>No plugins found.</p>}
      {plugins && values && plugins.map((plugin) => {
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
            <label>
              <Checkbox label={`Enable ${plugin.name}`}
                checked={values[enabledKey(plugin.id)] === true}
                onSave={(enabled) => saveEnabled(plugin, enabled)} />
              Enabled
            </label>
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
                        onSave={(next) => saveSetting(plugin, key, option, next)} /></label>
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
