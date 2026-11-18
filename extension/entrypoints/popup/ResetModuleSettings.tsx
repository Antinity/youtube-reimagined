import { useState } from 'react';

export default function ResetModuleSettings({ kind, id, name }: { kind: 'plugin' | 'theme'; id: string; name: string }) {
  const [result, setResult] = useState<{ error: boolean; message: string }>();
  return <div>
    <button onClick={async () => {
      if (!window.confirm(`Reset settings for ${name} to their defaults?`)) return;
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
