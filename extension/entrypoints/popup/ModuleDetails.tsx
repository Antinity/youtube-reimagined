import type { ReactNode } from 'react';
import type { PluginMetadata, PluginOption, PluginOptionValue, PluginSettings } from '@/plugin-engine';
import type { ThemeMetadata } from '@/theme-engine/schema';
import { OptionFields } from './Options';
import ResetModuleSettings from './ResetModuleSettings';
import { Badge } from './Shell';

export function ModuleDetails({ kind, metadata, settings, onSave, control, thirdParty, remove }: {
  kind: 'plugin' | 'theme'; metadata: PluginMetadata | ThemeMetadata; settings: PluginSettings;
  onSave: (key: string, option: PluginOption, value: PluginOptionValue) => Promise<boolean>;
  control: ReactNode; thirdParty: boolean; remove?: () => void;
}) {
  return <article className="module-details">
    <div className="detail-header">
      <div>
        <h1>{metadata.name} <Badge thirdParty={thirdParty} badgeNew={metadata.badgeNew} /></h1>
        <p>{metadata.description}</p>
      </div>
      {control}
    </div>
    <section>
      <h2>Authors</h2>
      <p>{[...new Set([...metadata.authors, ...metadata.contributors ?? []])].join(' & ') || 'No authors listed'}</p>
      <p className="secondary">Version {metadata.version}</p>
      {'license' in metadata && metadata.license && <p>{metadata.license}</p>}
      {'homepage' in metadata && typeof metadata.homepage === 'string' && metadata.homepage.startsWith('https://') &&
        <p><a href={metadata.homepage} target="_blank" rel="noreferrer">Theme homepage</a></p>}
    </section>
    {metadata.options && Object.keys(metadata.options).length > 0 && <section>
      <h2>Settings</h2>
      <OptionFields options={metadata.options} settings={settings} onSave={onSave} />
      <ResetModuleSettings kind={kind} id={metadata.id} name={metadata.name} />
    </section>}
    {remove && <button className="danger" onClick={remove}>{thirdParty ? 'Remove module' : 'Remove imported copy'}</button>}
  </article>;
}
