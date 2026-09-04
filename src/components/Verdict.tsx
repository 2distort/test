import { useDesk } from '../store'

export function Verdict() {
  const { room, markRunning, markKeep, markKill } = useDesk()
  if (!room) return null

  const live = room.live
  const canVerdict = live.beat.trim().length > 0
  const statusClass =
    live.status === 'running' ? ' is-running' : live.status === 'ready' ? ' is-ready' : ''

  return (
    <div className="verdict">
      <span className={`status-word${statusClass}`}>{live.status}</span>
      <div className="verdict-actions">
        <button type="button" className={live.status === 'running' ? 'is-run' : ''} onClick={markRunning}>
          running
        </button>
        <button type="button" className="keep" disabled={!canVerdict} onClick={markKeep}>
          keep
        </button>
        <button type="button" className="kill" disabled={!canVerdict} onClick={markKill}>
          kill
        </button>
      </div>
    </div>
  )
}
