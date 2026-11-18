import { useRef, useState } from 'react';
import { validatePluginImport, type PluginImportCandidate } from '@/plugin-engine/import';

export default function PluginImport() {
  const [selected, setSelected] = useState<PluginImportCandidate>();
  const [error, setError] = useState('');
  const latestFile = useRef(0);

  return <section>
    <label>Import a JavaScript plugin <input type="file" accept=".js" onChange={async (event) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      const selection = ++latestFile.current;
      setSelected(undefined);
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
    {selected && <p>{selected.metadata.name} {selected.metadata.version} ({selected.metadata.id})</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
