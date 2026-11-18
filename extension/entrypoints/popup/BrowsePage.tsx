import { AppIcon } from './Icon';

export function BrowsePage() {
  return <section className="page browse-page" aria-labelledby="browse-title">
    <div className="browse-preview" aria-hidden="true">
      <div className="browse-placeholder browse-search" />
      <div className="browse-plugin-list">
        {[0, 1, 2].map((index) => <div className="browse-plugin" key={index}>
          <span className="browse-placeholder browse-module-icon" />
          <div className="browse-lines">
            <span className="browse-placeholder" />
            <span className="browse-placeholder" />
          </div>
          <span className="browse-placeholder browse-toggle" />
        </div>)}
      </div>
      <div className="browse-theme-list">
        <div className="browse-placeholder" />
        <div className="browse-placeholder" />
      </div>
    </div>
    <div className="browse-card">
      <AppIcon name="web" size={32} />
      <h1 id="browse-title">Coming soon</h1>
      <p>Stay tuned for community plugins and themes.</p>
      <a className="discord-link" href="https://discord.gg/SaHkUuWc2K" target="_blank" rel="noreferrer">
        <AppIcon name="discord" size={20} /> Join Discord
      </a>
    </div>
  </section>;
}
