import { useEffect, useState } from 'react';
import { discoverPlugins, type Plugin, type PluginOption } from '@/plugins';
import { enabledKey, setPluginEnabled, watchPluginStorage } from '@/plugins/storage';

function OptionInput({ option }: { option: PluginOption }) {
  if (option.type === 'boolean') {
    return <input type="checkbox" defaultChecked={option.default} />;
  }
  if (option.type === 'number') {
    return <input type="number" defaultValue={option.default} min={option.min} max={option.max}
      step={option.integer ? 1 : 'any'} />;
  }
  return <input type="text" defaultValue={option.default} />;
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
      unwatch = watchPluginStorage(found.map(({ id }) => enabledKey(id)), setValues, (cause) => {
        console.error(cause);
        setError('Could not read plugin states.');
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

  return (
    <main>
      <h1>Plugins</h1>
      {error && <p role="alert">{error}</p>}
      {(!plugins || !values) && !error && <p>Loading plugins…</p>}
      {plugins?.length === 0 && <p>No plugins found.</p>}
      {plugins && values && plugins.map((plugin) => (
        <section key={plugin.id}>
          <h2>{plugin.name}</h2>
          <p>{plugin.description}</p>
          <label>
            <input type="checkbox" aria-label={`Enable ${plugin.name}`}
              checked={values[enabledKey(plugin.id)] === true}
              onChange={(event) => {
                setError('');
                void setPluginEnabled(plugin.id, event.currentTarget.checked).catch((cause) => {
                  console.error(cause);
                  setError(`Could not update ${plugin.name}.`);
                });
              }} />
            Enabled
          </label>
          {Object.entries(plugin.options ?? {}).map(([key, option]) => (
            <div key={key}>
              <label>{option.label} <OptionInput option={option} /></label>
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
