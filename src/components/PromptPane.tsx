import { FILES, PIPES } from '../types'
import { useDesk } from '../store'

export function PromptPane() {
  const desk = useDesk()
  const room = desk.room
  if (!room) return null

  const live = room.live
  const canVerdict = live.prompt.trim().length > 0
  const statusClass =
    live.status === 'running' ? ' is-running' : live.status === 'ready' ? ' is-ready' : ''

  return (
    <>
      <div className="prompt-wrap">
        <div className="prompt-label">
          <span className="label">next</span>
        </div>
        <textarea
          className="prompt"
          value={live.prompt}
          onChange={(e) => desk.setPrompt(e.target.value)}
          placeholder="prompt"
          aria-label="next prompt"
          autoFocus
        />
      </div>

      <div className="meta-row">
        <div className="meta-group">
          <span className="label">via</span>
          {PIPES.map((p) => (
            <button
              key={p.id}
              type="button"
              className={live.pipe === p.id ? 'is-on' : ''}
              onClick={() => desk.setPipe(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="meta-group">
          <span className="label">who pays</span>
          {desk.firm.seats.map((s) => (
            <button
              key={s.id}
              type="button"
              className={live.payerId === s.id ? 'is-on' : ''}
              onClick={() => desk.setPayer(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="meta-group">
          <span className="label">file</span>
          {FILES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={live.file === f.id ? 'is-on' : ''}
              onClick={() => desk.setFile(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="verdict">
        <span className={`status-word${statusClass}`}>{live.status}</span>
        <div className="verdict-actions">
          <button
            type="button"
            className={live.status === 'running' ? 'is-run' : ''}
            onClick={desk.markRunning}
          >
            running
          </button>
          <button type="button" className="keep" disabled={!canVerdict} onClick={desk.markKeep}>
            keep
          </button>
          <button type="button" className="kill" disabled={!canVerdict} onClick={desk.markKill}>
            kill
          </button>
        </div>
      </div>
    </>
  )
}
