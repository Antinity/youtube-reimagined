import { useEffect, useRef, useState } from 'react'
import logo from '../../assets/logo.png'
import plugins from '../../assets/screenshots/plugins.png'
import themes from '../../assets/screenshots/themes.png'
import settings from '../../assets/screenshots/settings.png'
import github from './assets/github.svg'
import liquidType from './liquidType'
import './App.css'

const repo = 'https://github.com/Antinity/youtube-reimagined'
const releases = repo + '/releases'
const guide = repo + '/blob/main/docs/user-guide.md'
const panels = [
  {
    name: 'Plugins',
    image: plugins,
    alt: 'Plugins panel with controls for Fullscreen Theater Mode, Hide Shorts and Videos Per Row',
  },
  {
    name: 'Themes',
    image: themes,
    alt: 'Themes panel with the Custom Colors theme',
  },
  {
    name: 'Settings',
    image: settings,
    alt: 'Settings panel with appearance and backup controls',
  },
]

function Brand() {
  return (
    <a className="brand" href="#top">
      <img width="512" height="512" src={logo} alt="" />
      YouTube Reimagined
    </a>
  )
}

function Download() {
  return (
    <a className="download" href={releases}>
      <img width="19" height="19" src={github} alt="" />
      Get it on GitHub <span aria-hidden="true">↗</span>
    </a>
  )
}

function Preview() {
  const [panel, setPanel] = useState(panels[0])
  return (
    <div className="preview app-frame" aria-label="Extension preview">
      <div className="preview-bar">
        <span className="preview-label">
          <i /> Popup preview
        </span>
        <div className="switches" aria-label="Preview panels">
          {panels.map((item) => (
            <button
              key={item.name}
              aria-pressed={panel === item}
              onClick={() => setPanel(item)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
      <div className="stage" data-visual>
        <div className="ident" aria-hidden="true">
          <div className="orbits" />
          <img width="512" height="512" src={logo} alt="" />
        </div>
        <div className="popup" key={panel.name} role="region" aria-label={panel.name + " screenshot"} tabIndex={0}>
          <img width="609" height="867" src={panel.image} alt={panel.alt} />
        </div>
      </div>
    </div>
  )
}

function Installation() {
  const [browser, setBrowser] = useState('Chrome')
  return (
    <section className="installation" id="install">
      <div className="wrap install-grid">
        <div>
          <h2>
            Install the <br />
            extension<span>.</span>
          </h2>
          <p>
            Choose your browser, then download its ZIP from GitHub Releases.
          </p>
          <Download />
        </div>
        <div className="instructions">
          <div
            className="browser-options"
            aria-label="Installation instructions"
          >
            {['Chrome', 'Firefox'].map((name) => (
              <button
                key={name}
                aria-pressed={browser === name}
                onClick={() => setBrowser(name)}
              >
                {name}
              </button>
            ))}
          </div>
          {browser === 'Chrome' ? (
            <ol>
              <li>Extract the Chrome ZIP to a folder you can keep.</li>
              <li>
                Open <code>chrome://extensions</code> and turn on{' '}
                <strong>Developer mode</strong>.
              </li>
              <li>
                Choose <strong>Load unpacked</strong> and select the folder
                containing <code>manifest.json</code>.
              </li>
              <li>
                Refresh YouTube and open the extension from your browser
                toolbar.
              </li>
            </ol>
          ) : (
            <ol>
              <li>Extract the Firefox ZIP.</li>
              <li>
                Open <code>about:debugging#/runtime/this-firefox</code>.
              </li>
              <li>
                Choose <strong>Load Temporary Add-on</strong> and select the
                extracted <code>manifest.json</code>.
              </li>
              <li>
                Repeat after restarting Firefox. Temporary add-ons last for one
                browser session.
              </li>
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}

export default function App() {
  const heading = useRef(null)
  useEffect(() => {
    const moment = liquidType(
      heading.current,
      { strength: 0.4 },
      {
        reduced: () => matchMedia('(prefers-reduced-motion: reduce)').matches,
        coarse: () => matchMedia('(pointer: coarse)').matches,
        clamp: (n, min = 0, max = 1) => Math.min(max, Math.max(min, n)),
      },
    )
    return () => moment.destroy?.()
  }, [])
  return (
    <div id="top">
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="wrap">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#install">Installation</a>
          <a href={guide}>Docs ↗</a>
        </nav>
      </header>
      <main id="main">
        <section className="hero" data-enter>
          <div className="wrap">
            <div className="intro">
              <div className="platform">
                <i /> Chrome &amp; Firefox extension
              </div>
              <h1 ref={heading} data-moment="liquid-type">
                Your YouTube, <em>remixed.</em>
              </h1>
              <p>
                Hide Shorts, reshape your video grid, and give theater mode the
                whole screen. Pick the plugins and colors that feel like you.
              </p>
              <Download />
            </div>
            <Preview />
          </div>
        </section>
        <section id="features" className="features">
          <div className="wrap">
            <h2>
              Inside the <em>extension.</em>
            </h2>
            <div className="feature-list">
              {[
                [
                  'Video grids',
                  'Set one to twelve videos per row on desktop. Adjust the spacing, dim watched thumbnails, or hide videos you’ve already seen.',
                ],
                [
                  'Hide Shorts',
                  'Choose where Shorts appear. Keep them on channel pages while clearing them from Home, search, or subscriptions.',
                ],
                [
                  'Theater mode',
                  'Give the player your full viewport. Bring the search bar back by hovering at the top edge or tabbing into the header.',
                ],
                [
                  'Custom colors',
                  'Set separate light and dark palettes for YouTube. Switching themes preserves the colors you picked.',
                ],
              ].map(([title, body], i) => (
                <article key={title}>
                  <div className={'glyph glyph-' + i} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <Installation />
      </main>
      <footer className="wrap">
        <Brand />
        <nav aria-label="Project links">
          <a href={guide}>User guide ↗</a>
          <a href={repo + '/blob/main/docs/privacy-policy.md'}>Privacy ↗</a>
          <a href={repo + '/blob/main/LICENSE'}>GPL-3.0 ↗</a>
        </nav>
      </footer>
    </div>
  )
}
