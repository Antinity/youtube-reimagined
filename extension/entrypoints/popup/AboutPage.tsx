import { Icon } from '@iconify/react/offline';
import github from '@iconify-icons/mdi/github';
import heart from '@iconify-icons/mdi/heart';
import star from '@iconify-icons/mdi/star-outline';
import chevron from '@iconify-icons/mdi/chevron-right';
import shield from '@iconify-icons/mdi/shield-outline';
import file from '@iconify-icons/mdi/file-document-outline';
import history from '@iconify-icons/mdi/history';
import { browser } from 'wxt/browser';
import { latestReleaseUrl, repositoryUrl } from '@/data/updates';
import logo from '@/assets/logo.png';
import { AppIcon } from './Icon';

const footerLinks = [
  { label: 'Privacy policy', href: repositoryUrl + '/blob/main/docs/privacy-policy.md', icon: shield },
  { label: 'License (GPL-3.0)', href: repositoryUrl + '/blob/main/LICENSE', icon: file },
  { label: 'Changelog', href: latestReleaseUrl, icon: history },
];

export function AboutPage() {
  const { name, version } = browser.runtime.getManifest();

  return <section className="page about-page" aria-labelledby="about-title">
    <header className="about-intro">
      <img src={logo} alt="" width={76} height={76} />
      <div>
        <h1 id="about-title">{name}</h1>
        <span className="about-version">v{version}</span>
        <p>Customize YouTube with plugins and themes for how you watch and browse.</p>
      </div>
    </header>

    <div className="about-links">
      <a href={repositoryUrl} target="_blank" rel="noreferrer">
        <Icon icon={github} width={19} height={19} aria-hidden="true" /> GitHub
      </a>
      <a href="https://discord.gg/SaHkUuWc2K" target="_blank" rel="noreferrer">
        <AppIcon name="discord" size={19} /> Discord
      </a>
    </div>

    <section className="about-contributors" aria-labelledby="about-contributors-title">
      <h2 id="about-contributors-title">Contributors</h2>
      <div className="about-card">
        <a className="about-person" href="https://github.com/Antinity" target="_blank" rel="noreferrer">
          <span className="about-avatar" aria-hidden="true">LK</span>
          <span><strong>Lakshya Kumar</strong><small>Creator &amp; maintainer</small></span>
          <Icon icon={chevron} width={18} height={18} aria-hidden="true" />
        </a>
        <a className="about-all-contributors"
          href={repositoryUrl + '/graphs/contributors'} target="_blank" rel="noreferrer">
          View all contributors
          <Icon icon={chevron} width={18} height={18} aria-hidden="true" />
        </a>
      </div>
    </section>

    <section className="about-card about-support" aria-labelledby="about-support-title">
      <h2 id="about-support-title">
        <Icon icon={heart} width={17} height={17} aria-hidden="true" /> Support the project
      </h2>
      <p>Star the project on GitHub or share feedback on Discord.</p>
      <a href={repositoryUrl + '#start-of-content'} target="_blank" rel="noreferrer">
        <Icon icon={star} width={17} height={17} aria-hidden="true" /> Star on GitHub
      </a>
    </section>

    <nav className="about-footer" aria-label="Project information">
      {footerLinks.map(({ label, href, icon }) => <a key={label} href={href} target="_blank" rel="noreferrer">
        <Icon icon={icon} width={15} height={15} aria-hidden="true" /> {label}
      </a>)}
    </nav>
  </section>;
}
