import { useState } from 'react';
import { createBackup, downloadFile } from '@/data/backup';

export default function DataManagement() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function run(action: () => Promise<void>, success: string) {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return <section>
    <h2>Data management</h2>
    <button onClick={() => { void run(async () => {
      const backup = await createBackup();
      downloadFile(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), 'youtube-reimagined-backup.json');
    }, 'Configuration backup exported.'); }}>Export configuration</button>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
