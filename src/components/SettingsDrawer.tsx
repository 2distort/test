import { useEffect } from 'react'
import { PROVIDERS } from '../types'
import { useDesk } from '../store'

export function SettingsDrawer() {
  const desk = useDesk()

  const close = desk.setSettingsOpen

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  return (
    <>
      <div className="drawer-back" onClick={() => desk.setSettingsOpen(false)} />
      <aside className="drawer" role="dialog" aria-label="settings">
        <button type="button" className="drawer-close" onClick={() => desk.setSettingsOpen(false)}>
          close
        </button>
        <h2>desk</h2>

        <label className="field">
          <span>firm</span>
          <input
            value={desk.firm.name}
            onChange={(e) => desk.setFirmName(e.target.value)}
          />
        </label>

        {desk.firm.seats.map((seat) => (
          <label className="field" key={seat.id}>
            <span>seat {seat.id}</span>
            <input value={seat.name} onChange={(e) => desk.renameSeat(seat.id, e.target.value)} />
          </label>
        ))}

        <div className="field">
          <span>this machine</span>
          <div className="seg">
            {desk.firm.seats.map((seat) => (
              <button
                key={seat.id}
                type="button"
                className={desk.thisSeatId === seat.id ? 'is-on' : ''}
                onClick={() => desk.setThisSeat(seat.id)}
              >
                {seat.name}
              </button>
            ))}
          </div>
        </div>

        <p className="field-note">Keys stay in this browser. The vault holds the work.</p>

        {PROVIDERS.map((p) => (
          <label className="field" key={p.id}>
            <span>{p.label}</span>
            <input
              type="password"
              autoComplete="off"
              value={desk.keys[p.id]}
              onChange={(e) => desk.setKey(p.id, e.target.value)}
              placeholder="key"
            />
          </label>
        ))}
      </aside>
    </>
  )
}
