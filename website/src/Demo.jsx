import { useRef, useState } from 'react'
import logo from '../../assets/logo.png'
import coast from './assets/feed/m113462760.webp'
import coffee from './assets/feed/m28989985.webp'
import book from './assets/feed/m162973523.webp'
import violin from './assets/feed/m138547195.webp'
import forge from './assets/feed/m19113729.webp'
import fjord from './assets/feed/m44931831.webp'

const films = [
  [coast, 'The coastal road to Viðareiði', 'Field recordings', '18:42'],
  [coffee, 'Dialing in the morning espresso', 'Coffee journal', '08:16'],
  [book, 'Gold leaf and a steady hand', 'Bindery notes', '12:05'],
  [violin, 'Carving a violin by hand', 'Workshop films', '14:28'],
  [forge, 'An afternoon at the forge', 'Workshop films', '09:20'],
  [fjord, 'Still water in Lofoten', 'Field recordings', '16:03'],
]

function Film({ film }) {
  const [photo, title, channel, time] = film
  return (
    <div className="film">
      <div className="still">
        <img src={photo} alt="" />
        <time>{time}</time>
      </div>
      <strong>{title}</strong>
      <small>{channel}</small>
    </div>
  )
}

function Switch({ name, detail, enabled, toggle }) {
  return (
    <button
      className="plugin-switch"
      role="switch"
      aria-checked={enabled}
      aria-label={name}
      onClick={toggle}
    >
      <span>
        <strong>{name}</strong>
        <small>{detail}</small>
      </span>
      <i className="toggle" aria-hidden="true" />
    </button>
  )
}

export default function Demo() {
  const [shorts, setShorts] = useState(false)
  const [grid, setGrid] = useState(true)
  const [columns, setColumns] = useState(3)
  const [theater, setTheater] = useState(false)
  const [open, setOpen] = useState(true)
  const trigger = useRef(null)
  function closePopup() {
    setOpen(false)
    trigger.current?.focus()
  }
  return (
    <section
      id="demo"
      className="browser"
      aria-label="Interactive YouTube layout demo"
    >
      <div className="chrome">
        <span className="lights" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="address">
          <span aria-hidden="true">▣</span> youtube.com
        </span>
        <button
          ref={trigger}
          className="popup-trigger"
          aria-expanded={open}
          aria-controls="demo-popup"
          onClick={() => setOpen(!open)}
          aria-label="Toggle extension popup"
        >
          <img src={logo} alt="" />
        </button>
      </div>
      <div className={'workspace' + (open ? ' is-open' : '')}>
        <div className="feed">
          <div className="yt-bar">
            <span className="yt-name">
              <i aria-hidden="true" />
              YouTube
            </span>
            <span>Demo feed</span>
          </div>
          {theater ? (
            <div className="watch">
              <div className="player">
                <img
                  src={coast}
                  alt="Coastal road in a widescreen theater-mode player"
                />
                <span>00:00 / 18:42</span>
              </div>
              <strong>{films[0][1]}</strong>
            </div>
          ) : (
            <>
              <div
                className="films"
                style={{ '--columns': grid ? columns : 2 }}
              >
                {(shorts ? films : films.slice(0, grid ? columns : 2)).map(
                  (film) => (
                    <Film key={film[1]} film={film} />
                  ),
                )}
              </div>
              {!shorts && (
                <div className="shorts">
                  <strong>
                    <b aria-hidden="true">ϟ</b> Shorts
                  </strong>
                  <div className="short-row">
                    {films.slice(3).map((film) => (
                      <div key={film[1]}>
                        <img src={film[0]} alt="" />
                        <span>{film[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <aside
          id="demo-popup"
          className="demo-popup"
          hidden={!open}
          aria-label="Demo extension popup"
        >
          <div className="popup-brand">
            <img src={logo} alt="" />
            <strong>YouTube Reimagined</strong>
            <button aria-label="Close extension popup" onClick={closePopup}>
              ×
            </button>
          </div>
          <div className="popup-content">
            <div className="popup-heading">
              <h2>Plugins</h2>
              <span>
                {[shorts, grid, theater].filter(Boolean).length} enabled
              </span>
            </div>
            <Switch
              name="Hide Shorts"
              detail="Remove the Shorts shelf"
              enabled={shorts}
              toggle={() => {
                setTheater(false)
                setShorts(!shorts)
              }}
            />
            <Switch
              name="Videos Per Row"
              detail="Adjust the home feed grid"
              enabled={grid}
              toggle={() => {
                setTheater(false)
                setGrid(!grid)
              }}
            />
            {grid && (
              <div
                className="column-control"
                role="group"
                aria-label="Videos per row"
              >
                <span>Columns</span>
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    aria-pressed={n === columns}
                    onClick={() => {
                      setColumns(n)
                      setTheater(false)
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
            <Switch
              name="Fullscreen Theater Mode"
              detail="Preview the watch page"
              enabled={theater}
              toggle={() => setTheater(!theater)}
            />
          </div>
        </aside>
      </div>
    </section>
  )
}
