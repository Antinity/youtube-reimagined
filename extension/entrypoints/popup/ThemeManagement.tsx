import { useEffect, useState } from 'react';
import { discoverThemes } from '@/theme-engine';
import { themeApplicationErrorKey } from '@/theme-engine/diagnostics';
import { installedThemes } from '@/theme-engine/installed';
import { readThemeSettings } from '@/theme-engine/settings';
import { removeTheme, selectedThemeId, selectTheme, setThemeSetting, watchThemeStorage } from '@/theme-engine/storage';
import { OptionFields } from './Options';
import ThemeImport from './ThemeImport';

export default function ThemeManagement() {
  const [bundled] = useState(discoverThemes);
  const [values, setValues] = useState<Readonly<Record<string, unknown>>>();
  const [error, setError] = useState('');
  const [pendingSelection, setPendingSelection] = useState<string | null>();

  useEffect(() => watchThemeStorage((current) => {
    setValues(current);
    setPendingSelection((pending) => pending === selectedThemeId(current) ? undefined : pending);
  }, (cause) => setError(`Could not read themes: ${String(cause)}`), true), []);

  const imported = values ? installedThemes(values).filter((item) =>
    !bundled.some(({ metadata }) => metadata.id === item.metadata.id)) : [];
  const themes = [...bundled, ...imported];
  const selected = values ? selectedThemeId(values) : null;
  const shown = pendingSelection === undefined ? selected : pendingSelection;
  const applicationError = values?.[themeApplicationErrorKey] as { id: string; message: string } | undefined;

  async function choose(id: string | null) {
    setError('');
    setPendingSelection(id);
    try {
      await selectTheme(id);
    } catch (cause) {
      setPendingSelection(undefined);
      setError(String(cause));
    }
  }

  return <section>
    <h2>Themes</h2>
    <ThemeImport />
    {error && <p role="alert">{error}</p>}
    {applicationError?.id === selected && <p role="alert">Application error: {applicationError.message}</p>}
    {values && <fieldset>
      <legend>Active theme</legend>
      <label><input type="radio" name="active-theme" checked={!themes.some(({ metadata }) => metadata.id === shown)}
        onChange={() => { void choose(null); }} /> No theme</label>
      {themes.map((theme) => {
        const { metadata } = theme;
        const installed = imported.find((item) => item === theme);
        return <div key={metadata.id}>
          <label><input type="radio" name="active-theme" checked={shown === metadata.id}
            onChange={() => { void choose(metadata.id); }} /> {metadata.name}</label>
          <p>{metadata.description}</p>
          <p>{[metadata.authors.length ? `By ${metadata.authors.join(', ')}` : '',
            metadata.contributors?.length ? `Contributors: ${metadata.contributors.join(', ')}` : '',
            `v${metadata.version}`, installed ? 'Imported' : 'Bundled'].filter(Boolean).join(' · ')}</p>
          {installed && <button aria-label={`Remove theme ${metadata.name}`} onClick={async () => {
            setError('');
            try {
              await removeTheme(installed);
            } catch (cause) {
              setError(String(cause));
            }
          }}>Remove</button>}
          {metadata.options && Object.keys(metadata.options).length > 0 && <details>
            <summary>{metadata.name} settings</summary>
            <OptionFields options={metadata.options} settings={readThemeSettings(theme, values)} onSave={async (key, _, value) => {
              setError('');
              try {
                await setThemeSetting(theme, key, value);
                return true;
              } catch (cause) {
                setError(String(cause));
                return false;
              }
            }} />
          </details>}
        </div>;
      })}
    </fieldset>}
  </section>;
}
