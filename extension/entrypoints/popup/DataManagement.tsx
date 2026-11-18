import { useRef, useState } from 'react';
import { createBackup, downloadFile } from '@/data/backup';
import type { ValidatedBackup } from '@/data/validate';
import type { RestoreMode } from '@/data/restore';
import { useConfirm } from './Confirm';

export default function DataManagement({ openMods, focusImport }: { openMods: () => void; focusImport: boolean }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [backup, setBackup] = useState<ValidatedBackup>();
  const [mode, setMode] = useState<RestoreMode>('merge');
  const [enableImported, setEnableImported] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

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

  return <>
    <section className="settings-group" aria-labelledby="backup-heading">
      <h2 id="backup-heading">Backup &amp; Restore</h2>
      <div className="secondary">
        <p>A settings backup includes</p>
        <ul><li>App and module settings</li><li>Installed plugins and themes</li></ul>
      </div>
      <div className="transfer-actions">
        <button className="primary" autoFocus={focusImport} disabled={busy} onClick={() => fileInput.current?.click()}>Import Settings</button>
        <button className="primary" disabled={busy} onClick={openMods}>Import Mods</button>
        <button className="primary" disabled={busy} onClick={() => { void run(async () => {
          const backup = await createBackup();
          downloadFile(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), 'youtube-reimagined-backup.json');
        }, 'Settings backup exported.'); }}>Export Settings</button>
        <button className="primary" disabled={busy} onClick={() => { void run(async () => {
          const { exportModules } = await import('@/data/module-export');
          downloadFile(await exportModules(), 'youtube-reimagined-modules.zip');
        }, 'Mods exported.'); }}>Export Mods</button>
      </div>
      <input ref={fileInput} hidden aria-label="Choose configuration backup" type="file" accept=".json" disabled={busy} onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) return;
        setBackup(undefined);
        setMode('merge');
        setEnableImported(false);
        void run(async () => {
          if (file.size > 32_000_000) throw new Error('Expected a backup up to 32 MB.');
          const { validateBackup } = await import('@/data/validate');
          setBackup(await validateBackup(await file.text()));
        }, 'Backup validated.');
      }} />
    </section>
    {backup && <fieldset className="restore-preview">
      <legend>Restore preview</legend>
      <p>{backup.plugins.length} plugin configurations, {backup.themes.length} theme configurations</p>
      <p>Selected theme: {backup.preferences.selectedTheme ?? 'No theme'}</p>
      {backup.preferences.appearance && <p>App theme: {backup.preferences.appearance}</p>}
      {backup.preferences.pauseMods !== undefined && <p>Pause all mods: {backup.preferences.pauseMods ? 'On' : 'Off'}</p>}
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
      <select id="backup-restore-mode" value={mode} disabled={busy} onChange={(event) => setMode(event.currentTarget.value as RestoreMode)}>
        <option value="merge">Merge</option>
        <option value="replace">Replace</option>
      </select>
      <p>{mode === 'merge' ? 'Matching IDs use the backup. Other modules are kept.'
        : 'User modules absent from the backup will be removed.'}</p>
      {backup.plugins.some(({ module, enabled }) => module && enabled) && <p><label>
        <input type="checkbox" checked={enableImported} disabled={busy} onChange={(event) => setEnableImported(event.currentTarget.checked)} />
        Enable third-party plugins marked enabled in this backup
      </label></p>}
      <div className="dialog-actions">
        <button disabled={busy} onClick={() => setBackup(undefined)}>Cancel restore</button>
        <button className="primary" disabled={busy} onClick={async () => {
          if (!await confirm({ title: 'Restore settings backup?',
            message: mode === 'replace' ? 'Replace the current configuration and remove user modules absent from this backup.'
              : 'Apply backup settings and replace installed modules with matching IDs.',
            action: 'Restore settings', destructive: mode === 'replace' })) return;
          void run(async () => {
            const { restoreBackup } = await import('@/data/restore');
            const notice = await restoreBackup(backup, mode, enableImported);
            setBackup(undefined);
            return notice;
          }, 'Configuration restored.');
        }}>Restore configuration</button>
      </div>
    </fieldset>}
    <section className="settings-group reset-actions" aria-labelledby="reset-heading">
      <h2 id="reset-heading">Reset</h2>
      {([
        ['Reset all Settings', 'Restore defaults for the app and all modules. Installed files will be kept.', 'resetPreferences', 'Settings reset.'],
        ['Remove all third-party modules', 'Remove all imported plugins and themes and their saved settings.', 'removeUserModules', 'Third-party modules removed.'],
      ] as const).map(([label, confirmation, action, success]) => <button className="danger" key={action} disabled={busy} onClick={async () => {
        if (!await confirm({ title: `${label}?`, message: confirmation, action: label, destructive: true })) return;
        void run(async () => {
          const reset = await import('@/data/reset');
          await reset[action]();
          setBackup(undefined);
        }, success);
      }}>{label}</button>)}
      <details>
        <summary>More reset options</summary>
        <button className="danger" disabled={busy} onClick={async () => {
          if (!await confirm({ title: 'Erase all extension data?', message: 'Clear all saved preferences, settings, and imported modules.',
            action: 'Erase all data', destructive: true })) return;
          void run(async () => {
            const { resetAllData } = await import('@/data/reset');
            await resetAllData();
            setBackup(undefined);
          }, 'Extension data reset.');
        }}>Reset all data</button>
      </details>
    </section>
    {busy && <p className="notice" role="status">Working…</p>}
    {message && <p className="notice" role="status">{message}</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
  </>;
}
