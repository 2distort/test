import { useDesk } from '../store'

export function DialBoard() {
  const { pack, room, toggleDial } = useDesk()
  if (!pack || !room) return null

  return (
    <div className="cell-pad dials">
      <span className="label">dials</span>
      <div className="dial-list">
        {pack.dials.map((d) => {
          const on = room.live.activeDials.includes(d.id)
          return (
            <button
              key={d.id}
              type="button"
              className={`dial${on ? ' is-on' : ''}`}
              onClick={() => toggleDial(d.id)}
            >
              <span>{d.word}</span>
              <span className="dial-w">{d.weight.toFixed(2)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
