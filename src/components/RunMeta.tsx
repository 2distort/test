import { PIPES } from '../types'
import { useDesk } from '../store'

export function RunMeta() {
  const desk = useDesk()
  const room = desk.room
  if (!room) return null
  const live = room.live

  return (
    <div className="cell-pad meta-row meta-stack">
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
      <label className="meta-group spend">
        <span className="label">spend</span>
        <input
          value={live.spend}
          onChange={(e) => desk.setSpend(e.target.value)}
          placeholder="0"
          aria-label="spend"
        />
      </label>
    </div>
  )
}
