import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { AppIcon, type IconName } from './Icon';
import logo from '@/assets/logo.png';
import { UpdateToast } from './UpdateToast';

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
  const content = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const previousPanel = useRef(panel);
  const closing = useRef(false);
  useLayoutEffect(() => {
    if (workspace.current) workspace.current.scrollTop = 0;
    const offset = previousPanel.current && !panel ? -14 : 14;
    previousPanel.current = panel;
    if (!content.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = content.current.animate(
      [{ opacity: 0, transform: `translateX(${offset}px)` }, { opacity: 1, transform: 'none' }],
      { duration: 180, easing: 'cubic-bezier(.2,.7,.2,1)' },
    );
    return () => animation.cancel();
  }, [page, panel]);

  async function closePopup() {
    if (closing.current) return;
    closing.current = true;
    if (shell.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await shell.current.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px) scale(.985)' }],
        { duration: 140, easing: 'ease-in', fill: 'forwards' },
      ).finished.catch(() => {});
    }
    window.close();
  }

  return <div className="shell" ref={shell}>
    <header className="app-header">
      <img src={logo} alt="" width={22} height={22} />
      <span>YouTube Reimagined</span>
      <div className="header-actions">
        {back && <button className="icon-button" aria-label="Back" title="Back" onClick={back}><AppIcon name="back" /></button>}
        <button className="icon-button" aria-label="Close popup" title="Close popup" onClick={closePopup}><AppIcon name="close" size={18} /></button>
      </div>
    </header>
    <nav className="rail" aria-label="Extension pages">
      {navigation.map((item) => <button key={item.page} className="icon-button"
        aria-label={item.label} title={item.label} aria-current={page === item.page ? 'page' : undefined}
        onClick={() => navigate(item.page)}><AppIcon name={item.icon} size={22} /></button>)}
    </nav>
    <div className="workspace-frame">
      <main className="workspace" ref={workspace}><div className="workspace-content" ref={content}>{children}</div></main>
      <UpdateToast />
    </div>
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
