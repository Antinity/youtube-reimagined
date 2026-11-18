import { useRef, useState } from 'react';
import { validateThemeImport } from '@/theme-engine/import';
import { DuplicateThemeError, installTheme, type InstalledTheme } from '@/theme-engine/installed';
import type { Theme } from '@/theme-engine/schema';

export default function ThemeImport() {
  const [candidate, setCandidate] = useState<Theme>();
  const [replacement, setReplacement] = useState<InstalledTheme>();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef(0);

  return <div>
    <label>Import a CSS theme <input type="file" accept=".css" disabled={busy} onChange={async (event) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (!file) return;
      const current = ++request.current;
      setCandidate(undefined);
      setReplacement(undefined);
      setMessage('');
      setError('');
      try {
        const source = await file.text();
        if (request.current === current) setCandidate(validateThemeImport(file.name, source));
      } catch (cause) {
        if (request.current === current) setError(`Validation error in ${file.name}: ${cause instanceof Error ? cause.message : String(cause)}`);
      }
    }} /></label>
    {candidate && <p>{candidate.metadata.name}{' '}<button disabled={busy} onClick={async () => {
      setBusy(true);
      setError('');
      try {
        await installTheme(candidate, replacement?.revision);
        setMessage(`Installed ${candidate.metadata.name}.`);
        setCandidate(undefined);
        setReplacement(undefined);
      } catch (cause) {
        if (cause instanceof DuplicateThemeError) setReplacement(cause.installed);
        setError(`Installation: ${cause instanceof Error ? cause.message : String(cause)}`);
      } finally {
        setBusy(false);
      }
    }}>{replacement ? `Replace ${replacement.metadata.name} ${replacement.metadata.version}` : 'Install theme'}</button></p>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
