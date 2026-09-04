import { useDesk } from '../store'

export function KillLine() {
  const { room } = useDesk()
  const line = room?.lastKill?.note || room?.lastKill?.prompt.split('\n')[0] || ''

  return (
    <div className="kill-line">
      <span className="label">last kill</span>
      <span className="kill-text">{line}</span>
    </div>
  )
}
