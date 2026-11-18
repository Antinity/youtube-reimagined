import { useRef, useState } from 'react';
import type { ModuleImport } from '@/data/module-import';
import { AppIcon } from './Icon';
import { useConfirm } from './Confirm';

export function AddPage({ modsOnly, openSettings }: { modsOnly: boolean; openSettings: () => void }) {
  const [selection, setSelection] = useState<{ file: string; preview: ModuleImport }>();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  async function choose(files: FileList | null) {
    if (!files?.length || busy) return;
    setSelection(undefined);
    setMessage('');
    setError('');
    if (files.length !== 1) {
      setError('Choose one file at a time. A mods ZIP can contain multiple modules.');
      return;
    }
    const file = files[0]!;
    setBusy(true);
    try {
      const { inspectModuleImport } = await import('@/data/module-import');
      setSelection({ file: file.name, preview: await inspectModuleImport(file, modsOnly) });
    } catch (cause) {
      setError(`${file.name}: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setBusy(false);
    }
  }

  async function install() {
    if (!selection || busy) return;
    const { modules } = selection.preview;
    const replacements = modules.filter((module) => module.replaces);
    if (replacements.length && !await confirm({
      title: 'Replace installed modules?',
      message: `This will replace ${replacements.map((module) =>
        (module.kind === 'plugin' ? module.plugin.metadata : module.theme.metadata).name).join(', ')}. Imported plugins in this file will be disabled until you enable them.`,
      action: 'Replace and install',
      destructive: true,
    })) return;
    setBusy(true);
    setError('');
    try {
      const { installModuleImport } = await import('@/data/module-import');
      await installModuleImport(selection.preview);
      setSelection(undefined);
      setMessage(`Installed ${modules.length} ${modules.length === 1 ? 'module' : 'modules'}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return <section className="page add-page" onDragOver={(event) => {
    if (event.dataTransfer.types.includes('Files')) event.preventDefault();
  }} onDrop={(event) => {
    event.preventDefault();
    setDragOver(false);
    void choose(event.dataTransfer.files);
  }}>
    <h1 className="visually-hidden">{modsOnly ? 'Import Mods' : 'Add'}</h1>
    <div className="notice warning">
      <strong><AppIcon name="warning" size={16} /> Install third-party content with caution.</strong>
      <p>Plugins can access and modify YouTube page content. Only install plugins and themes from sources you trust.</p>
    </div>
    <input ref={picker} type="file" hidden aria-label={modsOnly ? 'Choose mods ZIP' : 'Choose a plugin or theme'}
      accept={modsOnly ? '.zip' : '.js,.css,.zip'} disabled={busy} onChange={(event) => {
        void choose(event.currentTarget.files);
        event.currentTarget.value = '';
      }} />
    <button className="dropzone" data-dragging={dragOver} disabled={busy} onClick={() => picker.current?.click()}
      onDragEnter={() => setDragOver(true)} onDragLeave={() => setDragOver(false)}>
      <AppIcon name="upload" size={46} />
      <span>{busy ? 'Processing file…' : modsOnly ? 'Choose a mods ZIP' : 'Browse file to upload'}<br />or drag it here</span>
      <small>{modsOnly ? 'Supported file type: .zip' : 'Supported file types: .js, .css, .zip'}</small>
    </button>
    {error && <p className="notice error" role="alert">{error}</p>}
    {message && <p className="notice" role="status">{message}</p>}
    {selection && <div className="import-preview">
      <h2>{selection.file}</h2>
      <p role="status">{selection.preview.errors.length ? 'Validation failed' : 'Validation passed'}</p>
      {selection.preview.modules.map((module, index) => {
        const metadata = module.kind === 'plugin' ? module.plugin.metadata : module.theme.metadata;
        return <article key={index}>
          <h3>{metadata.name}</h3>
          <p className="secondary">{module.kind === 'plugin' ? 'Plugin' : 'Theme'} · {metadata.id} · v{metadata.version}</p>
          <p>{metadata.description}</p>
          {metadata.authors.length > 0 && <p className="secondary">{metadata.authors.join(', ')}</p>}
          {module.replaces && <p>Replaces installed version {module.replaces.version}.</p>}
        </article>;
      })}
      {selection.preview.errors.map((issue, index) => <p key={index} className="notice error" role="alert">{issue}</p>)}
      <div className="dialog-actions">
        <button onClick={() => setSelection(undefined)} disabled={busy}>Clear</button>
        <button className="primary" onClick={() => { void install(); }}
          disabled={busy || selection.preview.errors.length > 0 || !selection.preview.modules.length}>Install</button>
      </div>
    </div>}
    {!modsOnly && <footer>
      <button className="text-button" onClick={openSettings}>Import Settings</button>
      <span>Want to make your own plugin or theme?{' '}
        <a href="https://github.com/Antinity/youtube-reimagined/tree/main/docs" target="_blank" rel="noreferrer">See Guide</a></span>
    </footer>}
  </section>;
}
