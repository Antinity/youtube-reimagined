import { useState } from 'react';
import { useConfirm } from './Confirm';

export default function ResetModuleSettings({ kind, id, name }: { kind: 'plugin' | 'theme'; id: string; name: string }) {
  const [result, setResult] = useState<{ error: boolean; message: string }>();
  const confirm = useConfirm();
  return <div>
    <button onClick={async () => {
      if (!await confirm({ title: 'Reset module settings?', message: `Restore the default settings for ${name}.`,
        action: 'Reset settings', destructive: true })) return;
      try {
        const { resetModuleSettings } = await import('@/data/reset');
        await resetModuleSettings(kind, id);
        setResult({ error: false, message: 'Settings reset.' });
      } catch (error) {
        setResult({ error: true, message: String(error) });
      }
    }}>Reset {name} settings</button>
    {result && <p role={result.error ? 'alert' : 'status'}>{result.message}</p>}
  </div>;
}
