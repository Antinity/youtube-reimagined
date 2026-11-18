import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { discoverPlugins, type Plugin, type PluginOption, type PluginOptionValue } from '@/plugins';
import {
  enabledKey, pluginStorageKeys, readPluginSettings, setPluginEnabled, setPluginSetting, watchPluginStorage,
} from '@/plugins/storage';

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
  if (option.type === 'boolean') {
    return <Checkbox checked={value === true} onSave={onSave} />;
  }

  const numeric = option.type === 'number';
  const min = numeric && option.min !== undefined ? (option.integer ? Math.ceil(option.min) : option.min) : undefined;
  const max = numeric && option.max !== undefined ? (option.integer ? Math.floor(option.max) : option.max) : undefined;
  return <input type={numeric ? 'number' : 'text'} defaultValue={String(value)}
    min={min} max={max}
    step={numeric ? (option.integer ? 1 : 'any') : undefined}
    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
    onBlur={async ({ currentTarget: input }) => {
      const draft = input.value;
      const next = numeric ? input.valueAsNumber : draft;
      if (Object.is(next, value)) return;
      if (!await onSave(next) && input.value === draft) input.value = String(value);
    }} />;
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
    <main>
      <h1>Plugins</h1>
      {error && <p role="alert">{error}</p>}
      {(!plugins || !values) && !error && <p>Loading plugins…</p>}
      {plugins?.length === 0 && <p>No plugins found.</p>}
      {plugins && values && plugins.map((plugin) => {
        const settings = readPluginSettings(plugin, values);
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
            {Object.entries(plugin.options ?? {}).map(([key, option]) => {
              const value = settings[key] ?? option.default;
              return (
                <div key={key}>
                  <label>{option.label} <OptionInput key={option.type === 'boolean' ? undefined : String(value)}
                    option={option} value={value}
                    onSave={(next) => saveSetting(plugin, key, option, next)} /></label>
                </div>
              );
            })}
          </section>
        );
      })}
    </main>
  );
}
