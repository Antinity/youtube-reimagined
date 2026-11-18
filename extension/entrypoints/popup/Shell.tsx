import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { AppIcon, type IconName } from './Icon';
import logo from '@/assets/logo.png';

export type Page = 'plugins' | 'themes' | 'browse' | 'add' | 'settings' | 'about';

const navigation: { page: Page; label: string; icon: IconName }[] = [
  { page: 'plugins', label: 'Plugins', icon: 'puzzle' },
  { page: 'themes', label: 'Themes', icon: 'brush' },
  { page: 'browse', label: 'Browse', icon: 'web' },
  { page: 'add', label: 'Add', icon: 'plus' },
  { page: 'about', label: 'About', icon: 'help' },
  { page: 'settings', label: 'Settings', icon: 'cog' },
];

export function Shell({ page, panel, navigate, back, children }: {
  page: Page; panel?: string; navigate: (page: Page) => void; back?: () => void; children: ReactNode;
}) {
  const workspace = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (workspace.current) workspace.current.scrollTop = 0;
  }, [page, panel]);

  return <div className="shell">
    <header className="app-header">
      <img src={logo} alt="" width={22} height={22} />
      <span>YouTube Reimagined</span>
      {back && <button className="icon-button back" aria-label="Back" title="Back" onClick={back}><AppIcon name="back" /></button>}
    </header>
    <nav className="rail" aria-label="Extension pages">
      {navigation.map((item) => <button key={item.page} className="icon-button"
        aria-label={item.label} title={item.label} aria-current={page === item.page ? 'page' : undefined}
        onClick={() => navigate(item.page)}><AppIcon name={item.icon} size={22} /></button>)}
    </nav>
    <main className="workspace" ref={workspace}>{children}</main>
  </div>;
}

export function Search({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) {
  return <label className="search">
    <AppIcon name="search" size={18} />
    <input type="search" aria-label={label} placeholder={label} value={value} onChange={(event) => setValue(event.target.value)} />
  </label>;
}

export function Badge({ thirdParty, badgeNew }: { thirdParty: boolean; badgeNew?: boolean }) {
  if (thirdParty) return <span className="badge external" aria-label="Third-party">3RD</span>;
  if (badgeNew) return <span className="badge new">NEW</span>;
  return null;
}
