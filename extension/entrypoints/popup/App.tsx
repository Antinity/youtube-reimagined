import { useEffect, useState } from 'react';
import { discoverPlugins, type Plugin, type PluginOption, type PluginOptionValue } from '@/plugins';
import {
  enabledKey, pluginStorageKeys, readPluginSettings, setPluginEnabled, setPluginSetting, watchPluginStorage,
} from '@/plugins/storage';

function OptionInput({ option, value, onSave }: {
  option: PluginOption;
  value: PluginOptionValue;
  onSave: (value: PluginOptionValue) => Promise<boolean>;
}) {
  if (option.type === 'boolean') {
    return <input type="checkbox" checked={value === true}
      onChange={(event) => { void onSave(event.currentTarget.checked); }} />;
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

  function saveEnabled(plugin: Plugin, enabled: boolean) {
    setError('');
    void setPluginEnabled(plugin.id, enabled).catch((cause) => {
      console.error(cause);
      setError(`Could not update ${plugin.name}.`);
    });
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
              <input type="checkbox" aria-label={`Enable ${plugin.name}`}
                checked={values[enabledKey(plugin.id)] === true}
                onChange={(event) => saveEnabled(plugin, event.currentTarget.checked)} />
              Enabled
            </label>
            {Object.entries(plugin.options ?? {}).map(([key, option]) => {
              const value = settings[key] ?? option.default;
              return (
                <div key={key}>
                  <label>{option.label} <OptionInput key={String(value)} option={option} value={value}
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
