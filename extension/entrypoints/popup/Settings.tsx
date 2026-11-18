import { useState } from 'react';
import { browser } from 'wxt/browser';
import { appearanceKey, appearances, pauseModsKey, readAppearance } from '@/data/preferences';
import { Checkbox } from './Options';
import { AppIcon } from './Icon';
import DataManagement from './DataManagement';

export function Settings({ values, openMods, focusImport }: {
  values: Readonly<Record<string, unknown>>; openMods: () => void; focusImport: boolean;
}) {
  const [error, setError] = useState('');
  const appearance = readAppearance(values);

  async function save(values: Record<string, unknown>) {
    setError('');
    try {
      await browser.storage.local.set(values);
      return true;
    } catch (cause) {
      setError(String(cause));
      return false;
    }
  }

  return <section className="page settings-page">
    <h1 className="visually-hidden">Settings</h1>
    <section className="settings-group" aria-labelledby="appearance-heading">
      <h2 id="appearance-heading">App Theme</h2>
      <div className="appearance" role="group" aria-labelledby="appearance-heading">
        {appearances.map((choice) => {
          const label = choice[0]!.toUpperCase() + choice.slice(1);
          return <button key={choice} data-choice={choice} aria-pressed={appearance === choice}
            aria-label={label} title={label} onClick={() => { void save({ [appearanceKey]: choice }); }}>
            {choice === 'system' && <AppIcon name="system" size={20} />}
            {choice === appearance && <span className="appearance-check"><AppIcon name="check" size={14} /></span>}
          </button>;
        })}
      </div>
    </section>
    <label className="pause-row">Pause all mods
      <Checkbox checked={values[pauseModsKey] === true} onSave={(paused) => save({ [pauseModsKey]: paused })} />
    </label>
    {error && <p className="notice error" role="alert">{error}</p>}
    <DataManagement openMods={openMods} focusImport={focusImport} />
  </section>;
}
