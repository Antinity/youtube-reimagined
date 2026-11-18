import { useEffect, useState } from 'react';
import { discoverThemes } from '@/theme-engine';
import { themeApplicationErrorKey } from '@/theme-engine/diagnostics';
import { installedThemes } from '@/theme-engine/installed';
import { readThemeSettings } from '@/theme-engine/settings';
import { removeTheme, selectedThemeId, selectTheme, setThemeSetting, watchThemeStorage } from '@/theme-engine/storage';
import { fallbackPreview, validatePreview, type ThemePreview } from '@/theme-engine/preview';
import { Checkbox } from './Options';
import { useConfirm } from './Confirm';
import { ModuleDetails } from './ModuleDetails';
import { Badge, Search } from './Shell';
import { AppIcon } from './Icon';

function Preview({ image }: { image?: ThemePreview }) {
  const [verified, setVerified] = useState<ThemePreview>();
  useEffect(() => {
    let active = true;
    if (image) void validatePreview(image.name, image.dataUrl).then(() => {
      if (active) setVerified(image);
    }).catch(console.error);
    return () => { active = false; };
  }, [image]);
  return <img src={image && verified === image ? image.dataUrl : fallbackPreview} alt="" />;
}

export default function ThemeManagement({ detail, openDetail, closeDetail }: {
  detail?: string; openDetail: (id: string) => void; closeDetail: () => void;
}) {
  const [bundled] = useState(discoverThemes);
  const [values, setValues] = useState<Readonly<Record<string, unknown>>>();
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const confirm = useConfirm();

  useEffect(() => watchThemeStorage(setValues, (cause) => setError(`Could not read themes. ${String(cause)}`), true), []);

  const saved = values ? installedThemes(values) : [];
  const imported = saved.filter((item) => !bundled.some(({ metadata }) => metadata.id === item.metadata.id));
  const themes = [...bundled, ...imported];
  const selected = values ? selectedThemeId(values) : null;
  const applicationError = values?.[themeApplicationErrorKey] as { id: string; message: string } | undefined;

  async function save(action: () => Promise<void>) {
    setError('');
    try {
      await action();
      return true;
    } catch (cause) {
      setError(String(cause));
      return false;
    }
  }

  const visible = themes.filter(({ metadata }) =>
    `${metadata.name} ${metadata.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const theme = themes.find(({ metadata }) => metadata.id === detail);
  const installed = saved.find(({ metadata }) => metadata.id === detail);

  return <section className="page">
    {error && <p className="notice error" role="alert">{error}</p>}
    {applicationError?.id === selected && <p className="notice error" role="alert">Application error. {applicationError.message}</p>}
    {!values ? <p role="status">Loading themes…</p> : detail ? theme ? <ModuleDetails kind="theme"
      metadata={theme.metadata} settings={readThemeSettings(theme, values)} thirdParty={imported.some((item) => item === theme)}
      control={<Checkbox label={`Activate ${theme.metadata.name}`} checked={selected === detail}
        onSave={(active) => save(() => selectTheme(active ? detail : null))} />}
      onSave={(key, _, value) => save(() => setThemeSetting(theme, key, value))}
      remove={installed && (async () => {
        if (!await confirm({ title: 'Remove theme?', message: `Remove the imported copy of ${theme.metadata.name}.`,
          action: 'Remove theme', destructive: true })) return;
        if (await save(() => removeTheme(installed)) && !bundled.includes(theme)) closeDetail();
      })} /> : <p>This theme is no longer installed.</p> : <>
      <h1 className="visually-hidden">Themes</h1>
      <Search label="Search themes" value={query} setValue={setQuery} />
      {visible.length === 0 && <p className="empty">{themes.length ? 'No themes match your search.' : 'No themes installed.'}</p>}
      <div className="cards">
        {visible.map((item) => {
          const { metadata } = item;
          const active = selected === metadata.id;
          return <div className="theme-card" key={metadata.id} data-active={active}>
            <button className="theme-choice" aria-pressed={active} onClick={() => { void save(() => selectTheme(active ? null : metadata.id)); }}>
              <Preview image={item.preview} />
              <span className="theme-copy"><strong>{metadata.name} <Badge thirdParty={imported.some((theme) => theme === item)} badgeNew={metadata.badgeNew} /></strong>
                <span>{metadata.description}</span></span>
            </button>
            <button className="icon-button theme-settings" title={`${metadata.name} settings`} aria-label={`${metadata.name} settings`}
              onClick={() => openDetail(metadata.id)}><AppIcon name="cog" size={20} /></button>
          </div>;
        })}
      </div>
      {selected && <button className="text-button" onClick={() => { void save(() => selectTheme(null)); }}>No theme</button>}
    </>}
  </section>;
}
