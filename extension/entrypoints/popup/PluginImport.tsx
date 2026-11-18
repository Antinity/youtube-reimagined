import { useState } from 'react';

export default function PluginImport() {
  const [selected, setSelected] = useState<{ name: string; source: string }>();
  const [error, setError] = useState('');

  return <section>
    <label>Import a JavaScript plugin <input type="file" accept=".js" onChange={async (event) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      setSelected(undefined);
      setError('');
      if (!/\.js$/i.test(file.name)) {
        setError('Choose a single .js file.');
        return;
      }
      try {
        setSelected({ name: file.name, source: await file.text() });
      } catch (cause) {
        setError(`Could not read ${file.name}. ${String(cause)}`);
      }
    }} /></label>
    {selected && <p>Selected {selected.name}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
