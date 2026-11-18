import { useState } from 'react';
import { createBackup, downloadFile } from '@/data/backup';
import type { ValidatedBackup } from '@/data/validate';
import type { RestoreMode } from '@/data/restore';

export default function DataManagement() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [backup, setBackup] = useState<ValidatedBackup>();
  const [mode, setMode] = useState<RestoreMode>('merge');
  const [enableImported, setEnableImported] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<string | void>, success: string) {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const notice = await action();
      setMessage(notice ? `${success} ${notice}` : success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return <section>
    <h2>Data management</h2>
    <button disabled={busy} onClick={() => { void run(async () => {
      const backup = await createBackup();
      downloadFile(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), 'youtube-reimagined-backup.json');
    }, 'Configuration backup exported.'); }}>Export configuration</button>
    <button disabled={busy} onClick={() => { void run(async () => {
      const { exportModules } = await import('@/data/module-export');
      downloadFile(await exportModules(), 'youtube-reimagined-modules.zip');
    }, 'User modules exported.'); }}>Export user modules</button>
    <div><label>Choose configuration backup <input type="file" accept=".json" disabled={busy} onChange={(event) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (!file) return;
      setBackup(undefined);
      setEnableImported(false);
      void run(async () => {
        if (file.size > 32_000_000) throw new Error('Expected a backup up to 32 MB.');
        const { validateBackup } = await import('@/data/validate');
        setBackup(await validateBackup(await file.text()));
      }, 'Backup validated.');
    }} /></label></div>
    {backup && <fieldset>
      <legend>Restore preview</legend>
      <p>{backup.plugins.length} plugin configurations, {backup.themes.length} theme configurations</p>
      <p>Selected theme: {backup.preferences.selectedTheme ?? 'No theme'}</p>
      <details>
        <summary>Backup contents</summary>
        <ul>
          {backup.plugins.map(({ id, enabled, module, retained }) => <li key={`plugin:${id}`}>
            Plugin {module?.metadata.name ?? id} · {enabled ? 'Enabled' : 'Disabled'}{module ? ' · Third-party' : ''}
            {retained && <> · Keeps inactive imported copy {retained.metadata.name}</>}
          </li>)}
          {backup.themes.map(({ id, module, retained }) => <li key={`theme:${id}`}>
            Theme {module?.metadata.name ?? id}{module ? ' · Imported' : ''}
            {retained && <> · Keeps inactive imported copy {retained.metadata.name}</>}
          </li>)}
        </ul>
      </details>
      <label htmlFor="backup-restore-mode">Restore mode</label>{' '}
      <select id="backup-restore-mode" value={mode} onChange={(event) => setMode(event.currentTarget.value as RestoreMode)}>
        <option value="merge">Merge</option>
        <option value="replace">Replace</option>
      </select>
      <p>{mode === 'merge' ? 'Matching IDs use the backup. Other modules are kept.'
        : 'User modules absent from the backup will be removed.'}</p>
      {backup.plugins.some(({ module, enabled }) => module && enabled) && <p><label>
        <input type="checkbox" checked={enableImported} onChange={(event) => setEnableImported(event.currentTarget.checked)} />
        Enable third-party plugins marked enabled in this backup
      </label></p>}
      <button disabled={busy} onClick={() => {
        if (mode === 'replace' && !window.confirm('Replace the current configuration and remove user modules absent from this backup?')) return;
        void run(async () => {
          const { restoreBackup } = await import('@/data/restore');
          const notice = await restoreBackup(backup, mode, enableImported);
          setBackup(undefined);
          return notice;
        }, 'Configuration restored.');
      }}>Restore configuration</button>
      <button disabled={busy} onClick={() => setBackup(undefined)}>Cancel restore</button>
    </fieldset>}
    <fieldset>
      <legend>Reset data</legend>
      {([
        ['Reset preferences', 'Reset all preferences to their defaults? Installed modules will be kept.', 'resetPreferences', 'Preferences reset.'],
        ['Remove user modules', 'Remove all user-installed plugins and themes and their settings?', 'removeUserModules', 'User modules removed.'],
        ['Reset all data', 'Erase all configuration and user-installed modules?', 'resetAllData', 'Extension data reset.'],
      ] as const).map(([label, confirmation, action, success]) => <button key={action} disabled={busy} onClick={() => {
        if (!window.confirm(confirmation)) return;
        void run(async () => {
          const reset = await import('@/data/reset');
          await reset[action]();
          setBackup(undefined);
        }, success);
      }}>{label}</button>)}
    </fieldset>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
