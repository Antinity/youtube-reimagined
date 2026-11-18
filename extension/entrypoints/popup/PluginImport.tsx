import { useEffect, useRef, useState } from 'react';
import { validatePluginImport, type PluginImportCandidate } from '@/plugin-engine/import';
import { DuplicatePluginError, installPlugin, listInstalledPlugins, removePlugin, type InstalledPlugin } from '@/plugin-engine/installed';

export default function PluginImport({ bundledIds }: { bundledIds?: readonly string[] }) {
  const [selected, setSelected] = useState<PluginImportCandidate>();
  const [installed, setInstalled] = useState<InstalledPlugin[]>([]);
  const [replacement, setReplacement] = useState<InstalledPlugin>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const latestFile = useRef(0);

  useEffect(() => {
    void listInstalledPlugins().then(setInstalled).catch((cause) => setError(String(cause)));
  }, []);

  async function install() {
    if (!selected || !bundledIds) return;
    setError('');
    setBusy(true);
    try {
      await installPlugin(selected, bundledIds, replacement?.revision);
      setSelected(undefined);
      setReplacement(undefined);
      setInstalled(await listInstalledPlugins());
    } catch (cause) {
      if (cause instanceof DuplicatePluginError) setReplacement(cause.current);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return <section>
    <label>Import a JavaScript plugin <input type="file" accept=".js" disabled={busy} onChange={async (event) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      const selection = ++latestFile.current;
      setSelected(undefined);
      setReplacement(undefined);
      setError('');
      if (!/\.js$/i.test(file.name)) {
        setError('Choose a single .js file.');
        return;
      }
      try {
        const source = await file.text();
        if (selection === latestFile.current) setSelected(validatePluginImport(file.name, source));
      } catch (cause) {
        if (selection === latestFile.current) setError(`${file.name}: ${cause instanceof Error ? cause.message : String(cause)}`);
      }
    }} /></label>
    {selected && <p>{selected.metadata.name} {selected.metadata.version} ({selected.metadata.id}){' '}
      <button disabled={busy || !bundledIds} onClick={() => { void install(); }}>
        {replacement ? `Replace ${replacement.metadata.name} ${replacement.metadata.version}` : 'Install'}
      </button>
    </p>}
    {error && <p role="alert">{error}</p>}
    {installed.map((plugin) => <p key={plugin.metadata.id}>
      {plugin.metadata.name} (third-party){' '}
      <button disabled={busy} onClick={async () => {
        setError('');
        setBusy(true);
        try {
          await removePlugin(plugin);
          setInstalled(await listInstalledPlugins());
        } catch (cause) {
          setError(String(cause));
        } finally {
          setBusy(false);
        }
      }}>Remove</button>
    </p>)}
  </section>;
}
