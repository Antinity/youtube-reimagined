import { useState } from 'react'
import logo from '../../assets/logo.png'
import plugins from '../../assets/screenshots/plugins.png'
import themes from '../../assets/screenshots/themes.png'
import settings from '../../assets/screenshots/settings.png'
import github from './assets/github.svg'
import credits from './assets/feed/credits.json'
import Demo from './Demo'
import './App.css'

const repo = 'https://github.com/Antinity/youtube-reimagined'
const guide = repo + '/blob/main/docs/user-guide.md'
const panels = [
  {
    name: 'Plugins',
    image: plugins,
    description:
      'Set one to twelve videos per row on desktop, hide Shorts on the pages you choose, or open videos in fullscreen theater mode.',
  },
  {
    name: 'Themes',
    image: themes,
    description:
      'Choose a light and a dark palette for YouTube. Set the background, text, and accent colors separately.',
  },
  {
    name: 'Settings',
    image: settings,
    description:
      'Pause all mods, back up your configuration, or restore your saved settings when you switch browsers.',
  },
]
function Brand() {
  return (
    <a className="brand" href="#top">
      <img width="32" height="32" src={logo} alt="" />
      YouTube Reimagined
    </a>
  )
}
function Download() {
  return (
    <a className="download" href={repo + '/releases'}>
      <img width="20" height="20" src={github} alt="" />
      Get it on GitHub <span aria-hidden="true">↗</span>
    </a>
  )
}
function Features() {
  const [panel, setPanel] = useState(panels[0])
  return (
    <section className="features" id="features">
      <div className="wrap feature-grid">
        <div>
          <h2>Inside the extension</h2>
          <div className="feature-options" aria-label="Extension screenshots">
            {panels.map((item) => (
              <div key={item.name}>
                <button
                  aria-pressed={panel === item}
                  onClick={() => setPanel(item)}
                >
                  {item.name}
                  <span aria-hidden="true">{panel === item ? '−' : '+'}</span>
                </button>
                {panel === item && <p>{item.description}</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="capture">
          <img
            width="591"
            height="849"
            src={panel.image}
            loading="lazy"
            alt={panel.name + ' panel in the extension'}
          />
        </div>
      </div>
    </section>
  )
}
function Installation() {
  const [browser, setBrowser] = useState('Chrome')
  return (
    <section className="installation" id="install">
      <div className="wrap install-grid">
        <div>
          <h2>Install the extension</h2>
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
  return (
    <div id="top">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="wrap">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#install">Installation</a>
          <a href={guide}>User guide ↗</a>
        </nav>
      </header>
      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <h1>
              Your YouTube,
              <br />
              <span className="edit">your layout</span>
            </h1>
            <div className="lead">
              <p>
                Hide Shorts, fit more videos on a row, or give the player the
                whole screen. Try the controls below.
              </p>
              <Download />
              <small>For Chrome and Firefox</small>
            </div>
          </div>
          <Demo />
        </section>
        <Features />
        <Installation />
      </main>
      <footer className="wrap">
        <Brand />
        <nav aria-label="Project links">
          <a href={guide}>User guide ↗</a>
          <a href={repo + '/blob/main/docs/privacy-policy.md'}>Privacy ↗</a>
          <a href={repo + '/blob/main/LICENSE'}>GPL-3.0 ↗</a>
        </nav>
        <details>
          <summary>Demo photo credits</summary>
          <ul>
            {credits.map((photo) => (
              <li key={photo.title}>
                <a href={photo.source}>{photo.title}</a> · {photo.by} ·{' '}
                <a href={photo.terms}>{photo.license}</a> · cropped for display
              </li>
            ))}
          </ul>
        </details>
      </footer>
    </div>
  )
}
